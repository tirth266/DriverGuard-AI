"""
Ride lifecycle tests: ending a ride, repeating End Ride, and what a finished
ride reports.

The property under test is report honesty through the HTTP surface. Ending an
unscored ride must not write a score, ending a scored ride must write one, and
a second End Ride must return the report the first one stored rather than
dropping it or re-deriving an empty one.

Sessions are driven directly through `SessionManager` with explicit times, so
nothing here depends on a model, a clock or a sleep.

Run from the `backend` directory:  python -m pytest tests/test_ride_lifecycle.py -v
"""
from datetime import datetime, timezone

import pytest

from app.ai.session_manager import CONFIRM_MIN_HITS, SessionManager
from app.ai.yolo_service import YOLOAIService
from app.models import EventSource, Ride, RideStatus
from app.services.pdf_service import generate_ride_report
from conftest import make_user


@pytest.fixture
def sessions():
    """A private session manager, mirroring the one yolo_service delegates to."""
    return SessionManager()


@pytest.fixture
def tracker(monkeypatch):
    """
    Point the ride router's yolo_service at a test-owned instance.

    `yolo_service` is a module-level singleton, so binding its session methods to
    a private manager keeps these tests from reading or writing the process-wide
    session state that other tests and a running server share. Only the three
    session methods End Ride uses are rebound; detection and model state are
    untouched and never invoked here.
    """
    manager = SessionManager()
    stub = YOLOAIService()
    # Rebind every session method the ride router touches. Left alone they would
    # all delegate to the process-wide singleton, so the session a test scores
    # into would not be the session End Ride reads back.
    stub.set_ride = manager.set_ride
    stub.clear_ride = manager.clear_ride
    stub.reset_session = lambda user_id, ride_id=None: manager.get_session(
        str(user_id), ride_id
    ).reset()
    stub.finalize_session = manager.finalize_session
    stub.get_session_summary = lambda user_id, ride_id=None: (
        session.get_session_summary()
        if (session := manager.find_session(str(user_id), ride_id)) is not None
        else None
    )
    monkeypatch.setattr('app.ride.routes.yolo_service', stub)
    return manager


def raise_event(manager, user_id, ride_id, event_type='phone_use', duration=4.0):
    """Record a real event in the ride's session and score it."""
    session = manager.get_session(str(user_id), ride_id)
    session.update_events({event_type: 0.9}, 10.0)
    for step in range(1, int(duration) + 1):
        session.update_events({event_type: 0.9}, 10.0 + step)
    session.update_events({}, 10.0 + duration + 1.0)
    return session.apply_score(10.0 + duration + 1.0)


def start_personal_ride(client, user_id):
    client.app.state.acting_user_id = user_id
    response = client.post('/api/rides/', json={})
    assert response.status_code == 201, response.text
    return response.json()['ride']['id']


def end_ride(client, ride_id):
    return client.post(f'/api/rides/{ride_id}/end', json={})


# ── Ending an unscored ride ───────────────────────────────────────────────────

def test_ending_an_unscored_ride_writes_no_score(acting_as, client, db, tracker):
    """
    A ride that never scored a frame ends with no score written to it.

    Its session holds the start score only because nothing was measured, so
    storing that as the ride's result would be a fabricated clean 100/100.
    """
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)

    response = end_ride(client, ride_id)

    assert response.status_code == 200
    ride = db.query(Ride).one()
    assert ride.status == RideStatus.COMPLETED
    assert ride.final_score is None
    assert ride.grade is None
    assert ride.session_summary is None


def test_ending_an_unscored_ride_returns_no_session_summary(acting_as, client, db, tracker):
    """The response carries no summary either, so no UI can render a score."""
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)

    response = end_ride(client, ride_id)

    assert response.json()['session_summary'] is None


def test_an_unscored_ride_has_no_report_to_download(acting_as, client, db, tracker):
    """
    An unscored ride must not produce a PDF at all.

    The report used to be rendered anyway, which printed "N/A/100" for the score
    and "No distraction events detected" for a ride that never scored a single
    frame: a clean-ride attestation for a ride nobody measured. The endpoint now
    refuses with 409 rather than asserting something it cannot support.
    """
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)
    end_ride(client, ride_id)

    response = client.get(f'/api/rides/{ride_id}/report')

    assert response.status_code == 409
    assert response.json()['success'] is False
    assert 'no finalized report' in response.json()['message'].lower()


def test_a_ride_in_progress_has_no_report_yet(acting_as, client, db, tracker):
    """
    The other half of the same refusal: a ride that is still running has no
    final measurement at all, so it is reported as unfinished rather than as
    a clean ride.
    """
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)

    response = client.get(f'/api/rides/{ride_id}/report')

    assert response.status_code == 409
    assert 'still in progress' in response.json()['message'].lower()


def test_a_scored_ride_still_downloads_its_report(acting_as, client, db, tracker):
    """The 409 must not have cost a ride that really was measured its report."""
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)

    # Store the summary the way end_ride would, from a real measurement.
    summary = {
        'final_score': 87,
        'grade': 'Good',
        'lowest_session_score': 82,
        'total_events': 1,
        'phone_events': 0,
        'total_distracted_duration': 4.0,
        'events': [{
            'type': 'phone_use',
            'start_time': 1767261600.0,
            'end_time': 1767261604.0,
            'duration': 4.0,
            'max_confidence': 0.9,
            'min_score': 90,
            'source': 'yolo',
        }],
    }
    ride = db.query(Ride).filter(Ride.id == ride_id).one()
    import json
    ride.session_summary = json.dumps(summary)
    ride.final_score = 87
    ride.grade = 'Good'
    end_ride(client, ride_id)
    db.commit()

    response = client.get(f'/api/rides/{ride_id}/report')

    assert response.status_code == 200
    assert response.headers['content-type'] == 'application/pdf'
    assert response.content[:4] == b'%PDF'


def test_report_generation_accepts_an_empty_summary_directly():
    """
    The PDF builder accepts an empty session summary.

    Pins the report layer's own tolerance, with no ride or database involved.
    """
    pdf = generate_ride_report({
        'ride': {'id': 1, 'status': 'completed'},
        'driver_name': 'Rider',
        'vehicle': 'Personal ride',
        'date': 'January 01, 2026',
        'start_time': '10:00:00',
        'end_time': '10:05:00',
        'duration': '5m 0s',
        'distance': 'Not Available',
        'avg_speed': 'Not Available',
        'session_summary': {},
    })

    assert pdf[:4] == b'%PDF'


# ── Ending a scored ride ──────────────────────────────────────────────────────

def test_ending_a_scored_ride_stores_the_score(acting_as, client, db, tracker):
    """A ride whose session measured something persists that measurement."""
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)
    expected_score = raise_event(tracker, user.id, ride_id, duration=4.0)

    response = end_ride(client, ride_id)

    assert response.status_code == 200
    ride = db.query(Ride).one()
    assert ride.final_score == expected_score
    assert ride.final_score < 100
    assert ride.grade is not None
    assert ride.session_summary is not None


def test_the_stored_summary_survives_the_session_being_dropped(acting_as, client, db, tracker):
    """
    A finished ride's report outlives its in-memory session.

    The session is discarded at the end of End Ride, so if the report were not
    persisted here a refresh would lose the ride's whole result.
    """
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)
    raise_event(tracker, user.id, ride_id, duration=4.0)

    end_ride(client, ride_id)

    assert tracker.find_session(str(user.id), ride_id) is None
    reread = client.get(f'/api/rides/{ride_id}').json()['ride']
    assert reread['final_score'] is not None
    assert reread['session_summary'] is not None


def test_the_response_summary_matches_what_was_stored(acting_as, client, db, tracker):
    """The summary returned at end time is the one a later read returns."""
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)
    raise_event(tracker, user.id, ride_id, duration=3.0)

    at_end = end_ride(client, ride_id).json()['session_summary']
    later = client.get(f'/api/rides/{ride_id}').json()['ride']['session_summary']

    assert at_end == later
    assert at_end['total_events'] == 1


# ── Repeated End Ride ─────────────────────────────────────────────────────────

def test_a_repeated_end_ride_returns_the_same_ride(acting_as, client, db, tracker):
    """
    A second End Ride is accepted and reports the ride as already ended.

    End Ride is a multi-step sequence ending in the report, so a double submit
    must not be answered with an error that loses what the first call returned.
    """
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)

    first = end_ride(client, ride_id)
    second = end_ride(client, ride_id)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()['message'] == 'Ride already ended.'
    assert second.json()['ride']['id'] == ride_id
    assert second.json()['ride']['status'] == 'completed'


def test_a_repeated_end_ride_does_not_lose_the_report(acting_as, client, db, tracker):
    """
    The repeated call returns the stored report, not an empty one.

    This is the whole reason the endpoint answers a double submit with the ride
    rather than a 400: the summary was already frozen onto the record, and
    refusing would hide it.
    """
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)
    raise_event(tracker, user.id, ride_id, duration=4.0)
    first_summary = end_ride(client, ride_id).json()['session_summary']

    second_summary = end_ride(client, ride_id).json()['session_summary']

    assert first_summary is not None
    assert second_summary == first_summary


def test_repeated_end_ride_leaves_one_ride_row(acting_as, client, db, tracker):
    """Ending twice does not create or duplicate anything."""
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)

    end_ride(client, ride_id)
    end_ride(client, ride_id)
    end_ride(client, ride_id)

    assert db.query(Ride).count() == 1


def test_a_repeated_end_ride_does_not_change_the_end_time(acting_as, client, db, tracker):
    """The ride's recorded end time is the first call's, not the last's."""
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)

    end_ride(client, ride_id)
    first_end = db.query(Ride).one().end_time

    end_ride(client, ride_id)

    assert db.query(Ride).one().end_time == first_end


def test_an_unscored_rides_repeat_end_still_reports_nothing(acting_as, client, db, tracker):
    """Repeating End Ride on an unscored ride must not manufacture a score."""
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)
    end_ride(client, ride_id)

    second = end_ride(client, ride_id)

    assert second.json()['session_summary'] is None
    assert db.query(Ride).one().final_score is None


# ── Open events are closed on the record ──────────────────────────────────────

def test_ending_a_ride_closes_its_open_events(acting_as, client, db, tracker):
    """
    An event still open when the ride ends is closed with a real duration.

    The event that was live at the moment of the end keeps the time it actually
    ran for rather than being left open with no duration.
    """
    from app.services.ride_service import RideService

    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)

    service = RideService(db)
    started = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    service.create_event(
        ride_id=ride_id,
        event_type='phone_use',
        source=EventSource.YOLO,
        start_timestamp=started,
        max_confidence=0.9,
        min_score=100,
    )
    service.commit()

    end_ride(client, ride_id)

    db.expire_all()
    ride = db.query(Ride).one()
    assert ride.event_count == 1
    events = service.get_events_for_ride(ride_id)
    assert len(events) == 1
    assert events[0].end_timestamp is not None
    assert events[0].duration_seconds is not None
    assert events[0].duration_seconds >= 0


def test_event_count_reflects_the_recorded_events(acting_as, client, db, tracker):
    """The ride's own counter matches the events written against it."""
    from app.services.ride_service import RideService

    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)

    service = RideService(db)
    for index in range(3):
        service.create_event(
            ride_id=ride_id,
            event_type='phone_use',
            source=EventSource.YOLO,
            start_timestamp=datetime(2026, 1, 1, 10, 0, index, tzinfo=timezone.utc),
        )
    service.commit()

    end_ride(client, ride_id)

    db.expire_all()
    assert db.query(Ride).one().event_count == 3


# ── Ride ownership on the ending paths ────────────────────────────────────────

def test_a_stranger_cannot_end_someone_elses_ride(acting_as, client, db, tracker):
    """End Ride is owner-only, so another account cannot close a ride."""
    owner = make_user(db, 'owner@example.com', 'Owner')
    stranger = make_user(db, 'stranger@example.com', 'Stranger')
    db.commit()
    ride_id = start_personal_ride(client, owner.id)

    acting_as(stranger.id)
    response = end_ride(client, ride_id)

    assert response.status_code == 403
    db.expire_all()
    assert db.query(Ride).one().status == RideStatus.ACTIVE


def test_a_stranger_cannot_read_a_completed_ride(acting_as, client, db, tracker):
    """A finished ride's report is as owner-only as the ride itself."""
    owner = make_user(db, 'owner@example.com', 'Owner')
    stranger = make_user(db, 'stranger@example.com', 'Stranger')
    db.commit()
    ride_id = start_personal_ride(client, owner.id)
    raise_event(tracker, owner.id, ride_id, duration=4.0)
    end_ride(client, owner.id)

    acting_as(stranger.id)

    assert client.get(f'/api/rides/{ride_id}').status_code == 403
    assert client.get(f'/api/rides/{ride_id}/events').status_code == 403
    assert client.get(f'/api/rides/{ride_id}/report').status_code == 403


def test_the_owner_can_still_read_the_ride_after_a_stranger_tries(acting_as, client, db, tracker):
    """A refused attempt leaves the ride intact and readable by its owner."""
    owner = make_user(db, 'owner@example.com', 'Owner')
    stranger = make_user(db, 'stranger@example.com', 'Stranger')
    db.commit()
    ride_id = start_personal_ride(client, owner.id)
    raise_event(tracker, owner.id, ride_id, duration=4.0)
    end_ride(client, owner.id)

    acting_as(stranger.id)
    assert end_ride(client, ride_id).status_code == 403

    acting_as(owner.id)
    body = client.get(f'/api/rides/{ride_id}').json()
    assert body['ride']['status'] == 'completed'
    assert body['ride']['final_score'] is not None


def test_rides_are_listed_only_for_their_owner(acting_as, client, db, tracker):
    """The listing does not leak another account's rides."""
    owner = make_user(db, 'owner@example.com', 'Owner')
    stranger = make_user(db, 'stranger@example.com', 'Stranger')
    db.commit()
    ride_id = start_personal_ride(client, owner.id)

    acting_as(stranger.id)
    assert client.get('/api/rides/').json()['rides'] == []

    acting_as(owner.id)
    listed = client.get('/api/rides/').json()['rides']
    assert [r['id'] for r in listed] == [ride_id]


# ── One ride at a time ────────────────────────────────────────────────────────

def test_a_new_ride_cannot_start_while_one_is_active(acting_as, client, db, tracker):
    """An account cannot hold two open personal rides at once."""
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    start_personal_ride(client, user.id)

    second = client.post('/api/rides/', json={})

    assert second.status_code == 400
    assert db.query(Ride).count() == 1


def test_a_new_ride_may_start_once_the_previous_one_ended(acting_as, client, db, tracker):
    """Ending the open ride releases the account's one-ride slot."""
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    first_ride = start_personal_ride(client, user.id)
    end_ride(client, first_ride)

    second_ride = start_personal_ride(client, user.id)

    assert second_ride != first_ride
    assert db.query(Ride).count() == 2


def test_the_new_ride_does_not_inherit_the_previous_score(acting_as, client, db, tracker):
    """
    A fresh ride's session carries nothing from the ride before it.

    This is the persistence-level counterpart of the session-isolation tests: a
    ride that scored badly must not make the next ride look bad too.
    """
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    first_ride = start_personal_ride(client, user.id)
    raise_event(tracker, user.id, first_ride, duration=5.0)
    end_ride(client, first_ride)

    second_ride = start_personal_ride(client, user.id)
    end_ride(client, second_ride)

    db.expire_all()
    scores = {r.id: r.final_score for r in db.query(Ride).all()}
    assert scores[first_ride] is not None
    # The second ride scored no frame, so it gets no score at all.
    assert scores[second_ride] is None


# ── Missing and unauthenticated ───────────────────────────────────────────────

def test_ending_a_ride_that_does_not_exist_is_a_404(acting_as, client, db, tracker):
    """A ride id with no record is reported as missing, not as a failure."""
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    acting_as(user.id)

    assert end_ride(client, 999_999).status_code == 404


def test_ending_without_authentication_is_refused(client, db, tracker):
    """No ride is ended without an authenticated caller."""
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()
    ride_id = start_personal_ride(client, user.id)
    client.app.state.acting_user_id = None

    response = end_ride(client, ride_id)

    assert response.status_code == 401
    db.expire_all()
    assert db.query(Ride).one().status == RideStatus.ACTIVE
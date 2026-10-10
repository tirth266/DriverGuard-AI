"""
Session isolation and score-honesty tests.

Two properties, both about what a session is allowed to claim:

  * A session that never scored a frame produces no report. It holds
    START_SCORE only because nothing was measured, so reporting it would be a
    fabricated, event-free 100/100 presented as a clean ride.
  * Two users, or one user's two rides, never share state.

The session manager is a module-level singleton, so every test uses its own
`SessionManager` instance and times it explicitly: no sleeping, no wall-clock
dependence.

Run from the `backend` directory:  python -m pytest tests/test_session_isolation.py -v
"""
import pytest

from app.ai.scoring import START_SCORE, grade_for, penalty_for
from app.ai.session_manager import (
    SessionManager,
    SessionState,
)


@pytest.fixture
def manager():
    """A private session manager, so no test can see another's sessions."""
    return SessionManager()


@pytest.fixture
def session(manager):
    return manager.get_session('user-1', ride_id=1)


def score_a_frame(session, event_type=None, duration=2.0, at=100.0):
    """
    Drive one frame through the same path the live pipeline uses.

    `update_events` then `apply_score` is the pair the frame handler performs, so
    this produces a genuinely scored session rather than one with counters poked
    by hand.
    """
    detections = {} if event_type is None else {event_type: 0.9}
    session.update_events(detections, at)
    return session.apply_score(at)


def raise_event_over(session, event_type, duration, at=10.0, step=1.0):
    """
    Hold a detection across frames, then let it lapse.

    Duration is measured between frames that still see the event: closing it in
    the very next update closes the event at the time it was first seen, because
    nothing extended its end. So an event of a given length needs the detection
    present at each step up to that length.
    """
    elapsed = 0.0
    session.update_events({event_type: 0.9}, at)
    while elapsed < duration:
        elapsed += step
        session.update_events({event_type: 0.9}, at + elapsed)
    session.update_events({}, at + elapsed + step)
    return elapsed


# ── The unscored session must never report ────────────────────────────────────

def test_fresh_session_is_unscored(session):
    """A brand-new session holds the start score but has measured nothing."""
    assert session.scored_frames == 0
    assert session.score == int(START_SCORE)


def test_unscored_session_has_no_summary(session):
    """
    A session that never scored a frame produces no summary.

    This is the honest-reporting rule: `score_from_events([])` returns 100, so a
    summary built here would be an event-free perfect ride that never happened.
    """
    assert session.get_session_summary() is None


def test_unscored_session_finalizes_to_nothing(session):
    """Ending a ride whose session never scored yields no report at all."""
    assert session.finalize() is None


def test_finalizing_an_unscored_session_still_freezes_it(session):
    """
    Freeze happens even when there is no report to return.

    Otherwise a session that never scored would stay writable and a late frame
    could score a ride that had already ended.
    """
    assert session.finalize() is None
    assert session.finalized is True


def test_summary_of_an_unknown_session_is_none(manager):
    """Reading a ride's report must not bring a session into existence."""
    assert manager.find_session('nobody', 42) is None
    assert manager.finalize_session('nobody', 42) is None
    assert manager.find_session('nobody', 42) is None
    assert manager.get_all_sessions() == {}


def test_session_with_only_a_non_scoring_read_stays_unscored(manager):
    """
    Reading state does not make a session scored.

    Only `apply_score` counts a measured frame; reading a summary, resetting or
    inspecting must not launder an unmeasured ride into a reportable one.
    """
    session = manager.get_session('user-1', 1)

    session.get_session_summary()
    session.all_event_dicts()
    session.average_perf()
    session.reset()

    assert session.scored_frames == 0
    assert session.get_session_summary() is None


def test_scored_session_does_produce_a_summary(session):
    """The counterpart: a session that measured a frame does report."""
    score_a_frame(session)

    assert session.scored_frames == 1
    summary = session.get_session_summary()
    assert summary is not None
    assert summary['final_score'] == session.score
    assert summary['grade'] == session.grade


def test_reset_returns_a_session_to_unreportable(session):
    """A reset ride has measured nothing again, so it reports nothing."""
    score_a_frame(session)
    assert session.get_session_summary() is not None

    session.reset()

    assert session.scored_frames == 0
    assert session.get_session_summary() is None
    assert session.finalize() is None


def test_clean_session_with_no_events_still_reports(session):
    """
    A measured ride with no events is a real clean ride, and must be reportable.

    This is the boundary the honesty rule must not overshoot: refusing an empty
    summary here would leave every genuinely clean ride unreportable. What makes
    it different from the fabricated case is `scored_frames`, not the events.
    """
    score_a_frame(session)

    summary = session.get_session_summary()
    assert summary is not None
    assert summary['total_events'] == 0
    assert summary['final_score'] == int(START_SCORE)
    assert summary['grade'] == grade_for(START_SCORE)


# ── Isolation across users ────────────────────────────────────────────────────

def test_two_users_have_independent_sessions(manager):
    """A frame scored for one user does not move the other's score."""
    first = manager.get_session('user-1', 1)
    second = manager.get_session('user-2', 1)

    score_a_frame(first, 'phone_use', duration=5.0)

    assert first.score < int(START_SCORE)
    assert second.score == int(START_SCORE)
    assert second.scored_frames == 0


def test_two_users_tracks_are_separate(manager):
    """Tracks are per-session, so one user's detections never appear on another's."""
    first = manager.get_session('user-1', 1)
    second = manager.get_session('user-2', 1)

    first.next_track_id()
    first.next_track_id()
    second.next_track_id()

    assert first.track_counter == 2
    assert second.track_counter == 1
    assert set(first.tracks) & set(second.tracks) == set()


def test_two_users_perf_counters_are_separate(manager):
    """Timing accumulators are per-session by design."""
    first = manager.get_session('user-1', 1)
    second = manager.get_session('user-2', 1)

    first.record_perf({'yolo': 12.0})

    assert first.perf_totals == {'yolo': 12.0}
    assert second.perf_totals == {}


def test_removing_one_users_session_leaves_the_other(manager):
    """Session teardown is scoped to the user it names."""
    first = manager.get_session('user-1', 1)
    second = manager.get_session('user-2', 1)

    assert manager.remove_session('user-1', 1) is True

    assert manager.find_session('user-1', 1) is None
    assert manager.find_session('user-2', 1) is second
    assert first is not None and second is not None


def test_removing_an_absent_session_reports_nothing_removed(manager):
    """Removal is idempotent rather than raising."""
    assert manager.remove_session('ghost', 1) is False


# ── Isolation across rides ─────────────────────────────────────────────────────

def test_two_rides_of_one_user_are_independent(manager):
    """One user's previous ride must not carry state into the next."""
    first = manager.get_session('user-1', ride_id=100)
    second = manager.get_session('user-1', ride_id=200)

    raise_event_over(first, 'phone_use', duration=5.0)
    first.apply_score(20.0)

    assert first.score < int(START_SCORE)
    assert second.score == int(START_SCORE)
    assert second.scored_frames == 0


def test_set_ride_discards_the_previous_ride_session(manager):
    """
    Starting a ride drops the last ride's score, events and tracks.

    A new ride inheriting the old one's events would report deductions for
    driving that happened on a different ride.
    """
    old = manager.get_session('user-1', ride_id=100)
    raise_event_over(old, 'phone_use', duration=5.0)
    old.next_track_id()

    new = manager.set_ride('user-1', 200)

    assert new.ride_id == 200
    assert new.score == int(START_SCORE)
    assert new.scored_frames == 0
    assert new.completed_events == []
    assert new.tracks == {}
    # The new ride must not be handed the previous ride's session.
    assert manager.find_session('user-1', 200) is not old


def test_set_ride_keeps_another_users_ride_session(manager):
    """Starting a ride for one user does not disturb another user's ride."""
    other = manager.set_ride('user-2', 300)
    raise_event_over(other, 'phone_use', duration=5.0)
    other.apply_score(20.0)

    manager.set_ride('user-1', 200)

    assert manager.find_session('user-2', 300) is other
    assert other.score < int(START_SCORE)


def test_set_ride_only_discards_the_live_session_of_the_same_user(manager):
    """
    Starting a ride drops the caller's own live session and nothing else.

    Documents the current behaviour precisely: `set_ride` pops the no-ride key,
    which is the session the new ride replaces. Sessions belonging to earlier
    ride ids of the same user are left in place — they are not inherited by the
    new ride, but they also are not removed. See the coverage gaps in the final
    report: the docstring says "the last ride", while the code targets the
    no-ride session.
    """
    live = manager.get_session('user-1', None)
    earlier = manager.set_ride('user-1', 100)

    manager.set_ride('user-1', 200)

    assert manager.find_session('user-1', None) is None
    assert manager.find_session('user-1', 100) is earlier
    assert manager.find_session('user-1', 200).ride_id == 200
    assert live is not None


def test_clear_ride_drops_ride_sessions_but_keeps_a_live_one(manager):
    """
    Ending a ride discards its ride-scoped sessions and leaves the live one.

    The live session is what current frames are scored into, so dropping it
    would silently start the next ride from nothing.
    """
    # `set_ride` is what replaces the live session, so the live session this test
    # cares about is the one created after the ride started.
    ride = manager.set_ride('user-1', 200)
    raise_event_over(ride, 'phone_use', duration=5.0)
    ride.apply_score(20.0)
    live = manager.get_session('user-1', None)

    manager.clear_ride('user-1')

    assert manager.find_session('user-1', 200) is None
    assert manager.find_session('user-1', None) is live
    assert live.scored_frames == 0


def test_clear_ride_does_not_touch_another_user(manager):
    """Clearing one user's ride leaves every other user alone."""
    mine = manager.set_ride('user-1', 200)
    theirs = manager.set_ride('user-2', 300)

    manager.clear_ride('user-1')

    assert manager.find_session('user-2', 300) is theirs
    assert theirs is not mine


def test_finalizing_one_ride_leaves_a_sibling_ride_alone(manager):
    """Freezing a ride freezes only that ride."""
    first = manager.set_ride('user-1', 100)
    second = manager.set_ride('user-1', 200)
    score_a_frame(first)
    score_a_frame(second)

    manager.finalize_session('user-1', 100)

    assert first.finalized is True
    assert second.finalized is False


# ── Freeze semantics ──────────────────────────────────────────────────────────

def test_a_finalized_session_refuses_new_events(session):
    """
    A frame arriving after the ride ended cannot re-open or extend it.

    Both halves matter: the event is not recorded, and the score is not moved.
    """
    raise_event_over(session, 'phone_use', duration=5.0)
    session.apply_score(20.0)
    frozen_score = session.score

    session.finalize()
    session.update_events({'eyes_closed': 0.9}, 200.0)
    after = session.apply_score(200.0)

    assert after == frozen_score
    assert 'eyes_closed' not in session.active_events
    assert session.active_events == {}


def test_a_finalized_session_keeps_reporting_the_same_summary(session):
    """
    Reading the report again returns the same numbers.

    A late frame must not be able to change what the ride already reported.
    """
    raise_event_over(session, 'phone_use', duration=5.0)
    session.apply_score(20.0)
    first = session.finalize()

    assert first is not None
    assert session.finalize() == first


def test_finalize_is_safe_to_call_more_than_once(session):
    """A double End Ride does not lose or alter the first report."""
    raise_event_over(session, 'phone_use', duration=5.0)
    session.apply_score(20.0)

    first = session.finalize()
    second = session.finalize()

    assert second == first


# ── Event lifecycle within a session ──────────────────────────────────────────

def test_an_event_closes_into_completed_events(session):
    """A detection that stops is completed, not abandoned."""
    session.update_events({'phone_use': 0.9}, 10.0)
    assert 'phone_use' in session.active_events

    session.update_events({}, 12.0)

    assert 'phone_use' not in session.active_events
    assert [e.event_type for e in session.completed_events] == ['phone_use']


def test_completed_event_carries_its_duration(session):
    """
    Duration is the span between frames that still saw the event.

    An event seen in one frame and gone by the next closes at the instant it was
    first seen, so it bills its start penalty and no running time. Length is only
    accumulated while detections keep arriving.
    """
    raise_event_over(session, 'phone_use', duration=4.0)

    assert session.completed_events[0].duration == pytest.approx(4.0)


def test_single_frame_event_bills_its_start_penalty_only(session):
    """
    An event that appears and vanishes between frames has no duration.

    This is what keeps a flickering detection from being billed as if the driver
    held the object the whole time.
    """
    session.update_events({'phone_use': 0.9}, 10.0)
    session.update_events({}, 10.1)
    session.apply_score(10.1)

    assert session.completed_events[0].duration == 0.0
    from app.ai.scoring import PENALTIES
    assert session.score == int(START_SCORE - PENALTIES['phone_use']['start'])


def test_max_confidence_tracks_the_peak_not_the_last(session):
    """Confidence is a peak, so a dip mid-event does not lower the record."""
    session.update_events({'phone_use': 0.9}, 10.0)
    session.update_events({'phone_use': 0.4}, 11.0)
    session.update_events({'phone_use': 0.7}, 12.0)
    session.update_events({}, 13.0)

    assert session.completed_events[0].max_confidence == pytest.approx(0.9)


def test_min_measurement_tracks_the_lowest_seen(session):
    """The weakest landmark reading in an event is the one worth recording."""
    session.update_events(
        {'eyes_closed': 0.9}, 10.0, measurements={'eyes_closed': 0.5}
    )
    session.update_events(
        {'eyes_closed': 0.9}, 11.0, measurements={'eyes_closed': 0.2}
    )
    session.update_events(
        {'eyes_closed': 0.9}, 12.0, measurements={'eyes_closed': 0.6}
    )
    session.update_events({}, 13.0)

    assert session.completed_events[0].min_measurement == pytest.approx(0.2)


def test_event_type_ownership_assigns_the_right_source(session):
    """
    Each event type is attributed to the subsystem that raises it.

    A phone event recorded as coming from MediaPipe would misattribute the
    evidence in the report.
    """
    assert session._source_for('phone_use') == 'yolo'
    assert session._source_for('drinking_eating') == 'yolo'
    assert session._source_for('eyes_closed') == 'mediapipe'
    assert session._source_for('phone_call_suspected') == 'inferred'


def test_sources_are_recorded_on_the_events(session):
    """The attribution reaches the summary, not just the helper."""
    session.update_events({'phone_use': 0.9}, 10.0)
    session.update_events({}, 11.0)

    assert session.all_event_dicts()[0]['source'] == 'yolo'


def test_a_foreign_event_type_is_not_closed_by_another_owner(session):
    """
    One subsystem cannot close another subsystem's open event.

    MediaPipe passes the types it owns; if it closed everything, an event YOLO
    had open would be truncated the first frame MediaPipe ran with no detections
    of its own.
    """
    session.update_events({'phone_use': 0.9}, 10.0)

    session.update_events({}, 11.0, owned_types=SessionState.MEDIAPIPE_EVENT_TYPES)

    assert 'phone_use' in session.active_events
    assert session.completed_events == []


def test_all_event_dicts_includes_active_and_completed(session):
    """An event still open at the end of a ride still belongs in its report."""
    session.update_events({'phone_use': 0.9}, 10.0)
    session.update_events({}, 11.0)
    session.update_events({'yawn': 0.8}, 12.0)

    types = {event['type'] for event in session.all_event_dicts()}
    assert types == {'phone_use', 'yawn'}


# ── Score bookkeeping ──────────────────────────────────────────────────────────

def test_scored_frames_counts_every_applied_frame(session):
    """The counter that gates reporting tracks measured frames."""
    session.apply_score(1.0)
    session.apply_score(2.0)
    session.apply_score(3.0)

    assert session.scored_frames == 3


def test_lowest_session_score_remembers_the_worst_moment(session):
    """Recovery lifts the score but not the record of how bad it got."""
    raise_event_over(session, 'phone_use', duration=10.0)
    low = session.apply_score(25.0)

    for later in (21.0, 22.0, 23.0, 24.0):
        session.apply_score(later)

    assert session.score > low
    assert session.lowest_session_score == low


def test_clean_credit_is_capped_per_step(session):
    """
    A long gap credits at most the capped step.

    Credit is otherwise bounded by elapsed wall time, so a session left open
    overnight would bank a full recovery on the first frame back.
    """
    from app.ai.session_manager import MAX_CLEAN_CREDIT_STEP_SECONDS

    session.apply_score(1000.0)
    session.apply_score(1000.0 + MAX_CLEAN_CREDIT_STEP_SECONDS * 10)

    assert session.clean_seconds <= MAX_CLEAN_CREDIT_STEP_SECONDS * 2


def test_clean_seconds_do_not_accumulate_while_an_event_is_open(session):
    """
    Time with an event active is not clean time.

    Crediting it would hand back points for exactly the interval that was spent
    doing the thing being penalised.
    """
    session.update_events({'phone_use': 0.9}, 10.0)
    session.apply_score(10.0)
    before = session.clean_seconds

    session.apply_score(15.0)

    assert session.clean_seconds == pytest.approx(before)


def test_a_recorded_event_is_not_repaid_away_by_later_clean_frames(session):
    """
    A ride with a confirmed event does not finish on a clean 100/100.

    Clean credit used to be unbounded, so a real distraction could be bought back
    in full: a ten-second phone_use cost 20 points, 100 clean seconds gave them
    all back, and the finalized report showed a perfect score beside the event it
    had just charged for. The credit is now bounded by the duration-billed part
    of the penalty, so the ride settles at the points the event costs.
    """
    from app.ai.scoring import PENALTIES, RECOVERY_INTERVAL_SECONDS
    from app.ai.session_manager import MAX_CLEAN_CREDIT_STEP_SECONDS

    rule = PENALTIES['phone_use']
    raise_event_over(session, 'phone_use', duration=10.0)
    session.apply_score(25.0)

    # A long stretch of clean driving — far more than the penalty costs.
    now = 25.0
    for _ in range(200):
        now += MAX_CLEAN_CREDIT_STEP_SECONDS
        session.apply_score(now)

    # The credit was genuinely earned, so this is the bound acting and not the
    # credit simply never having accrued.
    assert session.clean_seconds > RECOVERY_INTERVAL_SECONDS * 10
    assert session.score == int(START_SCORE - rule['start'])
    assert session.score < int(START_SCORE)

    summary = session.finalize()
    assert summary['final_score'] == session.score
    assert summary['total_events'] == 1
    assert summary['points_lost'] == pytest.approx(penalty_for('phone_use', 10.0))


def test_a_clean_ride_is_unaffected_by_the_recovery_bound(session):
    """The bound must not cost a genuinely clean ride anything."""
    for at in (1.0, 2.0, 3.0):
        session.apply_score(at)

    assert session.score == int(START_SCORE)
    assert session.get_session_summary()['final_score'] == int(START_SCORE)


def test_summary_reports_the_sessions_own_score(session):
    """The summary's score is the session's, not a recomputed second opinion."""
    raise_event_over(session, 'phone_use', duration=5.0)
    applied = session.apply_score(20.0)

    summary = session.get_session_summary()

    assert summary['final_score'] == applied == session.score
    assert summary['grade'] == session.grade


def test_summary_counts_events_and_duration(session):
    """Totals in the summary match the events it lists."""
    raise_event_over(session, 'phone_use', duration=2.0)
    session.apply_score(13.0)

    summary = session.get_session_summary()

    assert summary['total_events'] == 1
    assert summary['phone_events'] == 1
    assert summary['total_distracted_duration'] == pytest.approx(2.0)


def test_summary_is_ordered_newest_event_first(session):
    """The timeline reads top-down, so the most recent event is first."""
    session.update_events({'phone_use': 0.9}, 10.0)
    session.update_events({}, 11.0)
    session.update_events({'yawn': 0.8}, 20.0)
    session.update_events({}, 21.0)
    session.apply_score(21.0)

    types = [event['type'] for event in session.get_session_summary()['events']]
    assert types == ['yawn', 'phone_use']
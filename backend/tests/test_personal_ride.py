"""
Ride lifecycle tests for POST /api/rides.

A ride needs a driver and a vehicle before it can be reported on. This file pins
down which rides can be opened at all: a personal ride for an account with no
fleet, a fleet ride on the caller's own records, and a refusal — with nothing
written — for ids that belong to somebody else or that do not exist.

Run from the `backend` directory:  python -m pytest tests -v
"""
from datetime import datetime, timezone

from app.models import EventSource, Ride
from conftest import make_user


def start_ride(client, **body):
    return client.post('/api/rides/', json=body)


def start_fleet_ride(client, driver_id, vehicle_id):
    return client.post('/api/rides/', json={'driver_id': driver_id, 'vehicle_id': vehicle_id})


def ride_count(db):
    return db.query(Ride).count()


# ── Personal rides ─────────────────────────────────────────────────────────────

def test_personal_ride_starts_without_any_fleet_setup(acting_as, client, db):
    """
    An account with no company, driver or vehicle can start and keep a ride.

    This is the case that could not start a ride at all: it used to depend on a
    driver record linked to the user, which a personal account has no way to
    create. The ride belongs to the user alone, with no fleet attached.
    """
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()

    acting_as(user.id)
    response = start_ride(client)

    assert response.status_code == 201
    ride = db.query(Ride).one()
    assert ride.user_id == user.id
    assert ride.driver_id is None
    assert ride.vehicle_id is None
    assert ride.company_id is None
    assert response.json()['ride']['id'] == ride.id


def test_personal_ride_id_is_returned_and_usable_for_end_ride(acting_as, client, db):
    """The id a personal ride is started with is the id End Ride closes."""
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()

    acting_as(user.id)
    ride_id = start_ride(client).json()['ride']['id']

    ended = client.post(f'/api/rides/{ride_id}/end', json={})

    assert ended.status_code == 200
    assert ended.json()['ride']['status'] == 'completed'
    assert db.query(Ride).one().status.value == 'completed'


def test_personal_rides_are_scoped_to_their_owner(acting_as, client, db):
    """One rider's ride is not visible to, nor endable by, another."""
    first = make_user(db, 'first@example.com', 'First')
    second = make_user(db, 'second@example.com', 'Second')
    db.commit()

    acting_as(first.id)
    ride_id = start_ride(client).json()['ride']['id']

    acting_as(second.id)
    assert client.get(f'/api/rides/{ride_id}').status_code == 403
    assert client.post(f'/api/rides/{ride_id}/end', json={}).status_code == 403

    acting_as(first.id)
    assert client.get(f'/api/rides/{ride_id}').status_code == 200


def test_personal_ride_events_persist_against_that_ride(acting_as, client, db):
    """
    Events written during a personal ride belong to it and to no other.

    The frame pipeline resolves the open ride per user and writes events under
    its id, which is what keeps a personal ride's report describing its own
    frames. Here the ride service is exercised directly with that id, the way the
    pipeline uses it.
    """
    from app.services.ride_service import RideService

    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()

    acting_as(user.id)
    ride_id = start_ride(client).json()['ride']['id']

    service = RideService()
    try:
        # The same lookup the frame pipeline performs to decide which ride a
        # scored frame's events belong to.
        assert service.get_active_ride_for_user(user.id).id == ride_id

        service.create_event(
            ride_id=ride_id,
            event_type='phone_use',
            source=EventSource.YOLO,
            start_timestamp=datetime.now(timezone.utc),
        )
        service.commit()
    finally:
        service.close()

    listed = client.get(f'/api/rides/{ride_id}/events').json()
    assert [event['ride_id'] for event in listed['events']] == [ride_id]

    ended = client.post(f'/api/rides/{ride_id}/end', json={})
    assert ended.json()['ride']['id'] == ride_id
    assert ended.json()['ride']['event_count'] == 1


def test_only_one_personal_ride_at_a_time(acting_as, client, db):
    """
    A second personal ride is refused while the first is open.

    A personal ride has no driver or vehicle to hold it, so the owner is the only
    thing that can: without this, two open rides would make the ride the frame
    pipeline picks per frame ambiguous.
    """
    user = make_user(db, 'rider@example.com', 'Solo Rider')
    db.commit()

    acting_as(user.id)
    assert start_ride(client).status_code == 201

    second = start_ride(client)
    assert second.status_code == 400
    assert ride_count(db) == 1


def test_fleet_account_cannot_open_a_personal_ride(acting_as, client, db, two_companies):
    """
    A fleet operator is not quietly given a ride that belongs to no fleet.

    The workspace the UI is showing does not decide this; the account's own fleet
    does, so a fleet operator has to name a driver and a vehicle from it.
    """
    acting_as(two_companies['alice_id'])

    response = start_ride(client)

    assert response.status_code == 400
    assert 'driver' in response.json()['message'].lower()
    assert ride_count(db) == 0


def test_driver_without_vehicle_is_refused_with_an_actionable_message(
    acting_as, client, db, two_companies
):
    """Naming only a driver is refused, and the message says what is missing."""
    acting_as(two_companies['alice_id'])

    response = start_ride(client, driver_id=two_companies['alice_driver_id'])

    assert response.status_code == 400
    assert 'vehicle' in response.json()['message'].lower()
    assert ride_count(db) == 0


def test_vehicle_without_driver_is_refused(acting_as, client, db, two_companies):
    """Naming only a vehicle is refused for the same reason."""
    acting_as(two_companies['alice_id'])

    response = start_ride(client, vehicle_id=two_companies['alice_vehicle_id'])

    assert response.status_code == 400
    assert ride_count(db) == 0


# ── Fleet rides ────────────────────────────────────────────────────────────────

def test_fleet_ride_still_works_on_the_callers_own_records(acting_as, client, db, two_companies):
    """The fleet path is unchanged: named driver and vehicle, same company."""
    acting_as(two_companies['alice_id'])

    response = start_fleet_ride(
        client, two_companies['alice_driver_id'], two_companies['alice_vehicle_id']
    )

    assert response.status_code == 201
    ride = db.query(Ride).one()
    assert ride.user_id == two_companies['alice_id']
    assert ride.company_id == two_companies['alpha_id']
    assert ride.driver_id == two_companies['alice_driver_id']
    assert ride.vehicle_id == two_companies['alice_vehicle_id']


def test_account_without_a_company_cannot_name_a_fleet_driver(acting_as, client, db, two_companies):
    """
    A personal account cannot borrow a driver's id to start a ride.

    Ownership is resolved from the database, so naming another tenant's driver
    is refused exactly like naming one that does not exist, and no personal ride
    is created in its place.
    """
    outsider = make_user(db, 'outsider@example.com', 'Outsider')
    db.commit()

    acting_as(outsider.id)
    response = start_fleet_ride(
        client, two_companies['alice_driver_id'], two_companies['alice_vehicle_id']
    )

    assert response.status_code == 404
    assert ride_count(db) == 0


def test_cross_company_driver_is_refused(acting_as, client, db, two_companies):
    """Alice cannot start a ride on Bob's driver, even though Bob cannot see it."""
    acting_as(two_companies['alice_id'])

    response = start_fleet_ride(
        client, two_companies['bob_driver_id'], two_companies['alice_vehicle_id']
    )

    assert response.status_code == 404
    assert ride_count(db) == 0


def test_cross_company_vehicle_is_refused(acting_as, client, db, two_companies):
    """Alice cannot start a ride on Bob's vehicle either."""
    acting_as(two_companies['alice_id'])

    response = start_fleet_ride(
        client, two_companies['alice_driver_id'], two_companies['bob_vehicle_id']
    )

    assert response.status_code == 404
    assert ride_count(db) == 0


def test_driver_and_vehicle_from_different_fleets_are_refused(acting_as, client, db, two_companies):
    """Two ids the caller may each use, from different fleets, cannot be paired."""
    acting_as(two_companies['alice_id'])

    response = start_fleet_ride(
        client, two_companies['alice_driver_id'], two_companies['gamma_vehicle_id']
    )

    assert response.status_code == 403
    assert ride_count(db) == 0


def test_foreign_and_missing_ids_answer_identically(acting_as, client, db, two_companies):
    """
    A foreign id and a nonexistent id are answered the same way.

    If they differed, the endpoint could be used to find out which driver and
    vehicle ids exist in another tenant.
    """
    acting_as(two_companies['alice_id'])

    foreign = start_fleet_ride(
        client, two_companies['bob_driver_id'], two_companies['alice_vehicle_id']
    )
    missing = start_fleet_ride(client, 999_999, two_companies['alice_vehicle_id'])

    assert foreign.status_code == missing.status_code == 404
    assert foreign.json()['message'] == missing.json()['message']


def test_unauthenticated_start_is_refused(client, db, two_companies):
    """No ride is opened without an authenticated caller."""
    response = start_fleet_ride(
        client, two_companies['alice_driver_id'], two_companies['alice_vehicle_id']
    )

    assert response.status_code == 401
    assert ride_count(db) == 0


def test_client_supplied_company_and_user_are_ignored(acting_as, client, db, two_companies):
    """
    A company_id or user_id in the body cannot redirect the ride.

    Neither is part of the request body, so both are dropped rather than trusted;
    ownership is resolved server-side from the authenticated caller.
    """
    acting_as(two_companies['alice_id'])

    response = client.post(
        '/api/rides/',
        json={
            'driver_id': two_companies['alice_driver_id'],
            'vehicle_id': two_companies['alice_vehicle_id'],
            'company_id': two_companies['beta_id'],
            'user_id': two_companies['bob_id'],
        },
    )

    assert response.status_code == 201
    ride = db.query(Ride).one()
    assert ride.company_id == two_companies['alpha_id']
    assert ride.user_id == two_companies['alice_id']
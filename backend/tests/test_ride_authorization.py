"""
Authorization tests for POST /api/rides.

The ride endpoint accepts a driver_id and a vehicle_id from the client. These
tests pin down that both are resolved against the authenticated user's own
companies before a ride is written, so one tenant cannot start a ride on
another tenant's driver or vehicle.

Run from the `backend` directory:  python -m pytest tests/test_ride_authorization.py -v
"""
import pytest

from app.models import Ride
from conftest import make_company, make_driver, make_user, make_vehicle


def start_ride(client, driver_id, vehicle_id):
    return client.post('/api/rides/', json={'driver_id': driver_id, 'vehicle_id': vehicle_id})


def ride_count(db):
    return db.query(Ride).count()


# ── Authorized creation ────────────────────────────────────────────────────────

def test_authorized_ride_is_created(acting_as, client, db, two_companies):
    """A user starting a ride on their own fleet succeeds and is persisted."""
    acting_as(two_companies['alice_id'])

    response = start_ride(
        client, two_companies['alice_driver_id'], two_companies['alice_vehicle_id']
    )

    assert response.status_code == 201
    body = response.json()
    assert body['success'] is True
    assert body['ride']['driver_id'] == two_companies['alice_driver_id']
    assert body['ride']['vehicle_id'] == two_companies['alice_vehicle_id']

    ride = db.query(Ride).one()
    assert ride.user_id == two_companies['alice_id']
    assert ride.company_id == two_companies['alpha_id']


def test_authorized_ride_across_own_companies_allowed(acting_as, client, db, two_companies):
    """
    Two companies owned by the same user are still the same tenant.

    Each pair stays within one company, so the user may use either. This is the
    case that would break if authorization were written as "the first company
    this user happens to own" instead of "any company this user owns".
    """
    acting_as(two_companies['alice_id'])
    gamma_driver = make_driver(db, two_companies['gamma_id'], 'Gamma Driver')
    gamma_vehicle_id = two_companies['gamma_vehicle_id']
    db.commit()

    first = start_ride(
        client, two_companies['alice_driver_id'], two_companies['alice_vehicle_id']
    )
    assert first.status_code == 201

    second = start_ride(client, gamma_driver.id, gamma_vehicle_id)
    assert second.status_code == 201
    assert second.json()['ride']['company_id'] == two_companies['gamma_id']


# ── Cross-company references ───────────────────────────────────────────────────

def test_cross_company_driver_is_rejected(acting_as, client, db, two_companies):
    """Alice cannot start a ride using a driver from Bob's fleet."""
    acting_as(two_companies['alice_id'])

    response = start_ride(
        client, two_companies['bob_driver_id'], two_companies['alice_vehicle_id']
    )

    assert response.status_code == 404
    assert response.json()['success'] is False
    assert ride_count(db) == 0


def test_cross_company_vehicle_is_rejected(acting_as, client, db, two_companies):
    """Alice cannot start a ride using a vehicle from Bob's fleet."""
    acting_as(two_companies['alice_id'])

    response = start_ride(
        client, two_companies['alice_driver_id'], two_companies['bob_vehicle_id']
    )

    assert response.status_code == 404
    assert response.json()['success'] is False
    assert ride_count(db) == 0


def test_fully_foreign_pair_is_rejected(acting_as, client, db, two_companies):
    """Both ids from another tenant are refused, and nothing is written."""
    acting_as(two_companies['alice_id'])

    response = start_ride(
        client, two_companies['bob_driver_id'], two_companies['bob_vehicle_id']
    )

    assert response.status_code == 404
    assert ride_count(db) == 0


def test_reverse_direction_is_rejected(acting_as, client, db, two_companies):
    """The check is not one-directional: Bob cannot use Alice's fleet either."""
    acting_as(two_companies['bob_id'])

    response = start_ride(
        client, two_companies['alice_driver_id'], two_companies['alice_vehicle_id']
    )

    assert response.status_code == 404
    assert ride_count(db) == 0


# ── Mismatched ownership ──────────────────────────────────────────────────────

def test_mismatched_driver_vehicle_pair_is_rejected(acting_as, client, db, two_companies):
    """
    Two ids the caller may each use individually, from different companies.

    Both records belong to Alice, so a per-record check would pass both. They
    must not be paired, because the resulting ride would attribute a driver to
    a vehicle from a different fleet.
    """
    acting_as(two_companies['alice_id'])

    response = start_ride(
        client, two_companies['alice_driver_id'], two_companies['gamma_vehicle_id']
    )

    assert response.status_code == 403
    assert response.json()['success'] is False
    assert ride_count(db) == 0


def test_mismatched_pair_does_not_fall_back_to_driver_company(
    acting_as, client, db, two_companies
):
    """The refused pair must not silently resolve to the driver's company."""
    acting_as(two_companies['alice_id'])

    response = start_ride(
        client, two_companies['alice_driver_id'], two_companies['gamma_vehicle_id']
    )

    assert response.status_code == 403
    ride = db.query(Ride).first()
    assert ride is None


# ── Non-disclosure and unauthenticated access ──────────────────────────────────

def test_unauthorized_id_is_indistinguishable_from_missing(acting_as, client, db, two_companies):
    """
    A foreign id and a nonexistent id answer identically.

    If they differed, the endpoint could be used to enumerate which driver or
    vehicle ids exist in another tenant.
    """
    acting_as(two_companies['alice_id'])

    foreign_driver = start_ride(
        client, two_companies['bob_driver_id'], two_companies['alice_vehicle_id']
    )
    missing_driver = start_ride(client, 999_999, two_companies['alice_vehicle_id'])

    assert foreign_driver.status_code == missing_driver.status_code == 404
    assert foreign_driver.json()['message'] == missing_driver.json()['message']

    foreign_vehicle = start_ride(
        client, two_companies['alice_driver_id'], two_companies['bob_vehicle_id']
    )
    missing_vehicle = start_ride(
        client, two_companies['alice_driver_id'], 999_999
    )

    assert foreign_vehicle.status_code == missing_vehicle.status_code == 404
    assert foreign_vehicle.json()['message'] == missing_vehicle.json()['message']


def test_request_without_authentication_is_refused(client, db, two_companies):
    """An unauthenticated start is rejected before any authorization runs."""
    response = start_ride(
        client, two_companies['alice_driver_id'], two_companies['alice_vehicle_id']
    )

    assert response.status_code == 401
    assert ride_count(db) == 0


def test_user_without_a_company_cannot_start_a_ride(acting_as, client, db, two_companies):
    """
    A user owning nothing is refused even for a real driver id.

    Ownership is resolved from the database, so a caller with no company has no
    fleet to draw a driver or vehicle from.
    """
    outsider = make_user(db, 'outsider@example.com', 'Outsider')
    db.commit()

    acting_as(outsider.id)
    response = start_ride(
        client, two_companies['alice_driver_id'], two_companies['alice_vehicle_id']
    )

    assert response.status_code == 404
    assert ride_count(db) == 0


def test_client_supplied_company_is_ignored(acting_as, client, db, two_companies):
    """
    A company_id in the request body cannot redirect the ride.

    The body is not part of StartRideBody, so it is dropped rather than trusted;
    the ride still lands on the company ownership resolved server-side.
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
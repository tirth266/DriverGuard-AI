"""
Test configuration.

The app builds its SQLAlchemy engine at import time from DATABASE_URL, so the
test database has to be pointed at before anything under `app` is imported. This
module does that, then isolates the security tests from the development database.
"""
import os
import secrets
import tempfile

_TEST_DB_PATH = os.path.join(
    tempfile.gettempdir(), 'driverguard_security_tests.db'
)

# A throwaway file rather than :memory:, because the app opens its session in a
# different connection than the test asserts through.
os.environ['DATABASE_URL'] = f'sqlite:///{_TEST_DB_PATH}'

# The app now refuses to start without a real signing key for either the session
# cookie or the JWTs (app.config.require_secret). Tests must not depend on the
# developer's backend/.env, nor mint tokens with a real deployment's key, so
# both are generated per run here. Random per run also means one run's tokens can
# never be replayed against another.
os.environ['SECRET_KEY'] = secrets.token_urlsafe(32)
os.environ['JWT_SECRET'] = secrets.token_urlsafe(32)

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.extensions import Base, SessionLocal, engine  # noqa: E402
from app.models import Company, Driver, Ride, User, Vehicle  # noqa: E402
from app.ride.routes import get_ride_service, ride_router  # noqa: E402
from app.services.ride_service import RideService  # noqa: E402
import app.auth.controller as auth_controller  # noqa: E402


# Deleted child-first. `drivers` and `vehicles` reference each other, and SQLite
# does not enforce foreign keys unless asked to, so one pass in this order is
# enough to leave the file empty.
_TABLES_IN_DELETE_ORDER = (
    'ride_events', 'rides', 'drivers', 'vehicles',
    'user_settings', 'companies', 'users',
)


def _empty_the_database():
    session = SessionLocal()
    try:
        for table in _TABLES_IN_DELETE_ORDER:
            session.query(Base.metadata.tables[table]).delete()
        session.commit()
    finally:
        session.close()


@pytest.fixture(autouse=True)
def clean_database():
    """Clear every table so each test starts from a known state."""
    Base.metadata.create_all(bind=engine)
    _empty_the_database()
    yield
    _empty_the_database()


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def acting_as(client, db):
    """
    Set the authenticated user id and return the client to send with.

    Authentication is overridden rather than exercised with real JWTs: these
    tests are about what the ride endpoint does with the caller identity it is
    handed, not about token issuance, which is unchanged by this fix.
    """
    def _set(user_id):
        client.app.state.acting_user_id = user_id
        return client
    return _set


@pytest.fixture
def client(db):
    """A client bound to the ride router, sharing this test's session."""
    app = FastAPI()
    app.include_router(ride_router)
    app.state.acting_user_id = None

    def _current_user_id():
        if app.state.acting_user_id is None:
            raise auth_controller.HTTPException(
                status_code=401, detail='No acting user set for this request.'
            )
        return str(app.state.acting_user_id)

    app.dependency_overrides[auth_controller.get_current_user_id] = _current_user_id
    # The production dependency opens its own session and never closes it, which
    # would leave a handle on the database file for the rest of the run. The
    # route logic under test is unaffected by where the session comes from.
    app.dependency_overrides[get_ride_service] = lambda: RideService(db)

    with TestClient(app) as test_client:
        test_client.app = app
        yield test_client


# ── Fixture data ───────────────────────────────────────────────────────────────

def make_user(session, email: str, name: str = 'Test User') -> User:
    user = User(name=name, email=email, provider='local', role='User')
    session.add(user)
    session.flush()
    return user


def make_company(session, owner_id: int, name: str) -> Company:
    company = Company(name=name, owner_id=owner_id)
    session.add(company)
    session.flush()
    return company


def make_driver(session, company_id: int, full_name: str) -> Driver:
    driver = Driver(company_id=company_id, full_name=full_name, is_active=True)
    session.add(driver)
    session.flush()
    return driver


def make_vehicle(session, company_id: int, vehicle_number: str) -> Vehicle:
    vehicle = Vehicle(company_id=company_id, vehicle_number=vehicle_number, status='Active')
    session.add(vehicle)
    session.flush()
    return vehicle


@pytest.fixture
def two_companies(db):
    """
    Two unrelated tenants, plus a second company owned by the first user.

    `alice` owns Alpha Logistics and `bob` owns Beta Transit, each with one
    driver and one vehicle, so a request by alice using bob's ids is the
    cross-company case and alice using both her own ids is the authorized one.
    Alice also owns Gamma Freight, which supplies a vehicle she is individually
    allowed to use but must not be able to pair with her Alpha driver.
    """
    alice = make_user(db, 'alice@example.com', 'Alice')
    bob = make_user(db, 'bob@example.com', 'Bob')

    alpha = make_company(db, alice.id, 'Alpha Logistics')
    beta = make_company(db, bob.id, 'Beta Transit')
    gamma = make_company(db, alice.id, 'Gamma Freight')

    alice_driver = make_driver(db, alpha.id, 'Alice Driver')
    alice_vehicle = make_vehicle(db, alpha.id, 'ALPHA-1')
    bob_driver = make_driver(db, beta.id, 'Bob Driver')
    bob_vehicle = make_vehicle(db, beta.id, 'BETA-1')
    gamma_vehicle = make_vehicle(db, gamma.id, 'GAMMA-1')

    db.commit()

    return {
        'alice_id': alice.id,
        'bob_id': bob.id,
        'alpha_id': alpha.id,
        'beta_id': beta.id,
        'gamma_id': gamma.id,
        'alice_driver_id': alice_driver.id,
        'alice_vehicle_id': alice_vehicle.id,
        'bob_driver_id': bob_driver.id,
        'bob_vehicle_id': bob_vehicle.id,
        'gamma_vehicle_id': gamma_vehicle.id,
    }
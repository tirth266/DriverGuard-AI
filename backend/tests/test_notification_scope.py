"""
Notification endpoints are tenant-scoped, and the report endpoint refuses to
describe a ride it has no measurement of.

Every send endpoint spends this deployment's SMTP identity, so an unscoped one
is an open relay: any account could mail any address, and an invitation puts an
attacker-chosen link inside correctly branded HTML. Each recipient is therefore
resolved against the caller's own companies, and a recipient that is not there
is reported exactly as one that does not exist.

Run from the `backend` directory:  python -m pytest tests/test_notification_scope.py -v
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.auth.controller as auth_controller
from app.auth.controller import get_current_user_id
from app.extensions import SessionLocal
from app.fleet.routes import get_user_company_ids
from app.models import Company, Driver
from app.notifications.routes import (
    allowed_invitation_origins,
    notifications_router,
    validate_invitation_link,
)

ALICE = 'alice@example.com'
BOB = 'bob@example.com'


@pytest.fixture
def tenants(db):
    from conftest import make_company, make_user

    alice = make_user(db, ALICE, 'Alice')
    bob = make_user(db, BOB, 'Bob')
    alpha = make_company(db, alice.id, 'Alpha Logistics')
    beta = make_company(db, bob.id, 'Beta Transit')
    alpha_driver = make_driver(db, alpha.id, 'alpha-driver@example.com', 'Alpha Driver')
    beta_driver = make_driver(db, beta.id, 'beta-driver@example.com', 'Beta Driver')
    db.commit()

    return {
        'alice_id': alice.id,
        'bob_id': bob.id,
        'alpha_driver_email': alpha_driver.email,
        'beta_driver_email': beta_driver.email,
        'alpha_name': alpha.name,
    }


def make_driver(session, company_id: int, email: str, full_name: str) -> Driver:
    driver = Driver(company_id=company_id, full_name=full_name, email=email, is_active=True)
    session.add(driver)
    session.flush()
    return driver


@pytest.fixture
def api(db, monkeypatch):
    """
    The notification router with SMTP stubbed out.

    Delivery is recorded rather than performed: the assertions are about who is
    allowed to reach the mail service, so the service must be reached at all.
    """
    from app.services import email_service as email_module

    sent = []
    monkeypatch.setattr(email_module.email_service, 'is_configured', lambda: True)
    for name in ('send_email', 'send_driver_invitation', 'send_ride_report', 'send_safety_alert'):
        monkeypatch.setattr(
            email_module.email_service, name,
            lambda **kwargs: (sent.append(kwargs), True)[1],
        )

    app = FastAPI()
    app.include_router(notifications_router)
    app.state.sent = sent
    with TestClient(app) as client:
        yield client


def as_user(app, user_id):
    app.dependency_overrides[get_current_user_id] = lambda: str(user_id)


def invite(client, email, link='http://localhost:5173/join/abc'):
    return client.post('/api/notifications/invite-driver', json={
        'email': email,
        'driver_name': 'Ignored, the record wins',
        'invitation_link': link,
        'company_name': 'Ignored, the record wins',
    })


# ── Recipient scoping ─────────────────────────────────────────────────────────

def test_a_driver_in_the_callers_own_fleet_can_be_invited(api, tenants):
    as_user(api.app, tenants['alice_id'])

    response = invite(api, tenants['alpha_driver_email'])

    assert response.status_code == 200
    # The name and company come from the database, not the request body.
    assert api.app.state.sent[0]['driver_name'] == 'Alpha Driver'
    assert api.app.state.sent[0]['company_name'] == 'Alpha Logistics'


def test_a_driver_in_another_tenants_fleet_is_refused(api, tenants):
    as_user(api.app, tenants['alice_id'])

    response = invite(api, tenants['beta_driver_email'])

    assert response.status_code == 404
    assert 'not found in your fleet' in response.json()['message'].lower()
    assert api.app.state.sent == []


def test_a_driver_that_does_not_exist_is_refused_identically(api, tenants):
    """Same answer as "exists but belongs to someone else", so this cannot probe."""
    as_user(api.app, tenants['alice_id'])

    foreign = invite(api, tenants['beta_driver_email']).json()
    missing = invite(api, 'nobody@example.com').json()

    assert foreign == missing


def test_an_account_with_no_fleet_can_invite_nobody(api, tenants):
    from conftest import make_user

    db = SessionLocal()
    try:
        loner = make_user(db, 'loner@example.com', 'Loner')
        db.commit()
        loner_id = loner.id
    finally:
        db.close()

    as_user(api.app, loner_id)

    assert invite(api, tenants['alpha_driver_email']).status_code == 404


def test_a_ride_report_cannot_be_mailed_to_another_tenants_driver(api, tenants):
    as_user(api.app, tenants['alice_id'])

    response = api.post('/api/notifications/ride-report', json={
        'email': tenants['beta_driver_email'],
        'driver_name': 'Beta Driver',
        'ride_summary': {'final_score': 100},
    })

    assert response.status_code == 404
    assert api.app.state.sent == []


def test_a_safety_alert_cannot_be_mailed_to_another_tenants_driver(api, tenants):
    as_user(api.app, tenants['alice_id'])

    response = api.post('/api/notifications/safety-alert', json={
        'email': tenants['beta_driver_email'],
        'driver_name': 'Beta Driver',
        'alert_type': 'phone',
        'vehicle': 'BETA-1',
        'timestamp': '2026-01-01T00:00:00Z',
    })

    assert response.status_code == 404
    assert api.app.state.sent == []


# ── The generic relay ─────────────────────────────────────────────────────────

def test_a_personal_account_cannot_use_the_generic_relay(api, tenants):
    from conftest import make_user

    db = SessionLocal()
    try:
        loner = make_user(db, 'relay@example.com', 'Relay')
        db.commit()
        loner_id = loner.id
    finally:
        db.close()

    as_user(api.app, loner_id)

    response = api.post('/api/notifications/send', json={
        'to': 'anyone@example.com',
        'subject': 'hello',
        'body': 'hello',
    })

    assert response.status_code == 403
    assert api.app.state.sent == []


def test_a_fleet_account_can_still_use_the_generic_relay(api, tenants):
    """The restriction is on account type, not on removing the capability."""
    as_user(api.app, tenants['alice_id'])

    response = api.post('/api/notifications/send', json={
        'to': 'anyone@example.com',
        'subject': 'hello',
        'body': 'hello',
    })

    assert response.status_code == 200
    assert len(api.app.state.sent) == 1


# ── Invitation link ───────────────────────────────────────────────────────────

@pytest.mark.parametrize('link', [
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    '/join/abc',
    'not a url',
])
def test_a_link_that_is_not_an_http_url_is_refused(link):
    assert validate_invitation_link(link) is not None


def test_a_link_to_another_site_is_refused():
    assert validate_invitation_link('https://evil.example.com/steal') is not None


def test_plain_http_to_another_host_is_refused():
    assert validate_invitation_link('http://evil.example.com/join') is not None


@pytest.mark.parametrize('link', [
    'http://localhost:5173/join/abc',
    'http://localhost:5174/join/abc',
])
def test_a_link_to_a_configured_application_origin_is_accepted(link):
    assert validate_invitation_link(link) is None


# ── Origin matching is exact, not a prefix ─────────────────────────────────────
#
# The check used to compare "scheme://netloc" with str.startswith, so any host
# that merely began with an allowed origin was accepted. An attacker who
# registers fleet.example.com.evil.net passes such a check and gets this
# deployment's own branding wrapped around a link to their own site. Each URL
# below is one that check accepted.

@pytest.fixture
def configured_frontends(monkeypatch):
    monkeypatch.setenv('FRONTEND_URL', 'https://fleet.example.com,https://app.example.org')


@pytest.mark.parametrize('link', [
    # The three reported bypasses.
    'https://fleet.example.com.evil.net/x',
    'https://app.example.org.attacker.io/x',
    'http://localhost:5173.evil.com/steal',
    # The same trick against the built-in dev origins.
    'http://localhost:5173.evil.com/steal',
    'http://127.0.0.1:5174.attacker.net/x',
    # A prefix of an allowed origin with a different scheme.
    'https://fleet.example.com.evil.net',
])
def test_a_host_that_merely_shares_an_allowed_origin_prefix_is_refused(
    link, configured_frontends
):
    assert validate_invitation_link(link) is not None


@pytest.mark.parametrize('link', [
    'https://fleet.example.com/join',
    'https://app.example.org/join?ref=mail',
    # Host case and the default port are the same origin.
    'https://FLEET.example.com/join',
    'https://fleet.example.com:443/join',
    # A trailing dot names the same host.
    'https://fleet.example.com./join',
])
def test_a_configured_origin_is_accepted_however_it_is_written(link, configured_frontends):
    assert validate_invitation_link(link) is None


@pytest.mark.parametrize('link,expected', [
    # Right host, wrong port.
    ('https://fleet.example.com:8443/join', 'must point at this application'),
    ('http://localhost:3001/join', 'must point at this application'),
    # Wrong scheme for the same host.
    ('http://fleet.example.com/join', 'must use https'),
])
def test_a_mismatch_in_any_part_of_the_origin_is_refused(link, expected, configured_frontends):
    error = validate_invitation_link(link)

    assert error is not None
    assert expected in error


@pytest.mark.parametrize('link', [
    # Userinfo: the host is evil.net but it reads as the allowed one.
    'https://fleet.example.com@evil.net/steal',
    'https://user:pass@fleet.example.com/join',
    # A backslash the parser folds into the authority.
    'https://fleet.example.com\\@evil.net/steal',
    # A non-numeric port, and a port outside the valid range.
    'https://fleet.example.com:notaport/join',
    'https://fleet.example.com:99999/join',
    # No host at all.
    'https:///join',
    'https://',
])
def test_a_malformed_or_ambiguous_url_is_refused(link, configured_frontends):
    assert validate_invitation_link(link) is not None


def test_a_refused_link_never_reaches_the_mail_service(api, tenants):
    as_user(api.app, tenants['alice_id'])

    response = invite(api, tenants['alpha_driver_email'], link='https://evil.example.com/steal')

    assert response.status_code == 400
    assert api.app.state.sent == []


@pytest.mark.parametrize('link', [
    'https://fleet.example.com.evil.net/x',
    'https://app.example.org.attacker.io/x',
    'http://localhost:5173.evil.com/steal',
])
def test_a_bypass_link_is_refused_end_to_end(api, tenants, link, configured_frontends):
    """The URL check, reached through the endpoint, with the mail service up."""
    as_user(api.app, tenants['alice_id'])

    response = invite(api, tenants['alpha_driver_email'], link=link)

    assert response.status_code == 400
    assert api.app.state.sent == []


def test_the_allowed_origins_include_the_configured_frontend(monkeypatch):
    monkeypatch.setenv('FRONTEND_URL', 'https://fleet.example.com')

    assert 'https://fleet.example.com' in allowed_invitation_origins()


# ── Configuration is reported before authorization ─────────────────────────────

@pytest.mark.parametrize('path,body', [
    ('/api/notifications/invite-driver', {
        'email': 'alpha-driver@example.com',
        'driver_name': 'D',
        'invitation_link': 'http://localhost:5173/join/abc',
        'company_name': 'C',
    }),
    ('/api/notifications/ride-report', {
        'email': 'alpha-driver@example.com',
        'driver_name': 'D',
        'ride_summary': {},
    }),
    ('/api/notifications/safety-alert', {
        'email': 'alpha-driver@example.com',
        'driver_name': 'D',
        'alert_type': 'phone',
        'vehicle': 'V',
        'timestamp': '2026-01-01T00:00:00Z',
    }),
])
def test_an_unconfigured_service_reports_503_not_404(api, tenants, path, body, monkeypatch):
    """
    A deployment with no SMTP has nothing to send.

    The recipient lookup used to run first, so an unconfigured deployment
    answered "Driver not found in your fleet" for every request — pointing an
    operator at an authorization problem that does not exist. The driver here is
    the caller's own, so a 404 would mean the ordering, not the tenant.
    """
    from app.services import email_service as email_module

    monkeypatch.setattr(email_module.email_service, 'is_configured', lambda: False)
    as_user(api.app, tenants['alice_id'])

    response = api.post(path, json={**body, 'email': tenants['alpha_driver_email']})

    assert response.status_code == 503
    assert 'not configured' in response.json()['message'].lower()
    assert api.app.state.sent == []


# ── Multi-company ownership ───────────────────────────────────────────────────

def test_an_owner_of_two_companies_gets_every_company_id(db):
    from conftest import make_company, make_user

    owner = make_user(db, 'owner@example.com', 'Owner')
    make_company(db, owner.id, 'First Ltd')
    make_company(db, owner.id, 'Second Ltd')
    db.commit()

    assert len(get_user_company_ids(str(owner.id), db)) == 2


def test_an_owner_of_one_company_gets_exactly_that_one(db):
    from conftest import make_company, make_user

    owner = make_user(db, 'solo@example.com', 'Solo')
    make_company(db, owner.id, 'Only Ltd')
    db.commit()

    assert get_user_company_ids(str(owner.id), db) == [
        row.id for row in db.query(Company).filter(Company.owner_id == owner.id).all()
    ]


def test_a_user_with_no_company_gets_no_ids(db):
    from conftest import make_user

    loner = make_user(db, 'none@example.com', 'None')
    db.commit()

    assert get_user_company_ids(str(loner.id), db) == []
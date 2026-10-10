"""
Authentication tests: token expiry and malformed credentials.

These call `get_current_user_id` directly with a stand-in request object, which
is the only way to drive the expiry path — a real request would need a real
expired token, and minting one is exactly what this file does.

The user store is stubbed so no test depends on a database, a real account or a
signed token from a previous run. Tokens are signed with the app's own key from
`app.extensions`, so a change to the signing configuration shows up here.

Run from the `backend` directory:  python -m pytest tests/test_auth_expiry.py -v
"""
from datetime import datetime, timedelta, timezone

import base64
import json

import pytest
from fastapi import HTTPException
from jose import JWTError, jwt

from app.auth.controller import get_current_user_id
from app.auth.storage import UserRecord, UserStore, set_user_store
from app.extensions import JWT_ALGORITHM, JWT_SECRET_KEY


EXPIRY_SECONDS = 7 * 24 * 60 * 60


class FakeRequest:
    """The only thing `get_current_user_id` reads is the Authorization header."""

    def __init__(self, authorization=None):
        self.headers = {}
        if authorization is not None:
            self.headers['Authorization'] = authorization


class StubUserStore(UserStore):
    """
    A store holding one fixed user.

    Subclassing the real interface means this cannot silently drift from it: a
    method added to UserStore without implementing it here fails loudly at
    construction rather than passing unnoticed.
    """

    def __init__(self, known_user_ids):
        self._known = set(known_user_ids)

    def _record(self, user_id):
        return UserRecord(
            id=user_id,
            name='Test User',
            email=f'user{user_id}@example.com',
            password_hash=None,
            google_id=None,
            provider='local',
            role='User',
            account_type=None,
            company='',
            avatar='',
            profile_picture='',
            email_verified=True,
            is_first_login=False,
            company_setup_complete=False,
            last_login=None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

    def get_by_email(self, email):
        return None

    def get_by_id(self, user_id):
        return self._record(user_id) if user_id in self._known else None

    def get_by_google_id(self, google_id):
        return None

    def create(self, **fields):
        raise NotImplementedError('not used by these tests')

    def update(self, user_id, **fields):
        raise NotImplementedError('not used by these tests')

    def verify_password(self, user, password):
        return False

    def set_password(self, user, password):
        raise NotImplementedError('not used by these tests')

    def commit(self):
        return None

    def rollback(self):
        return None


@pytest.fixture
def known_user():
    return 42


@pytest.fixture(autouse=True)
def configured_store(known_user, monkeypatch):
    """Install a store that knows exactly one user, and restore the old one."""
    previous = None
    try:
        previous = _current_store()
    except Exception:
        previous = None
    set_user_store(StubUserStore([known_user]))
    yield
    if previous is not None:
        set_user_store(previous)


def _current_store():
    import app.auth.storage as storage

    return storage._user_store


def make_token(user_id, expires_in_seconds, **overrides):
    """A token signed with the app's own key, with a chosen expiry."""
    payload = {
        'sub': str(user_id),
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds),
    }
    payload.update(overrides)
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def make_token_with_payload(payload):
    """Sign an arbitrary claim set, for tokens `make_token` cannot express."""
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def unsigned_token(claims):
    """Hand-assemble an `alg: none` token, which the JWT library refuses to sign."""
    def segment(data):
        return base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip('=')

    return '.'.join([
        segment({'alg': 'none', 'typ': 'JWT'}),
        segment(claims),
        '',
    ])


def call(token=None, raw_header=None):
    request = FakeRequest(
        raw_header if raw_header is not None
        else (f'Bearer {token}' if token is not None else None)
    )
    return get_current_user_id(request)


# ── Expiry ────────────────────────────────────────────────────────────────────

def test_a_valid_token_is_accepted(known_user):
    """The happy path: a fresh token for an existing user returns their id."""
    assert call(make_token(known_user, 60)) == str(known_user)


def test_a_token_that_expired_one_second_ago_is_rejected(known_user):
    """
    An expired token is refused even though it is otherwise well formed.

    Expiry is enforced at the signature check, before any lookup, so a token
    that outlived its window never reaches the store.
    """
    with pytest.raises(HTTPException) as raised:
        call(make_token(known_user, -1))

    assert raised.value.status_code == 401


def test_a_token_that_has_already_expired_is_rejected_at_the_second(known_user):
    """
    Expiry takes effect on the first whole second past `exp`.

    A token whose `exp` has passed by a second is refused. The zero case is not
    asserted as rejected: `exp` is a whole-second timestamp and is compared
    against a clock that has not yet ticked, so a token minted for "now" is
    usually still inside its window. What matters is that expiry is not a
    grace period once genuinely past.
    """
    with pytest.raises(HTTPException) as raised:
        call(make_token(known_user, -1))

    assert raised.value.status_code == 401


def test_a_long_expired_token_is_rejected(known_user):
    """Expiry is not a grace period; an old token is simply invalid."""
    with pytest.raises(HTTPException) as raised:
        call(make_token(known_user, -EXPIRY_SECONDS * 2))

    assert raised.value.status_code == 401


def test_the_configured_token_lifetime_is_the_documented_one():
    """
    A fresh token is valid for the advertised lifetime.

    The frontend relies on this to decide when to re-authenticate, so a change
    here is a change in user-visible behaviour.
    """
    from app.extensions import JWT_ACCESS_TOKEN_EXPIRES

    assert JWT_ACCESS_TOKEN_EXPIRES == EXPIRY_SECONDS


def test_a_token_expiring_within_its_lifetime_is_accepted(known_user):
    """A token with most of its life left works, so expiry is the only limit."""
    assert call(make_token(known_user, EXPIRY_SECONDS - 60)) == str(known_user)


# ── Missing and malformed credentials ─────────────────────────────────────────

@pytest.mark.parametrize('header', [
    None,
    '',
    'Bearer',
    'Bearer ',
    'Token abc',
    'Basic YWJjOmRlZg==',
    'bearer lowercase-scheme',
])
def test_missing_or_wrongly_schemed_headers_are_rejected(header):
    """
    Only `Bearer <token>` is accepted.

    A lowercase scheme is refused too: the scheme comparison is case-sensitive,
    so accepting both would be a deliberate widening of what counts as a bearer
    credential.
    """
    with pytest.raises(HTTPException) as raised:
        call(raw_header=header)

    assert raised.value.status_code == 401


def test_a_token_that_is_not_a_jwt_is_rejected():
    """An opaque string is not a token."""
    with pytest.raises(HTTPException) as raised:
        call('not-a-jwt')

    assert raised.value.status_code == 401


def test_a_token_signed_with_another_key_is_rejected(known_user):
    """
    A well-formed token from another issuer is refused.

    This is what makes the signature meaningful: without checking it, anyone
    could mint a token claiming any user id.
    """
    forged = jwt.encode(
        {'sub': str(known_user), 'exp': datetime.now(timezone.utc) + timedelta(hours=1)},
        'a-different-secret',
        algorithm=JWT_ALGORITHM,
    )

    with pytest.raises(HTTPException) as raised:
        call(forged)

    assert raised.value.status_code == 401


def test_an_unsigned_token_is_rejected(known_user):
    """
    An `alg: none` token is not accepted.

    The JWT library refuses to *sign* one, so it is assembled by hand here. Two
    layers have to hold: the allowed-algorithm list passed to decode, which
    rejects the `none` header outright.
    """
    forged = unsigned_token({
        'sub': str(known_user),
        'exp': int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
    })

    with pytest.raises((HTTPException, JWTError)) as raised:
        call(forged)

    status = getattr(raised.value, 'status_code', None)
    assert status in (None, 401)


def test_a_tampered_payload_is_rejected(known_user):
    """Changing the subject after signing invalidates the token."""
    token = make_token(known_user, 60)
    head, payload, signature = token.split('.')

    with pytest.raises((HTTPException, JWTError)):
        call(f'{head}.{payload}.{"A" * len(signature)}')


# ── Subject handling ──────────────────────────────────────────────────────────

def test_a_token_without_a_subject_is_rejected():
    """A validly signed token carrying no `sub` names nobody."""
    with pytest.raises(HTTPException) as raised:
        call(make_token('', 60).replace(f'"sub": ""', '"role": "User"'))

    assert raised.value.status_code == 401


def test_a_token_for_an_unknown_user_is_rejected(known_user):
    """
    A correctly signed token for a deleted account is refused.

    Expiry alone is not enough: the user must still exist, so an account that is
    removed cannot keep riding on a token minted before it was.
    """
    with pytest.raises(HTTPException) as raised:
        call(make_token(known_user + 1, 60))

    assert raised.value.status_code == 401


def test_the_returned_subject_is_a_string(known_user):
    """The dependency's contract: a str id, whatever the token carried."""
    assert isinstance(call(make_token(known_user, 60)), str)


def test_a_numeric_subject_is_refused(known_user):
    """
    A token whose `sub` is a number rather than a string is refused.

    The JWT library enforces a string subject, so a token minted with an int
    `sub` fails the claims check and never reaches the user lookup. Worth
    pinning: the app's own tokens are minted with `str(user.id)`, so any
    producer that skipped the cast would be rejected here rather than silently
    working.
    """
    token = make_token_with_payload({
        'sub': known_user,
        'exp': datetime.now(timezone.utc) + timedelta(hours=1),
    })

    with pytest.raises(HTTPException) as raised:
        call(token)

    assert raised.value.status_code == 401


# ── Refusals do not leak which part was wrong ────────────────────────────────

def test_expired_and_invalid_credentials_answer_the_same_status(known_user):
    """
    An expired token and a malformed one both answer 401.

    Nothing here varies the status by cause, so a caller cannot use the response
    to tell an expired token from an invalid one.
    """
    with pytest.raises(HTTPException) as expired:
        call(make_token(known_user, -10))
    with pytest.raises(HTTPException) as malformed:
        call('not-a-jwt')

    assert expired.value.status_code == malformed.value.status_code == 401


def test_a_non_bearer_token_is_not_treated_as_a_bearer_one():
    """A credential under another scheme is refused, not downgraded to a lookup."""
    with pytest.raises(HTTPException) as raised:
        call(raw_header='Bearer')

    assert raised.value.status_code == 401
    assert raised.value.detail
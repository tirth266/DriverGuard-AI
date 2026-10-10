"""
extra_settings is a client-supplied blob echoed straight back to the client.

It is stored verbatim and then spread into the settings response, last, so a key
named `id` or `user_id` would overwrite the real ones and the API would report
an identity that is not this row's. The row itself was never affected — the
overwrite happened in the projection — but a response that lies about which
settings record it is describing cannot be reasoned about.

Run from the `backend` directory:  python -m pytest tests/test_settings_integrity.py -v
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.auth.controller as auth_controller
from app.auth.controller import get_current_user_id
from app.settings.routes import settings_router
from app.extensions import SessionLocal
from app.models import UserSettings


def make_settings(user_id: int, extra: dict) -> dict:
    """
    Store an extra_settings blob and report what the projection makes of it.

    The projection is computed while the row is still bound to a session; a row
    returned from a closed session cannot be read afterwards.
    """
    session = SessionLocal()
    try:
        row = UserSettings(user_id=user_id)
        row.set_extra(extra)
        session.add(row)
        session.commit()
        return {
            'row_id': row.id,
            'user_id': row.user_id,
            'drowsiness_sensitivity': row.drowsiness_sensitivity,
            'voice_alerts_enabled': row.voice_alerts_enabled,
            'email_digest_enabled': row.email_digest_enabled,
            'reported': row.to_dict(),
            'stored': row.get_extra(),
        }
    finally:
        session.close()


@pytest.fixture
def api(db):
    app = FastAPI()
    app.include_router(settings_router)
    app.dependency_overrides[get_current_user_id] = lambda: '1'
    with TestClient(app) as client:
        yield client


def test_extra_settings_cannot_report_a_false_identity(db):
    from conftest import make_user

    user = make_user(db, 'settings@example.com', 'Settings')
    db.commit()
    row = make_settings(user.id, {'id': 999, 'user_id': 888})

    reported = row['reported']

    assert reported['id'] == row['row_id']
    assert reported['user_id'] == user.id
    assert reported['id'] != 999
    assert reported['user_id'] != 888


def test_extra_settings_cannot_override_the_named_columns(db):
    from conftest import make_user

    user = make_user(db, 'columns@example.com', 'Columns')
    db.commit()
    row = make_settings(user.id, {
        'drowsiness_sensitivity': 'Spoofed',
        'voice_alerts_enabled': False,
        'email_digest_enabled': False,
        'created_at': '1999-01-01',
        'updated_at': '1999-01-01',
    })

    reported = row['reported']

    assert reported['drowsiness_sensitivity'] == row['drowsiness_sensitivity']
    assert reported['voice_alerts_enabled'] == row['voice_alerts_enabled']
    assert reported['email_digest_enabled'] == row['email_digest_enabled']
    assert reported['created_at'] != '1999-01-01'
    assert reported['updated_at'] != '1999-01-01'


def test_ordinary_extra_settings_are_still_returned(db):
    """Only reserved names are dropped. The blob is still the client's."""
    from conftest import make_user

    user = make_user(db, 'extra@example.com', 'Extra')
    db.commit()
    row = make_settings(user.id, {'theme': 'dark', 'retention_days': 30})

    reported = row['reported']

    assert reported['theme'] == 'dark'
    assert reported['retention_days'] == 30


def test_the_stored_blob_is_untouched(db):
    """
    Filtering happens in the projection. What the client sent is still stored,
    so the stored record stays a faithful record of what was written.
    """
    from conftest import make_user

    user = make_user(db, 'stored@example.com', 'Stored')
    db.commit()
    row = make_settings(user.id, {'id': 999, 'theme': 'dark'})

    assert row['stored']['id'] == 999
    assert row['stored']['theme'] == 'dark'


def test_the_round_trip_through_the_api_does_not_leak_reserved_keys(api, db):
    from conftest import make_user

    user = make_user(db, 'roundtrip@example.com', 'Round Trip')
    db.commit()
    api.app.dependency_overrides[get_current_user_id] = lambda: str(user.id)

    api.put('/api/settings', json={'extra_settings': {'id': 999, 'user_id': 888, 'theme': 'dark'}})
    body = api.get('/api/settings').json()['settings']

    assert body['id'] != 999
    assert body['user_id'] != 888
    assert body['user_id'] == user.id
    assert body['theme'] == 'dark'
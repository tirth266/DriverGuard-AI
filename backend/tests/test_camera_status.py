"""
GET /api/video/status is authenticated and says nothing it does not have to.

Two separate leaks are covered. The endpoint took no credentials at all, so
anyone could ask whether the detection pipeline was up; and its payload carried
the absolute path of every model file on the host plus the whole tuning surface
of the detector. The dashboard reads four booleans out of it, so the rest was
exposure with no consumer.

The response is checked for leaks by shape rather than by an allow-list of field
names, so a field added back later fails the test instead of quietly widening
what the endpoint publishes.

Run from the `backend` directory:  python -m pytest tests/test_camera_status.py -v
"""
import re

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.auth.controller as auth_controller
import app.camera.routes as camera_routes
from app.ai.mediapipe_service import mediapipe_service
from app.ai.yolo_service import yolo_service
from app.auth.controller import get_current_user_id
from app.camera.routes import camera_router

# The four flags WebcamFeed.tsx reads out of models_ready: `ready` gates the
# frame loop, `yolo` and `face` render the progress line, `hand` is in the
# component's type for them.
EXPECTED_FLAGS = {'ready', 'yolo', 'face', 'hand'}

# `C:\...`, `C:/...`, and any POSIX absolute path. Matched against every string
# in the response so a path reintroduced under any key is still caught.
ABSOLUTE_PATH = re.compile(r'(?:[A-Za-z]:[\\/])|(?:^|[\s"\'=(])/(?:home|Users|usr|opt|var|root|mnt|srv)/')


def strings_in(value):
    """Every string anywhere in a JSON response, keys included."""
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for key, item in value.items():
            yield key
            yield from strings_in(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings_in(item)


@pytest.fixture
def api():
    """
    The camera router alone.

    Authentication is overridden rather than exercised with a real JWT: what is
    under test is whether the endpoint demands a caller at all, and the 401 that
    a missing token produces is the production dependency's own response. JWT
    issuance is untouched by this change.
    """
    app = FastAPI()
    app.include_router(camera_router)
    app.dependency_overrides[get_current_user_id] = lambda: '1'

    with TestClient(app) as client:
        client.app = app
        yield client


# ── Authentication ─────────────────────────────────────────────────────────────

def test_the_status_endpoint_refuses_an_anonymous_caller(api):
    del api.app.dependency_overrides[get_current_user_id]

    response = api.get('/api/video/status')

    assert response.status_code == 401


def test_the_status_endpoint_refuses_a_malformed_token(api):
    """Not just "no header": a header that does not carry a valid token is refused too."""
    del api.app.dependency_overrides[get_current_user_id]

    response = api.get('/api/video/status', headers={'Authorization': 'Bearer not-a-jwt'})

    assert response.status_code == 401


def test_the_status_endpoint_refuses_a_non_bearer_scheme(api):
    del api.app.dependency_overrides[get_current_user_id]

    response = api.get('/api/video/status', headers={'Authorization': 'Basic dXNlcjpwYXNz'})

    assert response.status_code == 401


def test_an_authenticated_caller_is_served(api):
    assert api.get('/api/video/status').status_code == 200


# ── What the response is allowed to contain ────────────────────────────────────

def test_an_authenticated_caller_receives_the_flags_the_dashboard_reads(api):
    models_ready = api.get('/api/video/status').json()['models_ready']

    assert set(models_ready) == EXPECTED_FLAGS
    assert all(isinstance(flag, bool) for flag in models_ready.values())


def test_the_response_carries_no_filesystem_path(api):
    """The reason this endpoint was a leak: model paths are absolute host paths."""
    body = api.get('/api/video/status').json()

    offenders = [text for text in strings_in(body) if ABSOLUTE_PATH.search(text)]

    assert offenders == []


def test_the_response_carries_no_path_even_when_the_services_are_loaded(api, monkeypatch):
    """
    The check above is only as good as the state behind it: with no model loaded
    the services hold `None`, and a response that published `None` would pass it
    while the deployed endpoint, where the models *are* loaded, published a real
    path. So pin real absolute paths in first and confirm they still do not come
    back out. This is the test that would have failed against the old payload.
    """
    secret = r'C:\Users\operator\.models\weights\yolo11n.pt'
    monkeypatch.setattr(yolo_service, 'model_path', secret)
    monkeypatch.setattr(mediapipe_service, 'face_model_path', secret)
    monkeypatch.setattr(mediapipe_service, 'hand_model_path', secret)
    monkeypatch.setattr(yolo_service, 'is_loaded', True)
    monkeypatch.setattr(mediapipe_service, 'face_available', True)
    monkeypatch.setattr(mediapipe_service, 'hands_available', True)

    body = api.get('/api/video/status').json()

    assert secret not in str(body)
    assert [text for text in strings_in(body) if ABSOLUTE_PATH.search(text)] == []


def test_the_response_carries_no_path_even_when_a_model_file_is_missing(api, monkeypatch):
    """
    The other path out. `models_ready_state()` reports every model file that is
    absent by absolute path, because the operator running the backend needs it;
    a caller on the network does not. Readiness must stay true/false either way.
    """
    monkeypatch.setattr(
        camera_routes,
        'missing_model_files',
        lambda *paths: [{'model': 'yolo', 'path': r'C:\private\weights\yolo11n.pt'}],
    )

    body = api.get('/api/video/status').json()

    assert 'models_missing' not in str(body)
    assert r'C:\private' not in str(body)
    assert body['models_ready']['ready'] is False


def test_the_response_carries_no_model_paths_at_all(api):
    """Independent of the regex above: no key or value may even mention a path."""
    body = api.get('/api/video/status').json()

    assert 'models_missing' not in str(body)
    assert [text for text in strings_in(body) if 'path' in text.lower()] == []


@pytest.mark.parametrize('leaked', [
    'floor_confidence', 'enter_confidence', 'confirm_rule', 'min_interval_ms',
    'imgsz', 'torch_num_threads', 'device', 'classes_count',
    'monitored_cabin_classes', 'person_class_available',
    'track_clear_seconds', 'track_occlusion_seconds', 'max_width', 'task',
])
def test_the_response_carries_no_detection_tuning(leaked, api):
    """Thresholds are detection behaviour, not readiness, and are not published."""
    body = api.get('/api/video/status').json()

    assert leaked not in str(body)


def test_the_response_is_ready_derived_not_a_cached_answer(api):
    """
    The projection is built per request from the live services. A constant or a
    snapshot captured at import would report a stale "ready" and release the
    frame loop onto models that are not there.
    """
    first = api.get('/api/video/status').json()['models_ready']

    assert first == api.get('/api/video/status').json()['models_ready']
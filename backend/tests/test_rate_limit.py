"""
Rate limiting: the configured limits are enforced, and live monitoring is not
one of the things they throttle.

The app under test is assembled the way `create_app` assembles the real one --
limiter on `app.state`, `SlowAPIMiddleware` installed, `RateLimitExceeded`
handled -- because a limiter that is configured but never installed is exactly
the defect this file guards against, and a test that skipped the middleware
would pass against the broken build.

The limiter is a module-level singleton over in-memory storage keyed by remote
address, and every request here comes from the same TestClient address, so the
counters are shared across the whole module. Each test resets the storage and
stays inside a single one-minute window; a window that rolled over mid-test
would reset the counters and hide the very 429 being looked for.

Run from the `backend` directory:  python -m pytest tests/test_rate_limit.py -v
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

import app.auth.controller as auth_controller
from app.auth.routes import auth_router
from app.camera.routes import camera_router
from app.notifications.routes import notifications_router
from app.rate_limit import (
    CAMERA_STATUS_LIMIT,
    DEFAULT_LIMITS,
    FRAME_LIMIT,
    LOGIN_LIMIT,
    NOTIFICATION_LIMIT,
    limiter,
)

# What the frontend actually puts on the wire, from WebcamFeed.tsx.
FRAME_INTERVAL_MS = 50          # 20 FPS
STATUS_POLL_INTERVAL_MS = 300   # engine readiness poll while models warm up
WARM_UP_BUDGET_MS = 60_000


def allowed(limit: str) -> int:
    """
    The number of requests a limit string admits, so the tests follow the
    constants rather than a copy of the numbers that could drift from them.
    """
    return int(limit.split('/')[0])


def fill_window(client: TestClient, method: str, path: str, limit: str, **kwargs) -> list:
    """
    Sends `allowed(limit)` requests and returns their statuses.

    None of them may be 429. What the endpoint answers with instead -- 503 for a
    cold frame pipeline, 500 for a login with no user store -- is irrelevant
    here: the limiter runs before the handler, so a status that is not 429 is
    proof the request got through.
    """
    statuses = [getattr(client, method)(path, **kwargs) for _ in range(allowed(limit))]
    assert 429 not in statuses, f'{path} was throttled inside its own {limit} budget'
    return statuses


@pytest.fixture
def api():
    limiter.reset()

    application = FastAPI()
    application.state.limiter = limiter
    application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    application.add_middleware(SlowAPIMiddleware)
    application.include_router(auth_router)
    application.include_router(notifications_router)
    application.include_router(camera_router)

    # The limits are keyed by remote address and asserted before authentication,
    # so an identity override is enough to get past the handler and show that
    # the limiter, not the auth dependency, is what refused a request.
    application.dependency_overrides[auth_controller.get_current_user_id] = lambda: '1'

    @application.get('/api/undlimited-by-hand')
    def undecorated():
        """A route with no @limiter.limit, so only the global default can bound it."""
        return {'success': True}

    with TestClient(application) as test_client:
        yield test_client


# ── The global default is actually enforced ─────────────────────────────────────

def test_an_undecorated_route_is_bounded_by_the_global_default(api):
    """Without SlowAPIMiddleware the default_limits were configured but never checked."""
    default = DEFAULT_LIMITS[0]
    fill_window(api, 'get', '/api/undlimited-by-hand', default)

    assert api.get('/api/undlimited-by-hand').status_code == 429


def test_the_default_is_replaced_rather_than_added_for_a_limited_route(api):
    """
    A @limiter.limit decorator overrides the global default for that route, so
    the tight login limit does not also have to fit inside 100 requests.
    """
    assert allowed(LOGIN_LIMIT) < allowed(DEFAULT_LIMITS[0])

    fill_window(api, 'post', '/api/auth/login', LOGIN_LIMIT, json={})
    assert api.post('/api/auth/login', json={}).status_code == 429


# ── Explicit endpoint limits ───────────────────────────────────────────────────

def test_login_is_capped_at_ten_per_minute(api):
    fill_window(api, 'post', '/api/auth/login', LOGIN_LIMIT,
                json={'email': 'someone@example.com', 'password': 'wrong'})

    assert api.post('/api/auth/login',
                    json={'email': 'someone@example.com', 'password': 'wrong'}).status_code == 429


NOTIFICATION_BODIES = {
    '/api/notifications/send': {
        'to': 'someone@example.com', 'subject': 'Hi', 'body': 'There',
    },
    '/api/notifications/invite-driver': {
        'email': 'driver@example.com', 'driver_name': 'Driver',
        'invitation_link': 'https://example.com/join', 'company_name': 'Alpha',
    },
    '/api/notifications/ride-report': {
        'email': 'driver@example.com', 'driver_name': 'Driver', 'ride_summary': {},
    },
    '/api/notifications/safety-alert': {
        'email': 'driver@example.com', 'driver_name': 'Driver',
        'alert_type': 'phone', 'vehicle': 'ALPHA-1', 'timestamp': '2026-01-01T00:00:00Z',
    },
}


@pytest.mark.parametrize('path', sorted(NOTIFICATION_BODIES))
def test_each_notification_post_is_capped_at_twenty_per_minute(api, path):
    body = NOTIFICATION_BODIES[path]
    fill_window(api, 'post', path, NOTIFICATION_LIMIT, json=body)

    assert api.post(path, json=body).status_code == 429


# ── Live monitoring keeps its headroom ──────────────────────────────────────────

def test_a_full_minute_of_twenty_fps_monitoring_is_not_throttled(api):
    """
    The load the dashboard actually generates: one frame every 50 ms for a
    minute. None of it may be refused, which is what the global default at
    100/minute would have done after five seconds.
    """
    frames_per_minute = 60_000 // FRAME_INTERVAL_MS
    assert frames_per_minute <= allowed(FRAME_LIMIT)

    statuses = [
        api.post('/api/video/process_frame', json={'frame': None, 'ride_id': None}).status_code
        for _ in range(frames_per_minute)
    ]

    assert 429 not in statuses


def test_the_frame_ceiling_is_its_own_and_not_the_default(api):
    """
    Frames have to be bounded by something, or "no 429" would only mean the
    limiter is not installed. The first request past FRAME_LIMIT is refused,
    which also pins the ceiling at FRAME_LIMIT and well above the default.
    """
    assert allowed(FRAME_LIMIT) > allowed(DEFAULT_LIMITS[0])

    fill_window(api, 'post', '/api/video/process_frame', FRAME_LIMIT,
                json={'frame': None, 'ride_id': None})

    refused = api.post('/api/video/process_frame', json={'frame': None, 'ride_id': None})
    assert refused.status_code == 429


def test_the_status_poll_that_gates_monitoring_is_not_throttled(api):
    """
    WebcamFeed polls /api/video/status every 300 ms while the models warm up and
    gives up after a minute. The frame loop waits on that poll, so throttling it
    would stall startup, not just slow it down.
    """
    polls = WARM_UP_BUDGET_MS // STATUS_POLL_INTERVAL_MS
    assert polls <= allowed(CAMERA_STATUS_LIMIT)

    statuses = [api.get('/api/video/status').status_code for _ in range(polls)]

    assert 429 not in statuses


# ── Installing the middleware must not change anything else ─────────────────────

def test_the_middleware_leaves_the_frame_body_intact(api):
    """
    SlowAPIMiddleware sits in front of every request, so a middleware that
    swallowed the body would break frame decoding in a way no rate-limit
    assertion would notice: the endpoint would keep answering, just blind.
    A body that fails validation can only fail validation if it was read.
    """
    response = api.post('/api/video/process_frame',
                        json={'frame': 'aGVsbG8=', 'ride_id': 'not-an-integer'})

    assert response.status_code == 422
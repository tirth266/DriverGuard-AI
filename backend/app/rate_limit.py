"""
The shared SlowAPI rate limiter.

It lives here rather than in app/__init__.py because every router decorates its
endpoints with it at import time, and app/__init__.py is the module that imports
those routers -- reaching back into it for the limiter would be circular.

A Limiter only takes effect once it is both on app.state.limiter and installed
as SlowAPIMiddleware; app/__init__.py does both. The middleware applies
DEFAULT_LIMITS to every route, and a @limiter.limit decorator replaces that
default for the route it sits on, so a high-frequency endpoint has to carry its
own decorator or the global default will throttle it.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Every route that carries no decorator of its own.
DEFAULT_LIMITS = ["100/minute"]

# Credentials: tight enough that a password spray against one address runs out
# long before it can be useful.
LOGIN_LIMIT = "10/minute"

# Outbound mail. Nothing in the frontend calls these, so the ceiling is there to
# stop one authenticated session turning the SMTP credentials into a spam pump.
NOTIFICATION_LIMIT = "20/minute"

# Live monitoring posts a frame every 50 ms, which is 1200 a minute by itself, so
# the global default would cut a healthy feed off within seconds. The ceiling is
# roughly double that, leaving room for a second viewer and for reconnect bursts.
FRAME_LIMIT = "2000/minute"

# /api/video/status is polled every 300 ms while the models warm up, for up to a
# minute, so the same global default would throttle the readiness poll it exists
# to support.
CAMERA_STATUS_LIMIT = "1200/minute"

limiter = Limiter(key_func=get_remote_address, default_limits=DEFAULT_LIMITS)
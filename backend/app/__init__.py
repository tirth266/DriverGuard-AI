import os
import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.config import get_config
from app.rate_limit import limiter
from app.auth import auth_router
from app.camera.routes import camera_router
from app.ride.routes import ride_router
from app.fleet.routes import fleet_router
from app.settings.routes import settings_router
from app.notifications.routes import notifications_router

logger = logging.getLogger(__name__)


def warm_yolo(settings) -> None:
    """
    Load and warm YOLO. Runs off the event loop.

    Importing torch and ultralytics and running the first throwaway inference
    costs several seconds of CPU. Ultralytics' import probes DNS for an online
    check unless YOLO_OFFLINE is set, so it is set here, before the import: this
    backend loads local files only and never reaches the network.
    """
    os.environ.setdefault("YOLO_OFFLINE", "true")

    try:
        # Bound the inference thread budget before any model runs.
        from app.opencv.processor import configure_torch_threads
        threads = configure_torch_threads()
        logger.info(f"Torch inference threads = {threads}")
    except Exception as e:
        logger.error(f"[Warmup] Failed to configure torch threads: {e}")

    try:
        from app.ai.yolo_service import yolo_service
        yolo_service.load_model(settings.YOLO_MODEL_PATH)
        yolo_service.warmup()
    except Exception as e:
        logger.error(f"[YOLO] Failed to initialize YOLO model on startup: {e}")


def warm_mediapipe(settings) -> None:
    """
    Load and warm MediaPipe. Runs off the event loop.

    Importing mediapipe (which pulls the TensorFlow client) and building the two
    landmarkers is the longest single phase of startup. The face and hand
    landmarkers are created one after the other: they share the TFLite runtime
    and must not run concurrently.
    """
    from app.ai.mediapipe_service import mediapipe_service as _mp_singleton

    try:
        face_path = settings.MEDIAPIPE_FACE_MODEL_PATH
        hand_path = settings.MEDIAPIPE_HAND_MODEL_PATH

        # The one and only landmarker load, with resolved config paths.
        _mp_singleton.__init__(face_model_path=face_path, hand_model_path=hand_path)

        face_ok = _mp_singleton.face_available
        hand_ok = _mp_singleton.hands_available
        available = face_ok or hand_ok

        logger.info(f"MediaPipe available = {str(available).lower()}")
        print(f"MediaPipe available = {str(available).lower()}")
        if face_ok:
            logger.info("FaceLandmarker loaded")
            print("FaceLandmarker loaded")
        else:
            logger.warning(f"[MediaPipe] FaceLandmarker NOT loaded — check MEDIAPIPE_FACE_MODEL_PATH ({face_path})")
            print(f"[MediaPipe] FaceLandmarker NOT loaded — check MEDIAPIPE_FACE_MODEL_PATH ({face_path})")
        if hand_ok:
            logger.info("HandLandmarker loaded")
            print("HandLandmarker loaded")
        else:
            logger.warning(f"[MediaPipe] HandLandmarker NOT loaded — check MEDIAPIPE_HAND_MODEL_PATH ({hand_path})")
            print(f"[MediaPipe] HandLandmarker NOT loaded — check MEDIAPIPE_HAND_MODEL_PATH ({hand_path})")

        # One throwaway inference so the first real frame is not the slowest.
        _mp_singleton.warmup()
    except Exception as mp_err:
        logger.error(f"[MediaPipe] Startup initialization failed: {mp_err}")
        print(f"[MediaPipe] Startup initialization failed: {mp_err}")


def load_models(settings) -> None:
    """
    Load and warm every detection model. Runs off the event loop.

    Loading YOLO and MediaPipe, binding the torch thread budget and running the
    first throwaway inference of each costs many seconds of CPU. Doing that
    inside the lifespan would keep the server from accepting a single request
    until it finished, which is what made the monitoring page sit on
    "Detection service unreachable" for the whole warm-up. Readiness is exposed
    through /api/video/status instead, and process_frame refuses fast until the
    models are usable.

    The two chains run one after the other on purpose. Measured on this machine
    (4 cores, ~2 GB free RAM), running them in two workers at once doubled the
    duration of both (14.7s -> 28.9s for YOLO, 13.4s -> 28.1s for MediaPipe)
    because the two heavyweight imports contend for memory bandwidth and start
    paging, so it saved nothing.
    """
    from app.opencv.processor import mark_warmup_finished

    try:
        warm_yolo(settings)
        warm_mediapipe(settings)
    finally:
        # Even a failed chain must release process_frame, which then refuses with
        # "not_ready" instead of blocking the caller on a model that is not there.
        mark_warmup_finished()


def create_app(config_class=None) -> FastAPI:
    """Application factory for FastAPI app."""

    if config_class is None:
        config_class = get_config()
    settings = config_class()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Initialize UserStore (SQLAlchemy - Persistent)
        try:
            from app.auth.storage import set_user_store
            from app.auth.sqlalchemy_store import SQLAlchemyUserStore
            from app.extensions import SessionLocal, Base, engine
            from app.models import (  # noqa: F401
                Company,
                Driver,
                Vehicle,
                Ride,
                RideEvent,
                ensure_ride_summary_columns,
                ensure_personal_ride_columns,
            )

            # Create tables if they don't exist
            if engine:
                Base.metadata.create_all(bind=engine)
                # create_all only creates missing tables, so an existing database
                # has to be brought up to the current `rides` shape separately.
                ensure_ride_summary_columns(engine)
                # A personal ride has no company, driver or vehicle of its own, so
                # those three columns cannot stay NOT NULL.
                ensure_personal_ride_columns(engine)
            
            set_user_store(SQLAlchemyUserStore())
            logger.info("UserStore initialized (SQLAlchemy - Persistent)")
        except Exception as e:
            logger.error(f"[UserStore] Failed to initialize: {e}")

        # Models load in the background: the server accepts requests from here on
        # and reports readiness through /api/video/status.
        warmup_thread = threading.Thread(
            target=load_models,
            args=(settings,),
            name="dg-warmup",
            daemon=True,
        )
        warmup_thread.start()
        logger.info("Model warm-up started in the background")

        yield

        # Cleanup UserStore session
        try:
            from app.auth.storage import get_user_store
            store = get_user_store()
            if hasattr(store, 'close'):
                store.close()
        except Exception:
            pass

        # Cleanup MediaPipe resources
        try:
            from app.ai.mediapipe_service import mediapipe_service
            mediapipe_service.close()
        except Exception as e:
            logger.warning(f"[MediaPipe] Cleanup failed: {e}")

        warmup_thread.join(timeout=5)


    app = FastAPI(
        title="DriverGuard AI API",
        lifespan=lifespan,
    )

    # Rate limiting. The limiter enforces nothing until it is both reachable from
    # app.state.limiter and installed as middleware: the state entry is what the
    # @limiter.limit decorators and the exception handler look up, and the
    # middleware is what applies DEFAULT_LIMITS to every route that has no
    # decorator of its own. Added before CORS so CORS stays the outer layer and
    # a 429 still reaches the browser with its headers.
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    # ── Session Middleware (required for Google OAuth CSRF state) ─────────
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.SECRET_KEY,
    )

    # ── CORS ──────────────────────────────────────────────────────────────
    frontend_url = settings.FRONTEND_URL
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
    ]
    if frontend_url:
        for url in frontend_url.split(","):
            cleaned = url.strip()
            if cleaned and cleaned not in allowed_origins:
                allowed_origins.append(cleaned)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────
    app.include_router(auth_router)
    app.include_router(camera_router)
    app.include_router(ride_router)
    app.include_router(fleet_router)
    app.include_router(settings_router)
    app.include_router(notifications_router)

    # ── Root endpoint — health check ──────────────────────────────────────
    @app.get('/')
    def root():
        return {
            'status': 'success',
            'message': 'Backend is running',
            'service': 'DriverGuard AI Python FastAPI',
            'environment': settings.APP_ENV,
        }

    # ── Favicon handler ───────────────────────────────────────────────────
    @app.get('/favicon.ico', status_code=204)
    def favicon():
        return None

    # ── Health check endpoint ─────────────────────────────────────────────
    @app.get('/api/health')
    def health_check():
        return {
            'status': 'online',
            'service': 'DriverGuard AI Python FastAPI',
            'environment': settings.APP_ENV,
        }

    return app

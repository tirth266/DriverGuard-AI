import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import get_config
from app.extensions import engine, Base
from app.auth import auth_router
from app.camera.routes import camera_router

logger = logging.getLogger(__name__)


def create_app(config_class=None) -> FastAPI:
    """Application factory for FastAPI app."""

    if config_class is None:
        config_class = get_config()
    settings = config_class()

    # ── Create all database tables on startup ─────────────────────────────
    # Import models so Base knows about them before create_all
    from app.models.user import User  # noqa: F401

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created / verified.")

        # Load YOLO11 model ONCE at backend startup
        try:
            from app.ai.yolo_service import yolo_service
            yolo_service.load_model(settings.YOLO_MODEL_PATH)
        except Exception as e:
            logger.error(f"[YOLO] Failed to initialize YOLO model on startup: {e}")

        yield


    app = FastAPI(
        title="DriverGuard AI API",
        lifespan=lifespan,
    )

    # ── Session Middleware (required for Google OAuth CSRF state) ─────────
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.SECRET_KEY,
    )

    # ── CORS ──────────────────────────────────────────────────────────────
    frontend_url = settings.FRONTEND_URL
    allowed_origins = [
        frontend_url,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
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

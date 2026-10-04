import os
from dotenv import load_dotenv

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_path = os.path.join(_backend_dir, ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
load_dotenv()


class Config:
    # ── App ────────────────────────────────────────────────────────────────
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-prod")
    APP_ENV: str = os.environ.get("FLASK_ENV", "development")

    # ── Database ───────────────────────────────────────────────────────────
    # NOTE: Required for authentication (register, login, Google OAuth, user lookup).
    # Set DATABASE_URL in environment. No default SQLite to avoid implicit file creation.
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

    # ── JWT ────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET", "jwt-secret-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES: int = 7 * 24 * 60 * 60  # 7 days in seconds

    # ── CORS ───────────────────────────────────────────────────────────────
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    BACKEND_URL: str = os.environ.get("BACKEND_URL", "http://localhost:5000")

    # ── Google OAuth 2.0 ───────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_CALLBACK_URL: str = os.environ.get(
        "GOOGLE_CALLBACK_URL",
        "http://localhost:5000/api/auth/google/callback",
    )
    GOOGLE_DISCOVERY_URL: str = (
        "https://accounts.google.com/.well-known/openid-configuration"
    )

    # ── YOLO11 AI Monitoring (Object Detection) ───────────────────────────
    YOLO_MODEL_PATH: str = os.environ.get(
        "YOLO_MODEL_PATH",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models", "trained", "yolo11", "detection", "best.pt")
    )
    # NOTE: per-class detection confidences live in app.ai.yolo_service
    # (PHONE_CONF_THRESHOLD / CABIN_CONF_THRESHOLD) so they stay next to the
    # monitored class list they gate.

    # ── MediaPipe Tasks Vision (Face & Hand Landmarkers) ──────────────────
    MEDIAPIPE_FACE_MODEL_PATH: str = os.environ.get(
        "MEDIAPIPE_FACE_MODEL_PATH",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models", "mediapipe", "face_landmarker.task")
    )
    MEDIAPIPE_HAND_MODEL_PATH: str = os.environ.get(
        "MEDIAPIPE_HAND_MODEL_PATH",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models", "mediapipe", "hand_landmarker.task")
    )



class DevelopmentConfig(Config):
    DEBUG: bool = True


class ProductionConfig(Config):
    DEBUG: bool = False


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}


def get_config() -> type[Config]:
    env = os.environ.get("FLASK_ENV", "development")
    return config_map.get(env, DevelopmentConfig)

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── Flask ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-prod")
    FLASK_ENV: str = os.environ.get("FLASK_ENV", "development")

    # ── Database ───────────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI: str = os.environ.get(
        "DATABASE_URL", "sqlite:///driverguard.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

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

    # ── Session Cookie Settings (CSRF State Preservation) ───────────────────
    SESSION_COOKIE_NAME: str = "driverguard_session"
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "Lax"
    PERMANENT_SESSION_LIFETIME: int = 3600  # 1 hour


class DevelopmentConfig(Config):
    DEBUG: bool = True
    # HTTP for localhost in development mode
    SESSION_COOKIE_SECURE: bool = False


class ProductionConfig(Config):
    DEBUG: bool = False
    # Force HTTPS cookies in production
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "Lax"


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}


def get_config() -> type[Config]:
    env = os.environ.get("FLASK_ENV", "development")
    return config_map.get(env, DevelopmentConfig)

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── App ────────────────────────────────────────────────────────────────
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-prod")
    APP_ENV: str = os.environ.get("FLASK_ENV", "development")

    # ── Database ───────────────────────────────────────────────────────────
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL", "sqlite:///driverguard.db"
    )

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

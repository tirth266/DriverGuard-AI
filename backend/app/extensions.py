"""
Shared database and JWT configuration.
Replaces Flask-SQLAlchemy, Flask-JWT-Extended, and Flask-Cors extension instances.

NOTE: Database is required for authentication (register, login, Google OAuth, user lookup).
Set DATABASE_URL environment variable. No default SQLite to avoid implicit file creation.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_path = os.path.join(_backend_dir, ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
load_dotenv()

# ── Database ──────────────────────────────────────────────────────────────────
# Required for authentication. No default - must be set via DATABASE_URL env var.
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# For SQLite, connect_args is required for thread safety in FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args) if DATABASE_URL else None
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that provides a database session."""
    if not SessionLocal:
        raise RuntimeError("Database not configured. Set DATABASE_URL environment variable.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_SECRET_KEY = os.environ.get("JWT_SECRET", "jwt-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRES = 7 * 24 * 60 * 60  # 7 days in seconds

"""
Shared database and JWT configuration.
Replaces Flask-SQLAlchemy, Flask-JWT-Extended, and Flask-Cors extension instances.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///driverguard.db")

# For SQLite, connect_args is required for thread safety in FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_SECRET_KEY = os.environ.get("JWT_SECRET", "jwt-secret-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRES = 7 * 24 * 60 * 60  # 7 days in seconds

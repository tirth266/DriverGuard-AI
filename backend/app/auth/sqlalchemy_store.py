"""
SQLAlchemy implementation of UserStore.
Wraps existing User model and SessionLocal — zero behavior change.
"""
import bcrypt
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.extensions import SessionLocal
from app.models.user import User as UserModel
from app.auth.storage import UserStore, UserRecord


class SQLAlchemyUserStore(UserStore):
    """SQLAlchemy-backed user storage using existing ORM models."""

    def __init__(self, session_factory=None):
        self._session_factory = session_factory or SessionLocal
        self._session: Optional[Session] = None

    # ── Session management ──────────────────────────────────────────

    def _get_session(self) -> Session:
        if self._session is None:
            if self._session_factory is None:
                raise RuntimeError("SessionLocal not configured. Set DATABASE_URL.")
            self._session = self._session_factory()
        return self._session

    def commit(self) -> None:
        session = self._get_session()
        session.commit()

    def rollback(self) -> None:
        if self._session:
            self._session.rollback()

    def close(self) -> None:
        if self._session:
            self._session.close()
            self._session = None

    # ── Conversion ──────────────────────────────────────────────────

    @staticmethod
    def _to_record(user: UserModel) -> UserRecord:
        return UserRecord(
            id=user.id,
            name=user.name,
            email=user.email,
            password_hash=user.password_hash,
            google_id=user.google_id,
            provider=user.provider,
            role=user.role,
            account_type=user.account_type,
            company=user.company or '',
            avatar=user.avatar or '',
            profile_picture=user.profile_picture or '',
            email_verified=user.email_verified,
            is_first_login=user.is_first_login,
            company_setup_complete=user.company_setup_complete,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    # ── Lookups ─────────────────────────────────────────────────────

    def get_by_email(self, email: str) -> Optional[UserRecord]:
        session = self._get_session()
        user = session.query(UserModel).filter(UserModel.email == email.strip().lower()).first()
        return self._to_record(user) if user else None

    def get_by_id(self, user_id: int) -> Optional[UserRecord]:
        session = self._get_session()
        user = session.query(UserModel).filter(UserModel.id == user_id).first()
        return self._to_record(user) if user else None

    def get_by_google_id(self, google_id: str) -> Optional[UserRecord]:
        session = self._get_session()
        user = session.query(UserModel).filter(UserModel.google_id == google_id).first()
        return self._to_record(user) if user else None

    # ── Mutations ───────────────────────────────────────────────────

    def create(self, **fields) -> UserRecord:
        session = self._get_session()
        user = UserModel(**fields)
        session.add(user)
        session.flush()  # assign ID
        return self._to_record(user)

    def update(self, user_id: int, **fields) -> Optional[UserRecord]:
        session = self._get_session()
        user = session.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            return None
        for key, value in fields.items():
            if hasattr(user, key):
                setattr(user, key, value)
        user.updated_at = datetime.now(timezone.utc)
        session.flush()
        return self._to_record(user)

    # ── Password ────────────────────────────────────────────────────

    def verify_password(self, user: UserRecord, password: str) -> bool:
        if not user.password_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8'))

    def set_password(self, user: UserRecord, password: str) -> None:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        user.password_hash = hashed
        # Persist to ORM model in session
        session = self._get_session()
        orm_user = session.query(UserModel).filter(UserModel.id == user.id).first()
        if orm_user:
            orm_user.password_hash = hashed
            session.flush()
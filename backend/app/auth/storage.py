"""
Storage abstraction for authentication.
Defines the interface for user persistence operations.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional


@dataclass
class UserRecord:
    """Plain data container for a user — no ORM dependencies."""
    id: int
    name: str
    email: str
    password_hash: Optional[str]
    google_id: Optional[str]
    provider: str
    role: str
    account_type: Optional[str]
    company: str
    avatar: str
    profile_picture: str
    email_verified: bool
    is_first_login: bool
    company_setup_complete: bool
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    def to_dict(self) -> dict:
        """Returns JSON-serializable user dictionary (matches User.to_dict())."""
        return {
            'id': self.id,
            'name': self.name,
            'display_name': self.name,  # UserRecord doesn't have separate display_name
            'email': self.email,
            'company': self.company,
            'role': self.role,
            'google_id': self.google_id,
            'provider': self.provider,
            'avatar': self.avatar or self.profile_picture or '',
            'profile_picture': self.profile_picture or self.avatar or '',
            'email_verified': self.email_verified,
            'account_type': self.account_type,
            'is_first_login': self.is_first_login,
            'company_setup_complete': self.company_setup_complete,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class UserStore(ABC):
    """Minimal interface for auth persistence."""

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[UserRecord]:
        """Find user by email (case-insensitive)."""
        pass

    @abstractmethod
    def get_by_id(self, user_id: int) -> Optional[UserRecord]:
        """Find user by primary key."""
        pass

    @abstractmethod
    def get_by_google_id(self, google_id: str) -> Optional[UserRecord]:
        """Find user by Google OAuth ID."""
        pass

    @abstractmethod
    def create(self, **fields) -> UserRecord:
        """Create a new user record."""
        pass

    @abstractmethod
    def update(self, user_id: int, **fields) -> Optional[UserRecord]:
        """Update fields on an existing user. Returns updated record or None if not found."""
        pass

    @abstractmethod
    def verify_password(self, user: UserRecord, password: str) -> bool:
        """Verify a plaintext password against the stored hash."""
        pass

    @abstractmethod
    def set_password(self, user: UserRecord, password: str) -> None:
        """Hash and store a new password for the user."""
        pass

    @abstractmethod
    def commit(self) -> None:
        """Persist pending changes."""
        pass

    @abstractmethod
    def rollback(self) -> None:
        """Discard pending changes."""
        pass


# Default instance holder — set by app lifespan
_user_store: Optional[UserStore] = None


def get_user_store() -> UserStore:
    """FastAPI dependency: returns the configured UserStore."""
    if _user_store is None:
        raise RuntimeError("UserStore not initialized. Call set_user_store() at startup.")
    return _user_store


def set_user_store(store: UserStore) -> None:
    """Initialize the global UserStore (called once at startup)."""
    global _user_store
    _user_store = store
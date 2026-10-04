"""
In-memory implementation of UserStore.
Replaces SQLAlchemy-backed storage with a simple dict-based store.
Preserves bcrypt password hashing and all UserStore interface contracts.
"""
import bcrypt
import threading
from datetime import datetime, timezone
from typing import Optional

from app.auth.storage import UserStore, UserRecord


class MemoryUserStore(UserStore):
    """In-memory user storage using dicts — no SQL dependencies."""

    def __init__(self):
        self._users_by_id: dict[int, UserRecord] = {}
        self._users_by_email: dict[str, int] = {}  # email.lower() -> id
        self._users_by_google_id: dict[str, int] = {}  # google_id -> id
        self._next_id: int = 1
        self._lock = threading.RLock()

    # ── Session management (no-op for in-memory) ────────────────────

    def commit(self) -> None:
        """Persist pending changes — no-op for in-memory."""
        pass

    def rollback(self) -> None:
        """Discard pending changes — no-op for in-memory."""
        pass

    def close(self) -> None:
        """Close store — no-op for in-memory."""
        pass

    # ── Helpers ─────────────────────────────────────────────────────

    def _get_next_id(self) -> int:
        with self._lock:
            current = self._next_id
            self._next_id += 1
            return current

    def _index_user(self, user: UserRecord) -> None:
        self._users_by_id[user.id] = user
        self._users_by_email[user.email.lower()] = user.id
        if user.google_id:
            self._users_by_google_id[user.google_id] = user.id

    def _unindex_user(self, user: UserRecord) -> None:
        self._users_by_id.pop(user.id, None)
        self._users_by_email.pop(user.email.lower(), None)
        if user.google_id:
            self._users_by_google_id.pop(user.google_id, None)

    # ── Lookups ─────────────────────────────────────────────────────

    def get_by_email(self, email: str) -> Optional[UserRecord]:
        with self._lock:
            user_id = self._users_by_email.get(email.strip().lower())
            if user_id is None:
                return None
            return self._users_by_id.get(user_id)

    def get_by_id(self, user_id: int) -> Optional[UserRecord]:
        with self._lock:
            return self._users_by_id.get(user_id)

    def get_by_google_id(self, google_id: str) -> Optional[UserRecord]:
        with self._lock:
            user_id = self._users_by_google_id.get(google_id)
            if user_id is None:
                return None
            return self._users_by_id.get(user_id)

    # ── Mutations ───────────────────────────────────────────────────

    def create(self, **fields) -> UserRecord:
        with self._lock:
            user_id = fields.pop('id', None) or self._get_next_id()
            now = datetime.now(timezone.utc)

            user = UserRecord(
                id=user_id,
                name=fields.get('name', ''),
                email=fields.get('email', '').strip().lower(),
                password_hash=fields.get('password_hash'),
                google_id=fields.get('google_id'),
                provider=fields.get('provider', 'local'),
                role=fields.get('role', 'User'),
                account_type=fields.get('account_type'),
                company=fields.get('company', ''),
                avatar=fields.get('avatar', ''),
                profile_picture=fields.get('profile_picture', ''),
                email_verified=fields.get('email_verified', False),
                is_first_login=fields.get('is_first_login', True),
                company_setup_complete=fields.get('company_setup_complete', False),
                last_login=fields.get('last_login', now),
                created_at=fields.get('created_at', now),
                updated_at=fields.get('updated_at', now),
            )

            self._index_user(user)
            return user

    def update(self, user_id: int, **fields) -> Optional[UserRecord]:
        with self._lock:
            user = self._users_by_id.get(user_id)
            if not user:
                return None

            # Remove old indexes if email or google_id changes
            old_email = user.email
            old_google_id = user.google_id

            # Create updated user record (dataclass is immutable-ish, so create new)
            updated_fields = {
                'id': user.id,
                'name': fields.get('name', user.name),
                'email': fields.get('email', user.email).strip().lower(),
                'password_hash': fields.get('password_hash', user.password_hash),
                'google_id': fields.get('google_id', user.google_id),
                'provider': fields.get('provider', user.provider),
                'role': fields.get('role', user.role),
                'account_type': fields.get('account_type', user.account_type),
                'company': fields.get('company', user.company),
                'avatar': fields.get('avatar', user.avatar),
                'profile_picture': fields.get('profile_picture', user.profile_picture),
                'email_verified': fields.get('email_verified', user.email_verified),
                'is_first_login': fields.get('is_first_login', user.is_first_login),
                'company_setup_complete': fields.get('company_setup_complete', user.company_setup_complete),
                'last_login': fields.get('last_login', user.last_login),
                'created_at': user.created_at,
                'updated_at': datetime.now(timezone.utc),
            }

            updated_user = UserRecord(**updated_fields)

            # Re-index
            self._unindex_user(user)
            self._index_user(updated_user)

            return updated_user

    # ── Password ────────────────────────────────────────────────────

    def verify_password(self, user: UserRecord, password: str) -> bool:
        if not user.password_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8'))

    def set_password(self, user: UserRecord, password: str) -> None:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        # Create updated user with new password hash
        updated = self.update(user.id, password_hash=hashed)
        if not updated:
            raise ValueError(f"User {user.id} not found for password update")
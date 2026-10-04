"""
Authentication service using UserStore abstraction.
No direct SQLAlchemy dependencies.
"""
from datetime import datetime, timezone, timedelta
from jose import jwt

from app.extensions import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_ACCESS_TOKEN_EXPIRES
from app.auth.storage import UserStore, UserRecord, get_user_store


class AuthService:
    """Auth operations delegated to a UserStore implementation."""

    def __init__(self, store: UserStore = None):
        self.store = store or get_user_store()

    def generate_jwt_token(self, user: UserRecord) -> str:
        """Generates JWT token for authenticated user using python-jose."""
        now = datetime.now(timezone.utc)
        payload = {
            'sub': str(user.id),
            'email': user.email,
            'name': user.name,
            'role': user.role,
            'account_type': user.account_type,
            'provider': user.provider,
            'iat': now,
            'exp': now + timedelta(seconds=JWT_ACCESS_TOKEN_EXPIRES),
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    def register_local_user(self, name: str, company: str, email: str, password: str) -> tuple[UserRecord, str]:
        """Registers a new local email/password user."""
        email_clean = email.strip().lower()

        existing = self.store.get_by_email(email_clean)
        if existing:
            raise ValueError("An account with this email address already exists.")

        user = self.store.create(
            name=name.strip(),
            company=company.strip() if company else '',
            email=email_clean,
            provider='local',
            email_verified=False,
            last_login=datetime.now(timezone.utc),
            role='User',
            account_type=None,
            google_id=None,
            avatar='',
            profile_picture='',
            is_first_login=True,
            company_setup_complete=False,
        )

        self.store.set_password(user, password)
        self.store.commit()

        token = self.generate_jwt_token(user)
        return user, token

    def login_local_user(self, email: str, password: str) -> tuple[UserRecord, str]:
        """Authenticates local email/password user."""
        email_clean = email.strip().lower()

        user = self.store.get_by_email(email_clean)
        if not user:
            raise ValueError("Invalid email or password.")

        if not user.password_hash:
            raise ValueError("This account was created using Google Sign-In. Please log in with Google.")

        if not self.store.verify_password(user, password):
            raise ValueError("Invalid email or password.")

        user = self.store.update(user.id, last_login=datetime.now(timezone.utc))
        if not user:
            raise ValueError("User not found after login update.")

        self.store.commit()

        token = self.generate_jwt_token(user)
        return user, token

    def find_or_create_google_user(self, google_profile: dict) -> tuple[UserRecord, str]:
        """
        Finds existing user by google_id or email, links account if existing local user,
        or creates a new user. Prevents duplicate accounts.
        """
        google_id = google_profile.get('sub') or google_profile.get('id')
        email = google_profile.get('email')

        if not google_id or not email:
            raise ValueError("Google profile did not return a valid user ID or email.")

        email_clean = email.strip().lower()
        name = google_profile.get('name') or google_profile.get('given_name') or 'Google User'
        picture = google_profile.get('picture') or google_profile.get('avatar') or ''

        # 1. Check if user already exists by google_id
        user = self.store.get_by_google_id(google_id)
        if user:
            user = self.store.update(
                user.id,
                last_login=datetime.now(timezone.utc),
                profile_picture=picture or user.profile_picture,
                avatar=picture or user.avatar,
            )
            if not user:
                raise ValueError("User not found after Google ID lookup.")
            self.store.commit()
            token = self.generate_jwt_token(user)
            return user, token

        # 2. Check if user already exists by email (Account Linking)
        user = self.store.get_by_email(email_clean)
        if user:
            # Link Google Account to existing user
            user = self.store.update(
                user.id,
                google_id=google_id,
                email_verified=True,
                last_login=datetime.now(timezone.utc),
                profile_picture=picture or user.profile_picture,
                avatar=picture or user.avatar,
            )
            if not user:
                raise ValueError("User not found after email lookup.")
            self.store.commit()
            token = self.generate_jwt_token(user)
            return user, token

        # 3. Create new user for Google Sign-In
        user = self.store.create(
            name=name,
            display_name=name,
            email=email_clean,
            google_id=google_id,
            provider='google',
            profile_picture=picture,
            avatar=picture,
            email_verified=True,
            password_hash=None,
            last_login=datetime.now(timezone.utc),
            role='User',
            account_type=None,
            company='',
            is_first_login=True,
            company_setup_complete=False,
        )

        self.store.commit()

        token = self.generate_jwt_token(user)
        return user, token
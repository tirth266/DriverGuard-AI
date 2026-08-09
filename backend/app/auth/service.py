from datetime import datetime, timezone, timedelta
from jose import jwt
from app.extensions import SessionLocal, JWT_SECRET_KEY, JWT_ALGORITHM, JWT_ACCESS_TOKEN_EXPIRES
from app.models.user import User


class AuthService:
    @staticmethod
    def generate_jwt_token(user: User) -> str:
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

    @staticmethod
    def register_local_user(name: str, company: str, email: str, password: str) -> tuple[User, str]:
        """Registers a new local email/password user."""
        email_clean = email.strip().lower()
        db = SessionLocal()
        try:
            existing = db.query(User).filter_by(email=email_clean).first()
            if existing:
                raise ValueError("An account with this email address already exists.")

            user = User(
                name=name.strip(),
                company=company.strip() if company else '',
                email=email_clean,
                provider='local',
                email_verified=False,
                last_login=datetime.now(timezone.utc)
            )
            user.set_password(password)

            db.add(user)
            db.commit()
            db.refresh(user)

            token = AuthService.generate_jwt_token(user)
            return user, token
        finally:
            db.close()

    @staticmethod
    def login_local_user(email: str, password: str) -> tuple[User, str]:
        """Authenticates local email/password user."""
        email_clean = email.strip().lower()
        db = SessionLocal()
        try:
            user = db.query(User).filter_by(email=email_clean).first()

            if not user:
                raise ValueError("Invalid email or password.")

            if not user.password_hash:
                raise ValueError("This account was created using Google Sign-In. Please log in with Google.")

            if not user.check_password(password):
                raise ValueError("Invalid email or password.")

            user.last_login = datetime.now(timezone.utc)
            db.commit()
            db.refresh(user)

            token = AuthService.generate_jwt_token(user)
            return user, token
        finally:
            db.close()

    @staticmethod
    def find_or_create_google_user(google_profile: dict) -> tuple[User, str]:
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

        db = SessionLocal()
        try:
            # 1. Check if user already exists by google_id
            user = db.query(User).filter_by(google_id=google_id).first()

            if user:
                user.last_login = datetime.now(timezone.utc)
                if picture and not user.profile_picture:
                    user.profile_picture = picture
                    user.avatar = picture
                db.commit()
                db.refresh(user)
                token = AuthService.generate_jwt_token(user)
                return user, token

            # 2. Check if user already exists by email (Account Linking)
            user = db.query(User).filter_by(email=email_clean).first()

            if user:
                # Link Google Account to existing user
                user.google_id = google_id
                user.email_verified = True
                user.last_login = datetime.now(timezone.utc)
                if picture:
                    user.profile_picture = picture
                    user.avatar = picture
                db.commit()
                db.refresh(user)
                token = AuthService.generate_jwt_token(user)
                return user, token

            # 3. Create new user for Google Sign-In
            user = User(
                name=name,
                display_name=name,
                email=email_clean,
                google_id=google_id,
                provider='google',
                profile_picture=picture,
                avatar=picture,
                email_verified=True,
                password_hash=None,
                last_login=datetime.now(timezone.utc)
            )

            db.add(user)
            db.commit()
            db.refresh(user)

            token = AuthService.generate_jwt_token(user)
            return user, token
        finally:
            db.close()

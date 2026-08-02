from datetime import datetime, timezone
import bcrypt
from app.extensions import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    display_name = db.Column(db.String(120), nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True) # Nullable for OAuth users
    company = db.Column(db.String(120), nullable=True, default='')
    role = db.Column(db.String(50), nullable=False, default='User')
    
    # OAuth & Profile enhancements
    google_id = db.Column(db.String(255), unique=True, nullable=True, index=True)
    provider = db.Column(db.String(50), nullable=False, default='local')
    avatar = db.Column(db.Text, nullable=True, default='')
    profile_picture = db.Column(db.Text, nullable=True, default='')
    email_verified = db.Column(db.Boolean, nullable=False, default=False)
    
    # Account status & metadata
    account_type = db.Column(db.String(50), nullable=True, default=None)
    is_first_login = db.Column(db.Boolean, nullable=False, default=True)
    company_setup_complete = db.Column(db.Boolean, nullable=False, default=False)
    last_login = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def set_password(self, password: str) -> None:
        """Hashes password using bcrypt."""
        if password:
            salt = bcrypt.gensalt()
            self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        else:
            self.password_hash = None

    def check_password(self, password: str) -> bool:
        """Verifies password against bcrypt hash."""
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self) -> dict:
        """Returns JSON-serializable user dictionary."""
        return {
            'id': self.id,
            'name': self.name,
            'display_name': self.display_name or self.name,
            'email': self.email,
            'company': self.company or '',
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

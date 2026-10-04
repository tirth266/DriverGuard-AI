"""
User settings persistence service.
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models import UserSettings


class SettingsService:
    """Service for managing user settings."""

    def __init__(self, session: Session = None):
        self._session = session
        self._owns_session = session is None

    def _get_session(self) -> Session:
        if self._session is None:
            from app.extensions import SessionLocal
            self._session = SessionLocal()
        return self._session

    def close(self):
        if self._owns_session and self._session:
            self._session.close()
            self._session = None

    def commit(self):
        self._get_session().commit()

    def rollback(self):
        if self._session:
            self._session.rollback()

    def get_settings(self, user_id: int) -> Optional[UserSettings]:
        """Get user settings."""
        session = self._get_session()
        return session.query(UserSettings).filter(UserSettings.user_id == user_id).first()

    def get_or_create_settings(self, user_id: int) -> UserSettings:
        """Get existing settings or create default ones."""
        session = self._get_session()
        settings = session.query(UserSettings).filter(UserSettings.user_id == user_id).first()
        if not settings:
            settings = UserSettings(
                user_id=user_id,
                drowsiness_sensitivity='High',
                voice_alerts_enabled=True,
                email_digest_enabled=True,
            )
            session.add(settings)
            session.flush()
        return settings

    def update_settings(
        self,
        user_id: int,
        drowsiness_sensitivity: Optional[str] = None,
        voice_alerts_enabled: Optional[bool] = None,
        email_digest_enabled: Optional[bool] = None,
        extra_settings: Optional[Dict[str, Any]] = None,
    ) -> UserSettings:
        """Update user settings."""
        settings = self.get_or_create_settings(user_id)

        if drowsiness_sensitivity is not None:
            settings.drowsiness_sensitivity = drowsiness_sensitivity
        if voice_alerts_enabled is not None:
            settings.voice_alerts_enabled = voice_alerts_enabled
        if email_digest_enabled is not None:
            settings.email_digest_enabled = email_digest_enabled
        if extra_settings is not None:
            settings.set_extra(extra_settings)

        settings.updated_at = datetime.now(timezone.utc)
        self._get_session().flush()
        return settings


# Global instance
settings_service = SettingsService()
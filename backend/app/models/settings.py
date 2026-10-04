"""
User settings model.
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.orm import mapped_column, Mapped, relationship
import json
from app.extensions import Base


class UserSettings(Base):
    """User settings and preferences."""
    __tablename__ = 'user_settings'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False, unique=True)

    # AI Detection settings
    drowsiness_sensitivity: Mapped[str] = mapped_column(String(20), default='High')
    voice_alerts_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    email_digest_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # Additional settings stored as JSON for flexibility
    extra_settings: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["User"] = relationship("User", back_populates="settings")

    __table_args__ = (
        Index('ix_user_settings_user_id', 'user_id'),
    )

    def get_extra(self) -> Dict[str, Any]:
        """Parse extra_settings JSON."""
        if not self.extra_settings:
            return {}
        try:
            return json.loads(self.extra_settings)
        except:
            return {}

    def set_extra(self, data: Dict[str, Any]) -> None:
        """Set extra_settings JSON."""
        self.extra_settings = json.dumps(data)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        extra = self.get_extra()
        return {
            'id': self.id,
            'user_id': self.user_id,
            'drowsiness_sensitivity': self.drowsiness_sensitivity,
            'voice_alerts_enabled': self.voice_alerts_enabled,
            'email_digest_enabled': self.email_digest_enabled,
            **extra,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
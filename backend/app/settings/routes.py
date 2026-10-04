"""
Settings API routes.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.extensions import get_db
from app.services.settings_service import settings_service, SettingsService
from app.models import UserSettings
from app.auth.controller import get_current_user_id

logger = logging.getLogger(__name__)

settings_router = APIRouter(prefix='/api/settings')


# ── Pydantic models ────────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    drowsiness_sensitivity: Optional[str] = None
    voice_alerts_enabled: Optional[bool] = None
    email_digest_enabled: Optional[bool] = None
    extra_settings: Optional[dict] = None


# ── Auth dependency ────────────────────────────────────────────────────────────
# get_current_user_id is imported from app.auth.controller


def get_settings_service() -> SettingsService:
    db = next(get_db())
    return SettingsService(db)


# ── Routes ─────────────────────────────────────────────────────────────────────

@settings_router.get('/')
async def get_settings(
    current_user_id: str = Depends(get_current_user_id),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    """GET /api/settings - Get user settings."""
    try:
        settings = settings_svc.get_or_create_settings(int(current_user_id))
        return JSONResponse({
            'success': True,
            'settings': settings.to_dict(),
        }, status_code=200)
    except Exception as e:
        logger.error(f"Get settings error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to get settings.'}, status_code=500)


@settings_router.put('/')
async def update_settings(
    body: SettingsUpdate,
    current_user_id: str = Depends(get_current_user_id),
    settings_svc: SettingsService = Depends(get_settings_service),
):
    """PUT /api/settings - Update user settings."""
    try:
        settings = settings_svc.update_settings(
            user_id=int(current_user_id),
            drowsiness_sensitivity=body.drowsiness_sensitivity,
            voice_alerts_enabled=body.voice_alerts_enabled,
            email_digest_enabled=body.email_digest_enabled,
            extra_settings=body.extra_settings,
        )
        settings_svc.commit()
        
        return JSONResponse({
            'success': True,
            'message': 'Settings updated successfully.',
            'settings': settings.to_dict(),
        }, status_code=200)
    except Exception as e:
        settings_svc.rollback()
        logger.error(f"Update settings error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to update settings.'}, status_code=500)


# Need to import logger
import logging
logger = logging.getLogger(__name__)
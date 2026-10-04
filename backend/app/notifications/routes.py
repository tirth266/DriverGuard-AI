"""
Notification API routes.
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from app.extensions import JWT_SECRET_KEY, JWT_ALGORITHM
from app.services.email_service import email_service
from app.auth.controller import get_current_user_id

logger = logging.getLogger(__name__)

notifications_router = APIRouter(prefix='/api/notifications')


# ── Pydantic models ────────────────────────────────────────────────────────────

class SendEmailRequest(BaseModel):
    to: EmailStr
    subject: str
    body: str
    html_body: Optional[str] = None


class DriverInvitationRequest(BaseModel):
    email: EmailStr
    driver_name: str
    invitation_link: str
    company_name: str


class RideReportRequest(BaseModel):
    email: EmailStr
    driver_name: str
    ride_summary: dict


class SafetyAlertRequest(BaseModel):
    email: EmailStr
    driver_name: str
    alert_type: str
    vehicle: str
    timestamp: str


# ── Auth dependency ────────────────────────────────────────────────────────────
# get_current_user_id is imported from app.auth.controller


# ── Routes ─────────────────────────────────────────────────────────────────────

@notifications_router.post('/send')
async def send_email(
    body: SendEmailRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """POST /api/notifications/send - Send a custom email."""
    if not email_service.is_configured():
        return JSONResponse(
            {'success': False, 'message': 'Email service not configured.'}, 
            status_code=503
        )
    
    try:
        success = email_service.send_email(
            to=body.to,
            subject=body.subject,
            body=body.body,
            html_body=body.html_body,
        )
        
        if success:
            return JSONResponse({'success': True, 'message': 'Email sent.'}, status_code=200)
        else:
            return JSONResponse({'success': False, 'message': 'Failed to send email.'}, status_code=500)
    except Exception as e:
        logger.error(f"Send email error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to send email.'}, status_code=500)


@notifications_router.post('/invite-driver')
async def invite_driver(
    body: DriverInvitationRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """POST /api/notifications/invite-driver - Send driver invitation email."""
    if not email_service.is_configured():
        return JSONResponse(
            {'success': False, 'message': 'Email service not configured.'}, 
            status_code=503
        )
    
    try:
        success = email_service.send_driver_invitation(
            to=body.email,
            driver_name=body.driver_name,
            invitation_link=body.invitation_link,
            company_name=body.company_name,
        )
        
        if success:
            return JSONResponse({'success': True, 'message': 'Invitation sent.'}, status_code=200)
        else:
            return JSONResponse({'success': False, 'message': 'Failed to send invitation.'}, status_code=500)
    except Exception as e:
        logger.error(f"Send invitation error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to send invitation.'}, status_code=500)


@notifications_router.post('/ride-report')
async def send_ride_report(
    body: RideReportRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """POST /api/notifications/ride-report - Send ride report email."""
    if not email_service.is_configured():
        return JSONResponse(
            {'success': False, 'message': 'Email service not configured.'}, 
            status_code=503
        )
    
    try:
        success = email_service.send_ride_report(
            to=body.email,
            driver_name=body.driver_name,
            ride_summary=body.ride_summary,
        )
        
        if success:
            return JSONResponse({'success': True, 'message': 'Ride report sent.'}, status_code=200)
        else:
            return JSONResponse({'success': False, 'message': 'Failed to send ride report.'}, status_code=500)
    except Exception as e:
        logger.error(f"Send ride report error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to send ride report.'}, status_code=500)


@notifications_router.post('/safety-alert')
async def send_safety_alert(
    body: SafetyAlertRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """POST /api/notifications/safety-alert - Send safety alert email."""
    if not email_service.is_configured():
        return JSONResponse(
            {'success': False, 'message': 'Email service not configured.'}, 
            status_code=503
        )
    
    try:
        success = email_service.send_safety_alert(
            to=body.email,
            driver_name=body.driver_name,
            alert_type=body.alert_type,
            vehicle=body.vehicle,
            timestamp=body.timestamp,
        )
        
        if success:
            return JSONResponse({'success': True, 'message': 'Safety alert sent.'}, status_code=200)
        else:
            return JSONResponse({'success': False, 'message': 'Failed to send safety alert.'}, status_code=500)
    except Exception as e:
        logger.error(f"Send safety alert error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to send safety alert.'}, status_code=500)


@notifications_router.get('/status')
async def email_status(
    current_user_id: str = Depends(get_current_user_id),
):
    """GET /api/notifications/status - Check email service status."""
    return JSONResponse({
        'success': True,
        'configured': email_service.is_configured(),
    }, status_code=200)
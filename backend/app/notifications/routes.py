"""
Notification API routes.
"""
import asyncio
import logging
import os
from typing import Optional
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from app.extensions import JWT_SECRET_KEY, JWT_ALGORITHM, SessionLocal
from app.models import Company, Driver
from app.services.email_service import email_service
from app.auth.controller import get_current_user_id
from app.rate_limit import NOTIFICATION_LIMIT, limiter

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


# ── Authorization ──────────────────────────────────────────────────────────────
#
# These endpoints send mail from the deployment's own SMTP identity. That makes
# an unscoped one an open relay: any account, including a personal-ride user with
# no fleet at all, could send to any address on earth, and an invitation puts an
# attacker-chosen link inside correctly branded mail. Every handler therefore
# resolves its recipient against the caller's own companies first, and reports a
# recipient it cannot find exactly as it reports one that does not exist, so
# these endpoints cannot be used to enumerate another tenant's drivers.

def owned_company_ids(session, user_id: int) -> list:
    return [
        row[0] for row in
        session.query(Company.id).filter(Company.owner_id == user_id).all()
    ]


def resolve_recipient(user_id: int, email: str):
    """
    The driver this caller is allowed to write to, or (None, None).

    Matched on the email the caller supplied, then confined to the caller's own
    companies. Returns the driver so the caller's name and company can be read
    from the database instead of being taken from the request body.
    """
    if not SessionLocal:
        return None, None
    session = SessionLocal()
    try:
        company_ids = owned_company_ids(session, user_id)
        if not company_ids:
            return None, None
        driver = session.query(Driver).filter(
            Driver.email == email,
            Driver.company_id.in_(company_ids),
        ).first()
        if not driver:
            return None, None
        company = session.query(Company).filter(Company.id == driver.company_id).first()
        return driver, company
    except Exception as e:
        logger.error(f"Recipient lookup failed: {e}")
        return None, None
    finally:
        session.close()


def allowed_invitation_origins() -> list:
    """
    Origins an invitation link may point at.

    Derived from the same FRONTEND_URL list the CORS configuration already uses,
    so a legitimate link keeps working with no new configuration.
    """
    origins = [
        'http://localhost:5173', 'http://127.0.0.1:5173',
        'http://localhost:5174', 'http://127.0.0.1:5174',
        'http://localhost:3000',
    ]
    configured = os.environ.get('FRONTEND_URL', '')
    for url in configured.split(','):
        cleaned = url.strip().rstrip('/')
        if cleaned and cleaned not in origins:
            origins.append(cleaned)
    return origins


# The port a scheme implies when the URL does not name one, so that
# https://fleet.example.com and https://fleet.example.com:443 are one origin.
_DEFAULT_PORTS = {'http': 80, 'https': 443}

# Plain HTTP is allowed only to the loopback names the dev servers run on.
_LOOPBACK_HOSTS = {'localhost', '127.0.0.1', '::1'}


def _origin_of(url: str) -> Optional[tuple]:
    """
    (scheme, host, port) for a URL, or None when it is not a usable origin.

    The three parts are compared as a unit later. Comparing the reconstructed
    "scheme://netloc" as text does not work: `startswith` accepts any host that
    merely begins with an allowed one, so https://fleet.example.com.evil.net
    passed a check written for https://fleet.example.com.
    """
    try:
        parsed = urlparse(url)
    except ValueError:
        return None

    scheme = (parsed.scheme or '').lower()
    if scheme not in _DEFAULT_PORTS:
        return None

    # 'https://fleet.example.com@evil.net/x' resolves to evil.net but reads as
    # the allowed host to anyone eyeballing the mail.
    if parsed.username is not None or parsed.password is not None:
        return None

    # hostname is already lowercased by urlparse; the trailing dot is dropped
    # because 'fleet.example.com.' names the same host as 'fleet.example.com'.
    host = (parsed.hostname or '').lower().rstrip('.')
    if not host:
        return None

    try:
        port = parsed.port
    except ValueError:
        # Not an integer: 'localhost:5173.evil.com' parses its host as
        # 'localhost' and only fails here, so this must never fall through.
        return None

    if port is None:
        port = _DEFAULT_PORTS[scheme]
    return (scheme, host, port)


def validate_invitation_link(link: str) -> Optional[str]:
    """
    An error message when the link is unusable, else None.

    The link must resolve to an origin this deployment actually serves, compared
    exactly. A prefix match is not sufficient: an attacker who registers
    fleet.example.com.evil.net passes any `startswith('https://fleet.example.com')`
    check, and would get this deployment's own branding around a link to their
    own site.
    """
    origin = _origin_of(link)
    if origin is None:
        return 'Invitation link must be an absolute http or https URL.'

    scheme, host, _port = origin
    if scheme != 'https' and host not in _LOOPBACK_HOSTS:
        return 'Invitation link must use https.'

    allowed = [parsed for parsed in map(_origin_of, allowed_invitation_origins()) if parsed]
    if origin not in allowed:
        return 'Invitation link must point at this application.'

    return None


# ── Auth dependency ────────────────────────────────────────────────────────────
# get_current_user_id is imported from app.auth.controller
# `request` is not read in the handlers below: SlowAPI's decorator inspects the
# signature for it and refuses to register a limited endpoint without one.


# ── Routes ─────────────────────────────────────────────────────────────────────

@notifications_router.post('/send')
@limiter.limit(NOTIFICATION_LIMIT)
async def send_email(
    request: Request,
    body: SendEmailRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    POST /api/notifications/send - Send a custom email.

    Administrative use only: the caller must manage at least one fleet. This is
    a generic relay to an arbitrary recipient and subject, so without that
    restriction any registered account could use the deployment's SMTP identity
    to send mail to anyone.
    """
    if not SessionLocal:
        return JSONResponse(
            {'success': False, 'message': 'Database not configured.'},
            status_code=503,
        )

    session = SessionLocal()
    try:
        manages_fleet = bool(owned_company_ids(session, int(current_user_id)))
    finally:
        session.close()

    if not manages_fleet:
        return JSONResponse(
            {'success': False, 'message': 'Not permitted. Custom email is available to fleet accounts only.'},
            status_code=403,
        )

    if not email_service.is_configured():
        return JSONResponse(
            {'success': False, 'message': 'Email service not configured.'},
            status_code=503
        )

    try:
        # smtplib is synchronous socket I/O. Left on the event loop it would hold
        # it for the whole connect/STARTTLS/AUTH/DATA exchange, stalling every
        # other request on this worker while one mail is in flight.
        success = await asyncio.to_thread(
            email_service.send_email,
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
@limiter.limit(NOTIFICATION_LIMIT)
async def invite_driver(
    request: Request,
    body: DriverInvitationRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """POST /api/notifications/invite-driver - Send driver invitation email."""
    # Configuration first. A deployment with no SMTP has nothing to send, and
    # saying "driver not found" for that would send an operator looking for an
    # authorization problem that does not exist.
    if not email_service.is_configured():
        return JSONResponse(
            {'success': False, 'message': 'Email service not configured.'},
            status_code=503
        )

    link_error = validate_invitation_link(body.invitation_link)
    if link_error:
        return JSONResponse({'success': False, 'message': link_error}, status_code=400)

    # The recipient has to be a driver in the caller's own fleet, and the name
    # and company that appear in the mail come from that record rather than from
    # the request, so the sender cannot describe a different organisation or
    # address someone who has nothing to do with this account.
    driver, company = resolve_recipient(int(current_user_id), body.email)
    if not driver:
        return JSONResponse(
            {'success': False, 'message': 'Driver not found in your fleet.'},
            status_code=404,
        )

    try:
        success = await asyncio.to_thread(
            email_service.send_driver_invitation,
            to=body.email,
            driver_name=driver.full_name,
            invitation_link=body.invitation_link,
            company_name=company.name if company else '',
        )

        if success:
            return JSONResponse({'success': True, 'message': 'Invitation sent.'}, status_code=200)
        else:
            return JSONResponse({'success': False, 'message': 'Failed to send invitation.'}, status_code=500)
    except Exception as e:
        logger.error(f"Send invitation error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to send invitation.'}, status_code=500)


@notifications_router.post('/ride-report')
@limiter.limit(NOTIFICATION_LIMIT)
async def send_ride_report(
    request: Request,
    body: RideReportRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """POST /api/notifications/ride-report - Send ride report email."""
    # Configuration before recipient, for the reason given on /invite-driver.
    if not email_service.is_configured():
        return JSONResponse(
            {'success': False, 'message': 'Email service not configured.'},
            status_code=503
        )

    driver, _company = resolve_recipient(int(current_user_id), body.email)
    if not driver:
        return JSONResponse(
            {'success': False, 'message': 'Driver not found in your fleet.'},
            status_code=404,
        )

    try:
        success = await asyncio.to_thread(
            email_service.send_ride_report,
            to=body.email,
            driver_name=driver.full_name,
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
@limiter.limit(NOTIFICATION_LIMIT)
async def send_safety_alert(
    request: Request,
    body: SafetyAlertRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """POST /api/notifications/safety-alert - Send safety alert email."""
    # Configuration before recipient, for the reason given on /invite-driver.
    if not email_service.is_configured():
        return JSONResponse(
            {'success': False, 'message': 'Email service not configured.'},
            status_code=503
        )

    driver, _company = resolve_recipient(int(current_user_id), body.email)
    if not driver:
        return JSONResponse(
            {'success': False, 'message': 'Driver not found in your fleet.'},
            status_code=404,
        )

    try:
        success = await asyncio.to_thread(
            email_service.send_safety_alert,
            to=body.email,
            driver_name=driver.full_name,
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
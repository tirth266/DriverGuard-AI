import asyncio
import logging
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from app.config import get_config
from app.extensions import get_db
from app.auth.controller import get_current_user_id
from app.services.ride_service import RideService, RideAuthorizationError
from app.services.pdf_service import generate_ride_report
from app.ai.yolo_service import yolo_service
from app.models import Ride, RideStatus, Driver, Vehicle
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

ride_router = APIRouter(prefix='/api/rides')


# ── Pydantic models ────────────────────────────────────────────────────────────

class GPSLocation(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    timestamp: Optional[str] = None


class StartRideBody(BaseModel):
    # Both omitted means a personal ride: the caller's own ride, with no driver,
    # vehicle or company attached. Sending only one is refused, because a ride
    # that names a driver but no vehicle would attribute it to half a fleet.
    driver_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    start_location: Optional[GPSLocation] = None


class EndRideBody(BaseModel):
    end_location: Optional[GPSLocation] = None


def get_ride_service() -> RideService:
    db = next(get_db())
    return RideService(db)


# ── Routes ─────────────────────────────────────────────────────────────────────

@ride_router.post('/')
async def start_ride(
    body: StartRideBody,
    current_user_id: str = Depends(get_current_user_id),
    ride_svc: RideService = Depends(get_ride_service),
):
    """POST /api/rides - Start a new ride."""
    try:
        # driver_id and vehicle_id arrive from the client, so they are treated
        # as untrusted references and re-authorized against the authenticated
        # user's own companies before anything is written. Both must resolve
        # inside the caller's fleet and to the same company; otherwise the ride
        # is refused without disclosing whether the other id exists. Sending
        # neither is a personal ride, which the same check accepts only for an
        # account that owns no company.
        try:
            driver, vehicle, company = ride_svc.resolve_authorized_actor(
                user_id=int(current_user_id),
                driver_id=body.driver_id,
                vehicle_id=body.vehicle_id,
            )
        except RideAuthorizationError as denied:
            logger.warning(
                f"Ride start denied: user={current_user_id}, driver={body.driver_id}, "
                f"vehicle={body.vehicle_id}, reason={denied.message}"
            )
            return JSONResponse(
                {'success': False, 'message': denied.message},
                status_code=denied.status_code,
            )

        # One active ride at a time, checked on whatever the ride is attached to.
        # A fleet ride is held by its driver and its vehicle; a personal ride has
        # neither, so only its owner can hold it, which is what stops a second
        # monitoring session from opening one against the same account.
        if driver:
            active_ride = ride_svc.get_active_ride_for_driver(driver.id)
            if active_ride:
                return JSONResponse({'success': False, 'message': 'Driver already has an active ride.'}, status_code=400)

        if vehicle:
            active_vehicle_ride = ride_svc._get_session().query(Ride).filter(
                Ride.vehicle_id == vehicle.id, Ride.status == RideStatus.ACTIVE
            ).first()
            if active_vehicle_ride:
                return JSONResponse({'success': False, 'message': 'Vehicle already has an active ride.'}, status_code=400)

        if driver is None:
            # A personal ride has no driver or vehicle to hold it, so its owner is
            # the only thing that can. Fleet rides are already held by their
            # driver and their vehicle, and a fleet user may legitimately have one
            # ride per driver open at once, so this is not applied to them.
            active_user_ride = ride_svc.get_active_ride_for_user(int(current_user_id))
            if active_user_ride:
                return JSONResponse(
                    {'success': False, 'message': 'You already have a ride in progress. End it before starting another.'},
                    status_code=400,
                )

        # Create the ride. The company is the one the authorization step above
        # bound both records to, so it is never taken from the request body, and
        # for a personal ride there is none and it is stored unset.
        start_location_dict = body.start_location.model_dump() if body.start_location else None
        ride = ride_svc.create_ride(
            user_id=int(current_user_id),
            driver_id=driver.id if driver else None,
            vehicle_id=vehicle.id if vehicle else None,
            company_id=company.id if company else None,
            start_location=start_location_dict,
        )
        ride_svc.commit()

        # Set ride context in YOLO service for event persistence
        yolo_service.set_ride(str(current_user_id), ride.id)
        yolo_service.reset_session(str(current_user_id), ride.id)

        logger.info(
            f"Ride started: id={ride.id}, kind={'personal' if driver is None else 'fleet'}, "
            f"driver={getattr(driver, 'id', None)}, vehicle={getattr(vehicle, 'id', None)}, user={current_user_id}"
        )

        return JSONResponse({
            'success': True,
            'message': 'Ride started successfully.',
            'ride': ride_svc.ride_to_dict(ride),
        }, status_code=201)

    except Exception as e:
        ride_svc.rollback()
        logger.error(f"Start ride error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to start ride.'}, status_code=500)


@ride_router.get('/')
async def list_rides(
    current_user_id: str = Depends(get_current_user_id),
    ride_svc: RideService = Depends(get_ride_service),
):
    """GET /api/rides - List rides for current user."""
    try:
        rides = ride_svc.get_rides_for_user(int(current_user_id))
        return JSONResponse({
            'success': True,
            'rides': [ride_svc.ride_to_dict(r) for r in rides],
        }, status_code=200)
    except Exception as e:
        logger.error(f"List rides error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to list rides.'}, status_code=500)


@ride_router.get('/{ride_id}')
async def get_ride(
    ride_id: int,
    current_user_id: str = Depends(get_current_user_id),
    ride_svc: RideService = Depends(get_ride_service),
):
    """GET /api/rides/{ride_id} - Get ride details."""
    try:
        ride = ride_svc.get_ride(ride_id)
        if not ride:
            return JSONResponse({'success': False, 'message': 'Ride not found.'}, status_code=404)

        # Verify ownership (user can only see their own rides unless admin)
        if ride.user_id != int(current_user_id):
            # TODO: Add admin/company check
            return JSONResponse({'success': False, 'message': 'Unauthorized.'}, status_code=403)

        return JSONResponse({
            'success': True,
            'ride': ride_svc.ride_to_dict(ride),
        }, status_code=200)
    except Exception as e:
        logger.error(f"Get ride error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to get ride.'}, status_code=500)


@ride_router.post('/{ride_id}/end')
async def end_ride(
    ride_id: int,
    body: EndRideBody,
    current_user_id: str = Depends(get_current_user_id),
    ride_svc: RideService = Depends(get_ride_service),
):
    """POST /api/rides/{ride_id}/end - End an active ride and return its final report."""
    try:
        ride = ride_svc.get_ride(ride_id)
        if not ride:
            return JSONResponse({'success': False, 'message': 'Ride not found.'}, status_code=404)

        if ride.user_id != int(current_user_id):
            return JSONResponse({'success': False, 'message': 'Unauthorized.'}, status_code=403)

        if ride.status == RideStatus.COMPLETED:
            # Already finalized. A second End Ride for the same ride is a double
            # submit, not a mistake, so it returns the ride and the report it was
            # given the first time instead of an error that would lose the report.
            return JSONResponse({
                'success': True,
                'message': 'Ride already ended.',
                'ride': ride_svc.ride_to_dict(ride),
                'session_summary': ride_svc.session_summary_for(ride),
            }, status_code=200)

        if ride.status != RideStatus.ACTIVE:
            return JSONResponse({'success': False, 'message': 'Ride is not active.'}, status_code=400)

        # The order below is the whole point of this endpoint: every open event is
        # closed on the record, the session that scored this ride is frozen and read
        # one last time, and only then is the ride completed and its session
        # discarded. Read the summary earlier and a frame still in flight could
        # still add to it; read it after the session is cleared and there is
        # nothing left to read, which is how a finished ride could be reported as
        # a clean 100/100.

        # 1. Close all open events, so the event that was live at the moment the
        #    ride ended keeps the duration it actually ran for.
        ride_svc.close_all_open_events(ride_id, datetime.now(timezone.utc))

        # 2. Freeze the ride's own session and take its final score, grade,
        #    breakdown and timeline. None means no frame ever scored this ride,
        #    and then no score is written for it at all.
        final_summary = yolo_service.finalize_session(str(current_user_id), ride_id)

        # 3. End the ride, storing that summary on it so the report can be read
        #    back long after the in-memory session is gone.
        end_location_dict = body.end_location.model_dump() if body.end_location else None
        ride = ride_svc.end_ride(ride_id, end_location_dict, session_summary=final_summary)
        ride_svc.commit()

        # 4. Only now, with the report safely persisted, drop the session.
        yolo_service.clear_ride(str(current_user_id))

        logger.info(
            f"Ride ended: id={ride.id}, duration={ride.duration_seconds}s, "
            f"score={getattr(ride, 'final_score', None)}, summary={'stored' if final_summary else 'none'}"
        )

        return JSONResponse({
            'success': True,
            'message': 'Ride ended successfully.',
            'ride': ride_svc.ride_to_dict(ride),
            'session_summary': final_summary or ride_svc.session_summary_for(ride),
        }, status_code=200)

    except Exception as e:
        ride_svc.rollback()
        logger.error(f"End ride error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to end ride.'}, status_code=500)


@ride_router.get('/{ride_id}/events')
async def get_ride_events(
    ride_id: int,
    current_user_id: str = Depends(get_current_user_id),
    ride_svc: RideService = Depends(get_ride_service),
):
    """GET /api/rides/{ride_id}/events - Get events for a ride."""
    try:
        ride = ride_svc.get_ride(ride_id)
        if not ride:
            return JSONResponse({'success': False, 'message': 'Ride not found.'}, status_code=404)

        if ride.user_id != int(current_user_id):
            return JSONResponse({'success': False, 'message': 'Unauthorized.'}, status_code=403)

        events = ride_svc.get_events_for_ride(ride_id)
        return JSONResponse({
            'success': True,
            'events': [ride_svc.event_to_dict(e) for e in events],
        }, status_code=200)

    except Exception as e:
        logger.error(f"Get ride events error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to get ride events.'}, status_code=500)


@ride_router.get('/{ride_id}/report')
async def get_ride_report(
    ride_id: int,
    current_user_id: str = Depends(get_current_user_id),
    ride_svc: RideService = Depends(get_ride_service),
):
    """GET /api/rides/{ride_id}/report - Generate PDF ride report."""
    try:
        ride = ride_svc.get_ride(ride_id)
        if not ride:
            return JSONResponse({'success': False, 'message': 'Ride not found.'}, status_code=404)

        if ride.user_id != int(current_user_id):
            return JSONResponse({'success': False, 'message': 'Unauthorized.'}, status_code=403)

        # A report is a statement about a ride that finished. Without a stored
        # summary there is no measurement behind it, and the PDF would print
        # "N/A/100" for a score and "No distraction events detected" for a ride
        # that is still running or never scored a single frame — a clean-ride
        # attestation for a ride nobody measured. That is exactly the fabrication
        # the scoring layer refuses to make, so the report refuses it too.
        session_summary = ride_svc.session_summary_for(ride)
        if not session_summary:
            if ride.status == RideStatus.ACTIVE:
                return JSONResponse(
                    {
                        'success': False,
                        'message': 'This ride is still in progress. End it to generate its report.',
                    },
                    status_code=409,
                )
            return JSONResponse(
                {
                    'success': False,
                    'message': 'This ride has no finalized report. It recorded no scored frames, '
                               'so there is nothing to report.',
                },
                status_code=409,
            )

        # Get ride data with events
        ride_dict = ride_svc.ride_to_dict(ride)

        # Driver and vehicle, for a fleet ride. A personal ride has neither, so it
        # is reported as the ride of the account that owns it rather than as one
        # with an unknown driver.
        driver = None
        if ride.driver_id is not None:
            driver = ride_svc._get_session().query(Driver).filter(Driver.id == ride.driver_id).first()
        vehicle = None
        if ride.vehicle_id is not None:
            vehicle = ride_svc._get_session().query(Vehicle).filter(Vehicle.id == ride.vehicle_id).first()

        owner = ride.user
        owner_name = owner.display_name or owner.name if owner else None
        
        # Format duration
        def format_duration(seconds: Optional[int]) -> str:
            if not seconds or seconds <= 0:
                return 'Not Available'
            h = seconds // 3600
            m = (seconds % 3600) // 60
            s = seconds % 60
            parts = []
            if h > 0:
                parts.append(f'{h}h')
            if m > 0:
                parts.append(f'{m}m')
            if s > 0:
                parts.append(f'{s}s')
            return ' '.join(parts) if parts else '0s'
        
        # Build report data
        report_data = {
            'ride': ride_dict,
            'driver_name': driver.full_name if driver else (owner_name or 'Unknown Driver'),
            'vehicle': f"{vehicle.manufacturer or ''} {vehicle.model or ''} #{vehicle.vehicle_number}".strip() if vehicle else 'Personal ride',
            'date': ride.start_time.strftime('%B %d, %Y') if ride.start_time else 'Unknown Date',
            'start_time': ride.start_time.strftime('%H:%M:%S') if ride.start_time else 'Not Available',
            'end_time': ride.end_time.strftime('%H:%M:%S') if ride.end_time else 'Not Available',
            'duration': format_duration(ride.duration_seconds),
            'distance': f'{ride.distance_km:.1f} km' if ride.distance_km else 'Not Available',
            'avg_speed': f'{ride.average_speed_kmh:.1f} km/h' if ride.average_speed_kmh else 'Not Available',
            'session_summary': session_summary,
        }

        # reportlab lays out and writes the document synchronously. Left on the
        # event loop that blocks it for the whole render, so every other request
        # on this worker waits behind one PDF.
        pdf_bytes = await asyncio.to_thread(generate_ride_report, report_data)
        
        return Response(
            content=pdf_bytes,
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="ride_report_{ride_id}.pdf"'
            }
        )
    except Exception as e:
        logger.error(f"Generate ride report error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to generate ride report.'}, status_code=500)
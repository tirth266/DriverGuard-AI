import logging
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from app.config import get_config
from app.extensions import get_db
from app.auth.controller import get_current_user_id
from app.services.ride_service import ride_service, RideService
from app.services.pdf_service import generate_ride_report
from app.ai.yolo_service import yolo_service
from app.models import Ride, RideStatus, Driver, Vehicle, Company
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
    driver_id: int
    vehicle_id: int
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
        # Validate driver exists and belongs to user's company
        driver = ride_svc._get_session().query(Driver).filter(Driver.id == body.driver_id).first()
        if not driver:
            return JSONResponse({'success': False, 'message': 'Driver not found.'}, status_code=404)

        # Validate vehicle exists
        vehicle = ride_svc._get_session().query(Vehicle).filter(Vehicle.id == body.vehicle_id).first()
        if not vehicle:
            return JSONResponse({'success': False, 'message': 'Vehicle not found.'}, status_code=404)

        # Check if driver already has an active ride
        active_ride = ride_svc.get_active_ride_for_driver(body.driver_id)
        if active_ride:
            return JSONResponse({'success': False, 'message': 'Driver already has an active ride.'}, status_code=400)

        # Check if vehicle already has an active ride
        active_vehicle_ride = ride_svc._get_session().query(Ride).filter(
            Ride.vehicle_id == body.vehicle_id, Ride.status == RideStatus.ACTIVE
        ).first()
        if active_vehicle_ride:
            return JSONResponse({'success': False, 'message': 'Vehicle already has an active ride.'}, status_code=400)

        # Get company from driver
        company = ride_svc._get_session().query(Company).filter(Company.id == driver.company_id).first()
        if not company:
            return JSONResponse({'success': False, 'message': 'Company not found.'}, status_code=404)

        # Create the ride
        start_location_dict = body.start_location.model_dump() if body.start_location else None
        ride = ride_svc.create_ride(
            user_id=int(current_user_id),
            driver_id=body.driver_id,
            vehicle_id=body.vehicle_id,
            company_id=company.id,
            start_location=start_location_dict,
        )
        ride_svc.commit()

        # Set ride context in YOLO service for event persistence
        yolo_service.set_ride(str(current_user_id), ride.id)
        yolo_service.reset_session(str(current_user_id), ride.id)

        logger.info(f"Ride started: id={ride.id}, driver={body.driver_id}, vehicle={body.vehicle_id}, user={current_user_id}")

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
    """POST /api/rides/{ride_id}/end - End an active ride."""
    try:
        ride = ride_svc.get_ride(ride_id)
        if not ride:
            return JSONResponse({'success': False, 'message': 'Ride not found.'}, status_code=404)

        if ride.user_id != int(current_user_id):
            return JSONResponse({'success': False, 'message': 'Unauthorized.'}, status_code=403)

        if ride.status != RideStatus.ACTIVE:
            return JSONResponse({'success': False, 'message': 'Ride is not active.'}, status_code=400)

        # Close all open events
        ride_svc.close_all_open_events(ride_id, datetime.now(timezone.utc))

        # End the ride
        end_location_dict = body.end_location.model_dump() if body.end_location else None
        ride = ride_svc.end_ride(ride_id, end_location_dict)
        ride_svc.commit()

        # Clear ride context in YOLO service
        yolo_service.clear_ride(str(current_user_id))

        logger.info(f"Ride ended: id={ride.id}, duration={ride.duration_seconds}s")

        return JSONResponse({
            'success': True,
            'message': 'Ride ended successfully.',
            'ride': ride_svc.ride_to_dict(ride),
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

        # Get ride data with events
        ride_dict = ride_svc.ride_to_dict(ride)
        
        # Get driver and vehicle info
        driver = ride_svc._get_session().query(Driver).filter(Driver.id == ride.driver_id).first()
        vehicle = ride_svc._get_session().query(Vehicle).filter(Vehicle.id == ride.vehicle_id).first()
        
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
            'driver_name': driver.full_name if driver else 'Unknown Driver',
            'vehicle': f"{vehicle.manufacturer or ''} {vehicle.model or ''} #{vehicle.vehicle_number}".strip() if vehicle else 'Unknown Vehicle',
            'date': ride.start_time.strftime('%B %d, %Y') if ride.start_time else 'Unknown Date',
            'start_time': ride.start_time.strftime('%H:%M:%S') if ride.start_time else 'Not Available',
            'end_time': ride.end_time.strftime('%H:%M:%S') if ride.end_time else 'Not Available',
            'duration': format_duration(ride.duration_seconds),
            'distance': f'{ride.distance_km:.1f} km' if ride.distance_km else 'Not Available',
            'avg_speed': f'{ride.average_speed_kmh:.1f} km/h' if ride.average_speed_kmh else 'Not Available',
            'session_summary': ride_dict.get('session', {}),
        }
        
        pdf_bytes = generate_ride_report(report_data)
        
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
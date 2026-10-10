import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.extensions import get_db
from app.models import Company, Driver, Vehicle, User
from app.auth.sqlalchemy_store import SQLAlchemyUserStore
from app.auth.controller import get_current_user_id

logger = logging.getLogger(__name__)

fleet_router = APIRouter(prefix='/api/fleet')


# ── Pydantic models ────────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    name: str
    fleet_size: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    fleet_size: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None


class DriverCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    experience_years: Optional[int] = None
    driver_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    department: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    photo_url: Optional[str] = None


class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    experience_years: Optional[int] = None
    driver_type: Optional[str] = None
    assigned_vehicle_id: Optional[int] = None
    vehicle_number: Optional[str] = None
    department: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    photo_url: Optional[str] = None
    is_active: Optional[bool] = None


class VehicleCreate(BaseModel):
    vehicle_number: str
    registration_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    year: Optional[str] = None
    color: Optional[str] = None
    vin_number: Optional[str] = None
    department: Optional[str] = None
    insurance_company: Optional[str] = None
    policy_number: Optional[str] = None
    insurance_expiry: Optional[str] = None
    status: Optional[str] = "Active"


class VehicleUpdate(BaseModel):
    vehicle_number: Optional[str] = None
    registration_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    year: Optional[str] = None
    color: Optional[str] = None
    vin_number: Optional[str] = None
    assigned_driver_id: Optional[int] = None
    department: Optional[str] = None
    insurance_company: Optional[str] = None
    policy_number: Optional[str] = None
    insurance_expiry: Optional[str] = None
    status: Optional[str] = None


# ── Auth dependency ────────────────────────────────────────────────────────────
# get_current_user_id is imported from app.auth.controller


def get_user_company_ids(user_id: str, db: Session) -> List[int]:
    """
    Every company id this user owns.

    A user may own more than one, so this is a list and not a single id: the
    ride authorization layer already resolves all of them
    (RideService.get_permitted_company_ids), and fleet CRUD returning only the
    first meant an owner of two companies could start a ride using a driver from
    the second one while being unable to see or manage that driver here.
    """
    return [
        row[0] for row in
        db.query(Company.id).filter(Company.owner_id == int(user_id)).all()
    ]


def get_user_company_id(user_id: str, db: Session) -> Optional[int]:
    """
    The company a write should be attributed to.

    The first owned company, which is the only one `POST /api/fleet/company`
    lets a user create. Reads use get_user_company_ids so they are not silently
    limited to that single company.
    """
    company_ids = get_user_company_ids(user_id, db)
    return company_ids[0] if company_ids else None


# ── Company Routes ─────────────────────────────────────────────────────────────

@fleet_router.post('/company')
async def create_company(
    body: CompanyCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """POST /api/fleet/company - Create a company for the current user."""
    try:
        # Check if user already has a company
        existing = db.query(Company).filter(Company.owner_id == current_user_id).first()
        if existing:
            return JSONResponse({'success': False, 'message': 'User already has a company.'}, status_code=400)

        company = Company(
            name=body.name,
            fleet_size=body.fleet_size,
            country=body.country,
            industry=body.industry,
            owner_id=current_user_id,
        )
        db.add(company)
        db.commit()
        db.refresh(company)

        logger.info(f"Company created: id={company.id}, name={company.name}, owner={current_user_id}")

        return JSONResponse({
            'success': True,
            'message': 'Company created successfully.',
            'company': company_to_dict(company),
        }, status_code=201)

    except Exception as e:
        db.rollback()
        logger.error(f"Create company error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to create company.'}, status_code=500)


@fleet_router.get('/company')
async def get_company(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """GET /api/fleet/company - Get company for current user."""
    try:
        company = db.query(Company).filter(Company.owner_id == current_user_id).first()
        if not company:
            return JSONResponse({'success': True, 'company': None}, status_code=200)

        return JSONResponse({
            'success': True,
            'company': company_to_dict(company),
        }, status_code=200)
    except Exception as e:
        logger.error(f"Get company error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to get company.'}, status_code=500)


@fleet_router.put('/company')
async def update_company(
    body: CompanyUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """PUT /api/fleet/company - Update company for current user."""
    try:
        company = db.query(Company).filter(Company.owner_id == current_user_id).first()
        if not company:
            return JSONResponse({'success': False, 'message': 'Company not found.'}, status_code=404)

        for key, value in body.model_dump(exclude_unset=True).items():
            setattr(company, key, value)

        db.commit()
        db.refresh(company)

        return JSONResponse({
            'success': True,
            'message': 'Company updated successfully.',
            'company': company_to_dict(company),
        }, status_code=200)
    except Exception as e:
        db.rollback()
        logger.error(f"Update company error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to update company.'}, status_code=500)


def company_to_dict(company: Company) -> dict:
    return {
        'id': company.id,
        'name': company.name,
        'fleet_size': company.fleet_size,
        'country': company.country,
        'industry': company.industry,
        'owner_id': company.owner_id,
        'created_at': company.created_at.isoformat() if company.created_at else None,
        'updated_at': company.updated_at.isoformat() if company.updated_at else None,
    }


# ── Driver Routes ──────────────────────────────────────────────────────────────

@fleet_router.post('/drivers')
async def create_driver(
    body: DriverCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """POST /api/fleet/drivers - Create a new driver."""
    try:
        company_id = get_user_company_id(current_user_id, db)
        if not company_id:
            return JSONResponse({'success': False, 'message': 'No company found for user.'}, status_code=400)

        # Check for duplicate employee_id
        if body.employee_id:
            existing = db.query(Driver).filter(Driver.employee_id == body.employee_id, Driver.company_id == company_id).first()
            if existing:
                return JSONResponse({'success': False, 'message': 'Employee ID already exists.'}, status_code=400)

        # Check for duplicate email
        existing_email = db.query(Driver).filter(Driver.email == body.email, Driver.company_id == company_id).first()
        if existing_email:
            return JSONResponse({'success': False, 'message': 'Driver with this email already exists.'}, status_code=400)

        driver = Driver(
            company_id=company_id,
            full_name=body.full_name,
            email=body.email,
            phone=body.phone,
            employee_id=body.employee_id,
            gender=body.gender,
            license_number=body.license_number,
            driver_type=body.driver_type,
            # Accepted by the schema and offered by the UI, but never assigned
            # here, so the value the user entered was silently discarded while
            # the column stayed empty.
            experience_years=body.experience_years,
            vehicle_number=body.vehicle_number,
            department=body.department,
            emergency_contact_name=body.emergency_contact_name,
            emergency_contact_phone=body.emergency_contact_phone,
            emergency_contact_relationship=body.emergency_contact_relationship,
            photo_url=body.photo_url,
        )

        # Parse dates if provided
        if body.date_of_birth:
            try:
                driver.date_of_birth = datetime.fromisoformat(body.date_of_birth.replace('Z', '+00:00'))
            except:
                pass
        if body.license_expiry:
            try:
                driver.license_expiry = datetime.fromisoformat(body.license_expiry.replace('Z', '+00:00'))
            except:
                pass

        db.add(driver)
        db.commit()
        db.refresh(driver)

        logger.info(f"Driver created: id={driver.id}, name={driver.full_name}, company={company_id}")

        return JSONResponse({
            'success': True,
            'message': 'Driver created successfully.',
            'driver': driver_to_dict(driver),
        }, status_code=201)

    except Exception as e:
        db.rollback()
        logger.error(f"Create driver error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to create driver.'}, status_code=500)


@fleet_router.get('/drivers')
async def list_drivers(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """GET /api/fleet/drivers - List drivers for the user's companies."""
    try:
        company_ids = get_user_company_ids(current_user_id, db)
        if not company_ids:
            return JSONResponse({'success': True, 'drivers': [], 'total': 0}, status_code=200)

        query = db.query(Driver).filter(Driver.company_id.in_(company_ids))
        total = query.count()
        drivers = query.offset((page - 1) * page_size).limit(page_size).all()

        return JSONResponse({
            'success': True,
            'drivers': [driver_to_dict(d) for d in drivers],
            'total': total,
            'page': page,
            'page_size': page_size,
        }, status_code=200)
    except Exception as e:
        logger.error(f"List drivers error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to list drivers.'}, status_code=500)


@fleet_router.get('/drivers/{driver_id}')
async def get_driver(
    driver_id: int,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """GET /api/fleet/drivers/{driver_id} - Get driver details."""
    try:
        company_ids = get_user_company_ids(current_user_id, db)
        if not company_id:
            return JSONResponse({'success': False, 'message': 'No company found for user.'}, status_code=404)

        driver = db.query(Driver).filter(Driver.id == driver_id, Driver.company_id.in_(company_ids)).first()
        if not driver:
            return JSONResponse({'success': False, 'message': 'Driver not found.'}, status_code=404)

        return JSONResponse({
            'success': True,
            'driver': driver_to_dict(driver),
        }, status_code=200)
    except Exception as e:
        logger.error(f"Get driver error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to get driver.'}, status_code=500)


@fleet_router.put('/drivers/{driver_id}')
async def update_driver(
    driver_id: int,
    body: DriverUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """PUT /api/fleet/drivers/{driver_id} - Update driver."""
    try:
        company_ids = get_user_company_ids(current_user_id, db)
        if not company_id:
            return JSONResponse({'success': False, 'message': 'No company found for user.'}, status_code=404)

        driver = db.query(Driver).filter(Driver.id == driver_id, Driver.company_id.in_(company_ids)).first()
        if not driver:
            return JSONResponse({'success': False, 'message': 'Driver not found.'}, status_code=404)

        for key, value in body.model_dump(exclude_unset=True).items():
            if key in ('date_of_birth', 'license_expiry') and value:
                try:
                    value = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    continue
            setattr(driver, key, value)

        db.commit()
        db.refresh(driver)

        return JSONResponse({
            'success': True,
            'message': 'Driver updated successfully.',
            'driver': driver_to_dict(driver),
        }, status_code=200)
    except Exception as e:
        db.rollback()
        logger.error(f"Update driver error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to update driver.'}, status_code=500)


@fleet_router.delete('/drivers/{driver_id}')
async def delete_driver(
    driver_id: int,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """DELETE /api/fleet/drivers/{driver_id} - Delete driver."""
    try:
        company_ids = get_user_company_ids(current_user_id, db)
        if not company_id:
            return JSONResponse({'success': False, 'message': 'No company found for user.'}, status_code=404)

        driver = db.query(Driver).filter(Driver.id == driver_id, Driver.company_id.in_(company_ids)).first()
        if not driver:
            return JSONResponse({'success': False, 'message': 'Driver not found.'}, status_code=404)

        db.delete(driver)
        db.commit()

        return JSONResponse({
            'success': True,
            'message': 'Driver deleted successfully.',
        }, status_code=200)
    except Exception as e:
        db.rollback()
        logger.error(f"Delete driver error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to delete driver.'}, status_code=500)


def driver_to_dict(driver: Driver) -> dict:
    return {
        'id': driver.id,
        'company_id': driver.company_id,
        'user_id': driver.user_id,
        'employee_id': driver.employee_id,
        'full_name': driver.full_name,
        'email': driver.email,
        'phone': driver.phone,
        'date_of_birth': driver.date_of_birth.isoformat() if driver.date_of_birth else None,
        'gender': driver.gender,
        'license_number': driver.license_number,
        'license_expiry': driver.license_expiry.isoformat() if driver.license_expiry else None,
        'experience_years': driver.experience_years,
        'driver_type': driver.driver_type,
        'assigned_vehicle_id': driver.assigned_vehicle_id,
        'vehicle_number': driver.vehicle_number,
        'department': driver.department,
        'emergency_contact_name': driver.emergency_contact_name,
        'emergency_contact_phone': driver.emergency_contact_phone,
        'emergency_contact_relationship': driver.emergency_contact_relationship,
        'photo_url': driver.photo_url,
        'is_active': driver.is_active,
        'created_at': driver.created_at.isoformat() if driver.created_at else None,
        'updated_at': driver.updated_at.isoformat() if driver.updated_at else None,
    }


# ── Vehicle Routes ─────────────────────────────────────────────────────────────

@fleet_router.post('/vehicles')
async def create_vehicle(
    body: VehicleCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """POST /api/fleet/vehicles - Create a new vehicle."""
    try:
        company_id = get_user_company_id(current_user_id, db)
        if not company_id:
            return JSONResponse({'success': False, 'message': 'No company found for user.'}, status_code=400)

        # Check for duplicate vehicle_number
        existing = db.query(Vehicle).filter(Vehicle.vehicle_number == body.vehicle_number, Vehicle.company_id == company_id).first()
        if existing:
            return JSONResponse({'success': False, 'message': 'Vehicle number already exists.'}, status_code=400)

        vehicle = Vehicle(
            company_id=company_id,
            vehicle_number=body.vehicle_number,
            registration_number=body.registration_number,
            vehicle_type=body.vehicle_type,
            manufacturer=body.manufacturer,
            model=body.model,
            year=body.year,
            color=body.color,
            vin_number=body.vin_number,
            department=body.department,
            insurance_company=body.insurance_company,
            policy_number=body.policy_number,
            status=body.status or "Active",
        )

        if body.insurance_expiry:
            try:
                vehicle.insurance_expiry = datetime.fromisoformat(body.insurance_expiry.replace('Z', '+00:00'))
            except:
                pass

        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)

        logger.info(f"Vehicle created: id={vehicle.id}, number={vehicle.vehicle_number}, company={company_id}")

        return JSONResponse({
            'success': True,
            'message': 'Vehicle created successfully.',
            'vehicle': vehicle_to_dict(vehicle),
        }, status_code=201)

    except Exception as e:
        db.rollback()
        logger.error(f"Create vehicle error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to create vehicle.'}, status_code=500)


@fleet_router.get('/vehicles')
async def list_vehicles(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """GET /api/fleet/vehicles - List vehicles for user's company."""
    try:
        company_ids = get_user_company_ids(current_user_id, db)
        if not company_id:
            return JSONResponse({'success': True, 'vehicles': [], 'total': 0}, status_code=200)

        query = db.query(Vehicle).filter(Vehicle.company_id.in_(company_ids))
        total = query.count()
        vehicles = query.offset((page - 1) * page_size).limit(page_size).all()

        return JSONResponse({
            'success': True,
            'vehicles': [vehicle_to_dict(v) for v in vehicles],
            'total': total,
            'page': page,
            'page_size': page_size,
        }, status_code=200)
    except Exception as e:
        logger.error(f"List vehicles error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to list vehicles.'}, status_code=500)


@fleet_router.get('/vehicles/{vehicle_id}')
async def get_vehicle(
    vehicle_id: int,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """GET /api/fleet/vehicles/{vehicle_id} - Get vehicle details."""
    try:
        company_ids = get_user_company_ids(current_user_id, db)
        if not company_id:
            return JSONResponse({'success': False, 'message': 'No company found for user.'}, status_code=404)

        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.company_id.in_(company_ids)).first()
        if not vehicle:
            return JSONResponse({'success': False, 'message': 'Vehicle not found.'}, status_code=404)

        return JSONResponse({
            'success': True,
            'vehicle': vehicle_to_dict(vehicle),
        }, status_code=200)
    except Exception as e:
        logger.error(f"Get vehicle error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to get vehicle.'}, status_code=500)


@fleet_router.put('/vehicles/{vehicle_id}')
async def update_vehicle(
    vehicle_id: int,
    body: VehicleUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """PUT /api/fleet/vehicles/{vehicle_id} - Update vehicle."""
    try:
        company_ids = get_user_company_ids(current_user_id, db)
        if not company_id:
            return JSONResponse({'success': False, 'message': 'No company found for user.'}, status_code=404)

        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.company_id.in_(company_ids)).first()
        if not vehicle:
            return JSONResponse({'success': False, 'message': 'Vehicle not found.'}, status_code=404)

        for key, value in body.model_dump(exclude_unset=True).items():
            if key == 'insurance_expiry' and value:
                try:
                    value = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    continue
            setattr(vehicle, key, value)

        db.commit()
        db.refresh(vehicle)

        return JSONResponse({
            'success': True,
            'message': 'Vehicle updated successfully.',
            'vehicle': vehicle_to_dict(vehicle),
        }, status_code=200)
    except Exception as e:
        db.rollback()
        logger.error(f"Update vehicle error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to update vehicle.'}, status_code=500)


@fleet_router.delete('/vehicles/{vehicle_id}')
async def delete_vehicle(
    vehicle_id: int,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """DELETE /api/fleet/vehicles/{vehicle_id} - Delete vehicle."""
    try:
        company_ids = get_user_company_ids(current_user_id, db)
        if not company_id:
            return JSONResponse({'success': False, 'message': 'No company found for user.'}, status_code=404)

        vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.company_id.in_(company_ids)).first()
        if not vehicle:
            return JSONResponse({'success': False, 'message': 'Vehicle not found.'}, status_code=404)

        db.delete(vehicle)
        db.commit()

        return JSONResponse({
            'success': True,
            'message': 'Vehicle deleted successfully.',
        }, status_code=200)
    except Exception as e:
        db.rollback()
        logger.error(f"Delete vehicle error: {e}")
        return JSONResponse({'success': False, 'message': 'Failed to delete vehicle.'}, status_code=500)


def vehicle_to_dict(vehicle: Vehicle) -> dict:
    return {
        'id': vehicle.id,
        'company_id': vehicle.company_id,
        'vehicle_number': vehicle.vehicle_number,
        'registration_number': vehicle.registration_number,
        'vehicle_type': vehicle.vehicle_type,
        'manufacturer': vehicle.manufacturer,
        'model': vehicle.model,
        'year': vehicle.year,
        'color': vehicle.color,
        'vin_number': vehicle.vin_number,
        'assigned_driver_id': vehicle.assigned_driver_id,
        'department': vehicle.department,
        'insurance_company': vehicle.insurance_company,
        'policy_number': vehicle.policy_number,
        'insurance_expiry': vehicle.insurance_expiry.isoformat() if vehicle.insurance_expiry else None,
        'status': vehicle.status,
        'created_at': vehicle.created_at.isoformat() if vehicle.created_at else None,
        'updated_at': vehicle.updated_at.isoformat() if vehicle.updated_at else None,
    }


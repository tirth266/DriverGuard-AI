from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Integer, String, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum, Float, Index
from sqlalchemy.orm import mapped_column, Mapped, relationship
from enum import Enum
from app.extensions import Base


class RideStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EventSource(str, Enum):
    YOLO = "yolo"
    MEDIAPIPE = "mediapipe"


class Company(Base):
    __tablename__ = 'companies'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    fleet_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner: Mapped["User"] = relationship("User", back_populates="companies")
    drivers: Mapped[list["Driver"]] = relationship("Driver", back_populates="company", cascade="all, delete-orphan")
    vehicles: Mapped[list["Vehicle"]] = relationship("Vehicle", back_populates="company", cascade="all, delete-orphan")
    rides: Mapped[list["Ride"]] = relationship("Ride", back_populates="company", cascade="all, delete-orphan")


class Driver(Base):
    __tablename__ = 'drivers'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey('companies.id'), nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('users.id'), nullable=True)
    employee_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, unique=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    date_of_birth: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    license_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    license_expiry: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    experience_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    driver_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    assigned_vehicle_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('vehicles.id'), nullable=True)
    vehicle_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    emergency_contact_relationship: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    company: Mapped["Company"] = relationship("Company", back_populates="drivers")
    user: Mapped[Optional["User"]] = relationship("User")
    assigned_vehicle: Mapped[Optional["Vehicle"]] = relationship("Vehicle", foreign_keys=[assigned_vehicle_id])
    rides: Mapped[list["Ride"]] = relationship("Ride", back_populates="driver")


class Vehicle(Base):
    __tablename__ = 'vehicles'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey('companies.id'), nullable=False)
    vehicle_number: Mapped[str] = mapped_column(String(50), nullable=False)
    registration_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    vehicle_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    manufacturer: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    year: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    vin_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    assigned_driver_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('drivers.id'), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    insurance_company: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    policy_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    insurance_expiry: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    company: Mapped["Company"] = relationship("Company", back_populates="vehicles")
    assigned_driver: Mapped[Optional["Driver"]] = relationship("Driver", foreign_keys=[assigned_driver_id])
    rides: Mapped[list["Ride"]] = relationship("Ride", back_populates="vehicle")


class Ride(Base):
    __tablename__ = 'rides'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey('companies.id'), nullable=False)
    driver_id: Mapped[int] = mapped_column(Integer, ForeignKey('drivers.id'), nullable=False)
    vehicle_id: Mapped[int] = mapped_column(Integer, ForeignKey('vehicles.id'), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(SQLEnum(RideStatus), default=RideStatus.ACTIVE)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    distance_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    average_speed_kmh: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_speed_kmh: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    start_location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    end_location: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    company: Mapped["Company"] = relationship("Company", back_populates="rides")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="rides")
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="rides")
    user: Mapped["User"] = relationship("User")
    events: Mapped[list["RideEvent"]] = relationship("RideEvent", back_populates="ride", cascade="all, delete-orphan")


class RideEvent(Base):
    __tablename__ = 'ride_events'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ride_id: Mapped[int] = mapped_column(Integer, ForeignKey('rides.id'), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    source: Mapped[str] = mapped_column(SQLEnum(EventSource), nullable=False)
    start_timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    max_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    min_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    avg_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    event_metadata: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    ride: Mapped["Ride"] = relationship("Ride", back_populates="events")

    __table_args__ = (
        Index('ix_ride_events_ride_id', 'ride_id'),
        Index('ix_ride_events_event_type', 'event_type'),
        Index('ix_ride_events_source', 'source'),
    )
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Integer, String, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum, Float, Index, inspect, text
from sqlalchemy.orm import mapped_column, Mapped, relationship
from enum import Enum
from app.extensions import Base

logger = logging.getLogger(__name__)


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
    # A fleet ride points at the company, driver and vehicle it belongs to. A
    # personal ride belongs to its user alone: that user has no company and no
    # fleet records, and inventing them for them would put a ride on somebody
    # else's driver. These three are therefore nullable, and a row with all
    # three NULL is exactly a personal ride.
    company_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('companies.id'), nullable=True)
    driver_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('drivers.id'), nullable=True)
    vehicle_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey('vehicles.id'), nullable=True)
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
    # The ride's final report, frozen when the ride is ended. `final_score` and
    # `grade` are the session's own output, kept as columns so they can be listed
    # without decoding the summary; `session_summary` is that output verbatim, so
    # a finished ride's events, breakdown and timeline survive the in-memory
    # session being discarded. All three stay NULL for a ride that was never
    # scored, which is how an unscored ride is told apart from a clean one.
    final_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    grade: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    session_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    company: Mapped[Optional["Company"]] = relationship("Company", back_populates="rides")
    driver: Mapped[Optional["Driver"]] = relationship("Driver", back_populates="rides")
    vehicle: Mapped[Optional["Vehicle"]] = relationship("Vehicle", back_populates="rides")
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


# The ride-summary columns, as (name, SQL type fragment) pairs. Single source of
# truth for both the model above and the additive migration below.
RIDE_SUMMARY_COLUMNS = (
    ('final_score', 'INTEGER'),
    ('grade', 'VARCHAR(20)'),
    ('session_summary', 'TEXT'),
)

# The `rides` columns a personal ride does not have: a personal user owns no
# company and has no fleet driver or vehicle record, so these are the three
# columns whose NOT NULL has to be relaxed for a personal ride to be storable.
PERSONAL_RIDE_COLUMNS = ('company_id', 'driver_id', 'vehicle_id')


def ensure_personal_ride_columns(bind) -> None:
    """
    Relax `rides.company_id` / `driver_id` / `vehicle_id` to nullable.

    A ride that belongs to a personal user has no company, driver or vehicle of
    its own. With those three columns NOT NULL, such a ride cannot be written at
    all, so a personal user could not start a ride and no rideId ever existed
    for them to end. The alternative — filling the columns with some other
    tenant's records — is what this replaces, so the columns are made nullable
    rather than populated with an arbitrary driver.

    A row with all three NULL is therefore a personal ride and a row with all
    three set is a fleet ride; `rides.user_id` owns the ride either way and is
    what every ownership check reads.

    On SQLite, which cannot drop a NOT NULL constraint, the table is rebuilt
    from the model definition and its rows copied across, so the columns and the
    data in them are preserved. On a server engine it is the equivalent ALTER.
    """
    try:
        existing = {column['name']: column for column in inspect(bind).get_columns('rides')}
        if not existing:
            return
        blocking = [
            name for name in PERSONAL_RIDE_COLUMNS
            if name in existing and not existing[name].get('nullable', True)
        ]
        if not blocking:
            return

        if bind.dialect.name == 'sqlite':
            _rebuild_rides_for_personal(bind, existing)
        else:
            with bind.begin() as connection:
                for name in blocking:
                    connection.execute(text(f'ALTER TABLE rides ALTER COLUMN {name} DROP NOT NULL'))
                    logger.info("[Schema] rides.%s is now nullable", name)
    except Exception as e:
        # Reported, not fatal. Left as NOT NULL, starting a personal ride fails at
        # its own call site with an actionable error instead of the server
        # refusing to come up.
        logger.error("[Schema] Could not make the rides fleet columns nullable: %s", e)


def _rebuild_rides_for_personal(bind, existing: dict) -> None:
    """Rebuild `rides` from the model definition, preserving its rows."""
    # Copied only across the columns both tables have, so a database that predates
    # the ride-summary columns is carried over without inventing values for them.
    shared = [column.name for column in Ride.__table__.columns if column.name in existing]
    if not shared:
        return

    legacy = 'rides__personal_migration'
    column_list = ', '.join(shared)
    with bind.connect() as probe:
        index_sql = [
            row[0] for row in probe.exec_driver_sql(
                "SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'rides' AND sql IS NOT NULL"
            )
        ]

    with bind.begin() as connection:
        # legacy_alter_table keeps the rename from rewriting `ride_events`' foreign
        # key to point at the temporary table; foreign_keys is off so the rename
        # and the drop are not blocked by the rows that reference this table.
        connection.exec_driver_sql('PRAGMA foreign_keys=OFF')
        connection.exec_driver_sql('PRAGMA legacy_alter_table=ON')
        try:
            connection.exec_driver_sql(f'ALTER TABLE rides RENAME TO {legacy}')
            Ride.__table__.create(bind=connection)
            connection.exec_driver_sql(
                f'INSERT INTO rides ({column_list}) SELECT {column_list} FROM {legacy}'
            )
            connection.exec_driver_sql(f'DROP TABLE {legacy}')
            for statement in index_sql:
                connection.exec_driver_sql(statement)
        finally:
            connection.exec_driver_sql('PRAGMA legacy_alter_table=OFF')
            connection.exec_driver_sql('PRAGMA foreign_keys=ON')

    logger.info("[Schema] rides fleet columns are now nullable")


def ensure_ride_summary_columns(bind) -> None:
    """
    Add the ride-summary columns to a `rides` table that predates them.

    `Base.metadata.create_all` only creates missing tables, so an existing
    database keeps the old `rides` shape and every read of a finished ride's
    score would fail. `ALTER TABLE ... ADD COLUMN` is additive and is the same
    on SQLite and on a server engine, so it is safe to run unconditionally on an
    existing installation and is a no-op once the columns are there.
    """
    try:
        existing = {column['name'] for column in inspect(bind).get_columns('rides')}
        missing = [(name, sql_type) for name, sql_type in RIDE_SUMMARY_COLUMNS if name not in existing]
        if not missing:
            return
        with bind.begin() as connection:
            for name, sql_type in missing:
                connection.execute(text(f'ALTER TABLE rides ADD COLUMN {name} {sql_type}'))
                logger.info("[Schema] Added rides.%s", name)
    except Exception as e:
        # Reported, not fatal: a read of the summary fails loudly at its own call
        # site, which is a better outcome than refusing to start the server.
        logger.error(f"[Schema] Could not add the rides summary columns: {e}")


def parse_session_summary(raw: Optional[str]) -> Optional[dict]:
    """Decode a stored ride summary, or None when the ride has none."""
    if not raw:
        return None
    try:
        decoded = json.loads(raw)
    except (TypeError, ValueError):
        return None
    return decoded if isinstance(decoded, dict) else None
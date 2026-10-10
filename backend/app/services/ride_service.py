"""
Ride and Event persistence service.
Handles ride lifecycle and event storage.
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models import Ride, RideEvent, RideStatus, EventSource, Driver, Vehicle, Company
from app.models.fleet import parse_session_summary
from app.extensions import SessionLocal


class RideAuthorizationError(Exception):
    """
    A ride was refused because the caller may not act on the ids it supplied.

    Carries the status the endpoint should answer with, so the refusal reason
    stays a decision of this layer rather than of the route.
    """

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


class RideService:
    """Service for managing rides and events persistence."""

    def __init__(self, session: Session = None):
        self._session = session
        self._owns_session = session is None

    def _get_session(self) -> Session:
        if self._session is None:
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

# ── Ride operations ────────────────────────────────────────────────

    def create_ride(
        self,
        user_id: int,
        driver_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
        company_id: Optional[int] = None,
        start_location: Optional[dict] = None,
    ) -> Ride:
        """
        Create a new active ride.

        The three fleet columns are left unset for a personal ride, which is the
        only kind of ride that has no driver or vehicle of its own.
        """
        import json
        session = self._get_session()
        location_str = json.dumps(start_location) if start_location else None
        ride = Ride(
            user_id=user_id,
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            company_id=company_id,
            start_time=datetime.now(timezone.utc),
            start_location=location_str,
            status=RideStatus.ACTIVE,
        )
        session.add(ride)
        session.flush()
        return ride

    def end_ride(
        self,
        ride_id: int,
        end_location: Optional[dict] = None,
        session_summary: Optional[Dict[str, Any]] = None,
    ) -> Optional[Ride]:
        """
        End an active ride and finalize metrics.

        `session_summary` is the ride's final report, taken from its own session
        before that session is discarded. It is stored on the ride rather than
        returned once and forgotten, because it is the only place a finished
        ride's score, grade, events and timeline survive to be read again.
        """
        import json
        session = self._get_session()
        ride = session.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            return None
        if ride.status != RideStatus.ACTIVE:
            return ride

        ride.end_time = datetime.now(timezone.utc)
        ride.end_location = json.dumps(end_location) if end_location else None
        ride.status = RideStatus.COMPLETED
        if session_summary is not None:
            ride.final_score = session_summary.get('final_score')
            ride.grade = session_summary.get('grade')
            ride.session_summary = json.dumps(session_summary)
        if ride.start_time:
            start_ts = ride.start_time
            end_ts = ride.end_time
            if start_ts.tzinfo is None and end_ts.tzinfo is not None:
                start_ts = start_ts.replace(tzinfo=timezone.utc)
            elif start_ts.tzinfo is not None and end_ts.tzinfo is None:
                end_ts = end_ts.replace(tzinfo=timezone.utc)
            duration = (end_ts - start_ts).total_seconds()
            ride.duration_seconds = int(duration)
        session.flush()
        return ride

    @staticmethod
    def session_summary_for(ride: Ride) -> Optional[Dict[str, Any]]:
        """The final report stored on a ride, or None when it never scored one."""
        return parse_session_summary(ride.session_summary)

    def get_permitted_company_ids(self, user_id: int) -> List[int]:
        """
        Company ids the given user is allowed to act on.

        Ownership is the only link from a user to a fleet in this schema, so it
        is resolved here from the database and never taken from the request.
        A user may own several companies, so this is a set and not a single id.
        """
        session = self._get_session()
        return [
            row[0]
            for row in session.query(Company.id).filter(Company.owner_id == user_id).all()
        ]

    def resolve_authorized_actor(
        self,
        user_id: int,
        driver_id: Optional[int] = None,
        vehicle_id: Optional[int] = None,
    ) -> Tuple[Optional[Driver], Optional[Vehicle], Optional[Company]]:
        """
        Resolve the driver, vehicle and company a ride may be created for.

        Two distinct rides, never mixed:

        - A **fleet ride** names a driver and a vehicle. Every lookup is
          constrained to a company the caller owns, resolved from the database.
          A driver or vehicle that exists but sits in another company's fleet is
          reported exactly like one that does not exist, so this cannot be used
          to probe another tenant's ids, and the driver and vehicle must resolve
          to the same company so the two can never be mixed across fleets.
        - A **personal ride** names neither. It belongs to the caller's account
          alone, which is what a user with no fleet setup needs in order to ride
          at all; the three returned values are then all None. It is available
          only to a caller who owns no company, so a fleet operator is never
          silently given a ride that belongs to no fleet — they get the fleet
          error telling them which records to add.

        Raises RideAuthorizationError when the ids are not usable by this
        caller; the caller turns that into the response.
        """
        session = self._get_session()
        permitted_company_ids = self.get_permitted_company_ids(user_id)

        if driver_id is None and vehicle_id is None:
            if permitted_company_ids:
                raise RideAuthorizationError(
                    400,
                    'This account manages a fleet, so a ride needs a driver and a vehicle from it. '
                    'Add them in your fleet dashboard first, or start the ride from the personal '
                    'workspace to record a ride of your own.',
                )
            return None, None, None

        if driver_id is None or vehicle_id is None:
            raise RideAuthorizationError(400, 'A fleet ride needs both a driver and a vehicle.')

        driver = None
        if permitted_company_ids:
            driver = session.query(Driver).filter(
                Driver.id == driver_id,
                Driver.company_id.in_(permitted_company_ids),
            ).first()
        if not driver:
            # Same response for "does not exist" and "belongs to someone else".
            raise RideAuthorizationError(404, 'Driver not found.')

        vehicle = session.query(Vehicle).filter(
            Vehicle.id == vehicle_id,
            Vehicle.company_id.in_(permitted_company_ids),
        ).first()
        if not vehicle:
            raise RideAuthorizationError(404, 'Vehicle not found.')

        if vehicle.company_id != driver.company_id:
            # Both records are readable by this caller but they are two
            # different fleets, so the pair is refused rather than silently
            # re-pointed at whichever company the driver happens to be in.
            raise RideAuthorizationError(
                403, 'Driver and vehicle must belong to the same company.'
            )

        company = session.query(Company).filter(Company.id == driver.company_id).first()
        if not company:
            raise RideAuthorizationError(404, 'Driver not found.')

        return driver, vehicle, company

    def get_ride(self, ride_id: int) -> Optional[Ride]:
        """Get ride by ID with events loaded."""
        session = self._get_session()
        return session.query(Ride).filter(Ride.id == ride_id).first()

    def get_rides_for_user(self, user_id: int, limit: int = 50) -> List[Ride]:
        """Get rides for a user."""
        session = self._get_session()
        return (
            session.query(Ride)
            .filter(Ride.user_id == user_id)
            .order_by(desc(Ride.start_time))
            .limit(limit)
            .all()
        )

    def get_rides_for_company(self, company_id: int, limit: int = 100) -> List[Ride]:
        """Get rides for a company."""
        session = self._get_session()
        return (
            session.query(Ride)
            .filter(Ride.company_id == company_id)
            .order_by(desc(Ride.start_time))
            .limit(limit)
            .all()
        )

    def get_active_ride_for_driver(self, driver_id: int) -> Optional[Ride]:
        """Get active ride for a driver."""
        session = self._get_session()
        return (
            session.query(Ride)
            .filter(Ride.driver_id == driver_id, Ride.status == RideStatus.ACTIVE)
            .first()
        )

    def get_active_ride_for_user(self, user_id: int) -> Optional[Ride]:
        """Get active ride for a user."""
        session = self._get_session()
        return (
            session.query(Ride)
            .filter(Ride.user_id == user_id, Ride.status == RideStatus.ACTIVE)
            .first()
        )

    # ── Event operations ───────────────────────────────────────────────

    def create_event(
        self,
        ride_id: int,
        event_type: str,
        source: EventSource,
        start_timestamp: datetime,
        max_confidence: Optional[float] = None,
        min_score: Optional[int] = None,
        avg_score: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> RideEvent:
        """Create a new ride event."""
        session = self._get_session()
        import json
        event = RideEvent(
            ride_id=ride_id,
            event_type=event_type,
            source=source,
            start_timestamp=start_timestamp,
            max_confidence=max_confidence,
            min_score=min_score,
            avg_score=avg_score,
            event_metadata=json.dumps(metadata) if metadata else None,
        )
        session.add(event)
        session.flush()

        # Update ride event count
        ride = session.query(Ride).filter(Ride.id == ride_id).first()
        if ride:
            ride.event_count = (ride.event_count or 0) + 1
            session.flush()

        return event

    def close_event(
        self,
        ride_id: int,
        event_type: str,
        end_timestamp: datetime,
        max_confidence: Optional[float] = None,
    ) -> Optional[RideEvent]:
        """Close an open event (update end time and duration)."""
        session = self._get_session()
        event = (
            session.query(RideEvent)
            .filter(
                RideEvent.ride_id == ride_id,
                RideEvent.event_type == event_type,
                RideEvent.end_timestamp.is_(None),
            )
            .order_by(desc(RideEvent.start_timestamp))
            .first()
        )
        if not event:
            return None

        event.end_timestamp = end_timestamp
        # Handle timezone-aware vs naive datetime comparison
        start_ts = event.start_timestamp
        if start_ts.tzinfo is None and end_timestamp.tzinfo is not None:
            start_ts = start_ts.replace(tzinfo=timezone.utc)
        elif start_ts.tzinfo is not None and end_timestamp.tzinfo is None:
            end_timestamp = end_timestamp.replace(tzinfo=timezone.utc)
        event.duration_seconds = (end_timestamp - start_ts).total_seconds()
        if max_confidence is not None and (event.max_confidence is None or max_confidence > event.max_confidence):
            event.max_confidence = max_confidence
        session.flush()
        return event

    def get_events_for_ride(self, ride_id: int) -> List[RideEvent]:
        """Get all events for a ride."""
        session = self._get_session()
        return (
            session.query(RideEvent)
            .filter(RideEvent.ride_id == ride_id)
            .order_by(RideEvent.start_timestamp)
            .all()
        )

    def get_open_events_for_ride(self, ride_id: int) -> List[RideEvent]:
        """Get open (not ended) events for a ride."""
        session = self._get_session()
        return (
            session.query(RideEvent)
            .filter(RideEvent.ride_id == ride_id, RideEvent.end_timestamp.is_(None))
            .all()
        )

    def close_all_open_events(self, ride_id: int, end_timestamp: datetime) -> List[RideEvent]:
        """Close all open events for a ride."""
        session = self._get_session()
        events = self.get_open_events_for_ride(ride_id)
        for event in events:
            event.end_timestamp = end_timestamp
            start_ts = event.start_timestamp
            if start_ts.tzinfo is None and end_timestamp.tzinfo is not None:
                start_ts = start_ts.replace(tzinfo=timezone.utc)
            elif start_ts.tzinfo is not None and end_timestamp.tzinfo is None:
                end_timestamp = end_timestamp.replace(tzinfo=timezone.utc)
            event.duration_seconds = (end_timestamp - start_ts).total_seconds()
        session.flush()
        return events

    # ── Helpers ────────────────────────────────────────────────────────

    def ride_to_dict(self, ride: Ride) -> Dict[str, Any]:
        """Convert ride to dict with events."""
        import json
        events = self.get_events_for_ride(ride.id)
        
        def parse_location(loc_str: Optional[str]) -> Optional[dict]:
            if not loc_str:
                return None
            try:
                return json.loads(loc_str)
            except:
                return None
        
        return {
            'id': ride.id,
            'user_id': ride.user_id,
            'driver_id': ride.driver_id,
            'vehicle_id': ride.vehicle_id,
            'company_id': ride.company_id,
            'start_time': ride.start_time.isoformat() if ride.start_time else None,
            'end_time': ride.end_time.isoformat() if ride.end_time else None,
            'status': ride.status.value if ride.status else None,
            'duration_seconds': ride.duration_seconds,
            'distance_km': ride.distance_km,
            'average_speed_kmh': ride.average_speed_kmh,
            'max_speed_kmh': ride.max_speed_kmh,
            'start_location': parse_location(ride.start_location),
            'end_location': parse_location(ride.end_location),
            'event_count': ride.event_count,
            'final_score': ride.final_score,
            'grade': ride.grade,
            # The ride's final report, keyed so a caller can read one completed
            # ride without touching the live monitoring session at all.
            'session_summary': self.session_summary_for(ride),
            'events': [self.event_to_dict(e) for e in events],
            'created_at': ride.created_at.isoformat() if ride.created_at else None,
        }

    def event_to_dict(self, event: RideEvent) -> Dict[str, Any]:
        """Convert event to dict."""
        import json
        return {
            'id': event.id,
            'ride_id': event.ride_id,
            'event_type': event.event_type,
            'source': event.source.value if event.source else None,
            'start_timestamp': event.start_timestamp.isoformat() if event.start_timestamp else None,
            'end_timestamp': event.end_timestamp.isoformat() if event.end_timestamp else None,
            'duration_seconds': event.duration_seconds,
            'max_confidence': event.max_confidence,
            'min_score': event.min_score,
            'avg_score': event.avg_score,
            'metadata': json.loads(event.event_metadata) if event.event_metadata else None,
            'created_at': event.created_at.isoformat() if event.created_at else None,
        }


# Global instance
ride_service = RideService()
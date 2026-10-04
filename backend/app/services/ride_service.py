"""
Ride and Event persistence service.
Handles ride lifecycle and event storage.
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models import Ride, RideEvent, RideStatus, EventSource, Driver, Vehicle, Company
from app.extensions import SessionLocal


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
        driver_id: int,
        vehicle_id: int,
        company_id: int,
        start_location: Optional[dict] = None,
    ) -> Ride:
        """Create a new active ride."""
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

    def end_ride(self, ride_id: int, end_location: Optional[dict] = None) -> Optional[Ride]:
        """End an active ride and finalize metrics."""
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
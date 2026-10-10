"""
Session-scoped AI state management for DriverGuard AI.
Replaces global mutable state with per-user/per-ride isolated state.
"""
import time
import threading
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Deque, Dict, List, Optional

from app.ai.scoring import START_SCORE, grade_for, score_from_events

SCORE_TIMELINE_INTERVAL_SECONDS = 5.0
SCORE_TIMELINE_MAX_SAMPLES = 240
# Guards against inflating the clean-recovery credit after long idle gaps.
MAX_CLEAN_CREDIT_STEP_SECONDS = 2.0
# A confirmed track is only dropped after this many seconds without a match.
TRACK_CLEAR_SECONDS = 1.5
# A confirmed track must also have seen one detection at or above its enter
# threshold inside this window. A long run of weaker matches (a phone read at
# 28% over a glasses case, say) therefore revives nothing: the track dies at the
# same TRACK_CLEAR_SECONDS clear, with a hard deadline instead of a soft one.
TRACK_REVALIDATE_SECONDS = 1.5
# An unmatched track whose box sits on a detected hand is carried this long,
# because a hand covering the object is not evidence that it left the cabin.
TRACK_OCCLUSION_SECONDS = 3.0
# Confirmation rule, shared by every tracked class: seen in CONFIRM_MIN_HITS of
# the last CONFIRM_WINDOW_YOLO_RUNS YOLO runs (hits need not be consecutive).
CONFIRM_WINDOW_YOLO_RUNS = 4
CONFIRM_MIN_HITS = 2
# Log averaged timings every N frames.
PERF_LOG_EVERY_N_FRAMES = 30


@dataclass
class Track:
    """One tracked cabin object. Lives inside SessionState so it is never shared."""

    track_id: str
    class_name: str
    category: str
    bbox: Dict[str, int]
    confidence: float
    last_matched: float
    # Confidence of the last matched detection, and the monotonic time of the last
    # match at or above this track's enter threshold. A run of weaker matches may
    # keep a track alive but must never be what keeps it confirmed.
    last_match_conf: float
    last_strong_match: float
    hits: Deque[bool] = field(default_factory=lambda: deque(maxlen=CONFIRM_WINDOW_YOLO_RUNS))
    confirmed: bool = False
    occluded: bool = False

    def clear_occlusion(self) -> None:
        self.occluded = False


@dataclass
class AIEvent:
    """Represents an active or completed AI event."""
    event_type: str
    start_time: float
    end_time: float
    max_confidence: Optional[float]
    min_score: int
    source: str  # "yolo", "mediapipe" or "inferred"
    min_measurement: Optional[float] = None

    @property
    def duration(self) -> float:
        return max(0.0, self.end_time - self.start_time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.event_type,
            "source": self.source,
            "start_time": round(self.start_time, 2),
            "end_time": round(self.end_time, 2),
            "duration": round(self.duration, 2),
            "max_confidence": round(self.max_confidence, 4) if self.max_confidence is not None else None,
            "min_measurement": round(self.min_measurement, 4) if self.min_measurement is not None else None,
            "min_score": int(self.min_score),
        }


@dataclass
class SessionState:
    """Per-session AI state, isolated from other sessions."""

    user_id: str
    ride_id: Optional[int] = None
    session_start_time: float = field(default_factory=time.time)
    last_activity_time: float = field(default_factory=time.time)
    last_timeline_sample: float = field(default_factory=time.time)
    score: int = int(START_SCORE)
    grade: str = grade_for(START_SCORE)
    lowest_session_score: int = int(START_SCORE)
    clean_seconds: float = 0.0
    # How many frames this session has actually scored. A session that never
    # scored one holds START_SCORE only because nothing was ever measured, which
    # is what separates "no riding happened" from "a clean ride was measured".
    scored_frames: int = 0
    # Set once the ride this session belongs to has been ended. From that point
    # the session is frozen and its summary is the ride's final report, so a
    # frame that lands late cannot extend or re-score a ride that is already
    # closed.
    finalized: bool = False
    score_timeline: Deque[Dict[str, Any]] = field(
        default_factory=lambda: deque(maxlen=SCORE_TIMELINE_MAX_SAMPLES)
    )
    active_events: Dict[str, AIEvent] = field(default_factory=dict)
    completed_events: List[AIEvent] = field(default_factory=list)
    # Greedy-IoU object tracks for this session only.
    tracks: Dict[str, Track] = field(default_factory=dict)
    track_counter: int = 0
    # Monotonic clocks: last frame handled, last time YOLO actually ran.
    last_frame_monotonic: float = field(default_factory=time.monotonic)
    last_yolo_monotonic: float = 0.0
    yolo_runs: int = 0
    # Timings accumulators (per session, so two users never share counters).
    perf_frames: int = 0
    perf_totals: Dict[str, float] = field(default_factory=dict)
    # Temporal interpretation state owned by the MediaPipe service.
    signal_state: Dict[str, Any] = field(default_factory=dict)
    # Re-entrant: tracking holds the lock while allocating track ids.
    _lock: threading.RLock = field(default_factory=threading.RLock, repr=False)

    # Event type ownership
    YOLO_EVENT_TYPES: frozenset = frozenset({"phone_use", "drinking_eating"})
    MEDIAPIPE_EVENT_TYPES: frozenset = frozenset({
        "eyes_closed", "drowsy", "head_away", "head_down", "yawn",
    })
    # Landmark inferences with no object-detection evidence behind them.
    INFERRED_EVENT_TYPES: frozenset = frozenset({"phone_call_suspected"})

    def _source_for(self, event_type: str) -> str:
        if event_type in self.YOLO_EVENT_TYPES:
            return "yolo"
        if event_type in self.INFERRED_EVENT_TYPES:
            return "inferred"
        return "mediapipe"

    def next_track_id(self) -> str:
        """Allocate a track id inside this session."""
        with self._lock:
            self.track_counter += 1
            return f"t{self.track_counter}"

    def record_perf(self, timings: Dict[str, float]) -> bool:
        """Accumulate frame timings. Returns True when the caller should log averages."""
        with self._lock:
            self.perf_frames += 1
            for key, value in timings.items():
                self.perf_totals[key] = self.perf_totals.get(key, 0.0) + value
            if self.perf_frames < PERF_LOG_EVERY_N_FRAMES:
                return False
            self.perf_frames = 0
            self.perf_totals = {}
            return True

    def average_perf(self) -> Dict[str, float]:
        with self._lock:
            return dict(self.perf_totals)

    # ── Events ──────────────────────────────────────────────────────────────

    def update_events(
        self,
        active_detections: Dict[str, Optional[float]],
        current_time: float,
        owned_types: Optional[frozenset] = None,
        measurements: Optional[Dict[str, float]] = None,
        ride_service=None,
    ) -> None:
        """Merge continuous confirmed detections and close events on absence."""
        with self._lock:
            # The ride is over: its report has already been taken, so nothing
            # arriving now may be added to it or written to its event records.
            if self.finalized:
                return
            for event_type, confidence in active_detections.items():
                measurement = (measurements or {}).get(event_type)
                event = self.active_events.get(event_type)

                if event is None:
                    event = AIEvent(
                        event_type=event_type,
                        start_time=current_time,
                        end_time=current_time,
                        max_confidence=confidence,
                        min_score=self.score,
                        source=self._source_for(event_type),
                        min_measurement=measurement,
                    )
                    self.active_events[event_type] = event
                    if self.ride_id is not None and ride_service:
                        self._persist_event_start(ride_service, event)
                    continue

                event.end_time = current_time
                if confidence is not None:
                    event.max_confidence = max(event.max_confidence or 0.0, confidence)
                if measurement is not None:
                    event.min_measurement = (
                        measurement if event.min_measurement is None
                        else min(event.min_measurement, measurement)
                    )
                event.min_score = min(event.min_score, self.score)

            for event_type in list(self.active_events):
                if event_type in active_detections:
                    continue
                if owned_types is not None and event_type not in owned_types:
                    continue
                event = self.active_events.pop(event_type)
                self.completed_events.append(event)
                if self.ride_id is not None and ride_service:
                    self._persist_event_end(ride_service, event_type, current_time, event.max_confidence)

    def _persist_event_start(self, ride_service, event: AIEvent) -> None:
        try:
            from datetime import datetime, timezone

            from app.models import EventSource
            source = EventSource.YOLO if event.source == "yolo" else EventSource.MEDIAPIPE
            ride_service.create_event(
                ride_id=self.ride_id,
                event_type=event.event_type,
                source=source,
                start_timestamp=datetime.fromtimestamp(event.start_time, tz=timezone.utc),
                max_confidence=event.max_confidence,
                min_score=event.min_score,
                avg_score=float(event.min_score),
            )
            ride_service.commit()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to persist event start: {e}")
            ride_service.rollback()

    def _persist_event_end(self, ride_service, event_type: str, end_time: float, max_confidence: Optional[float]) -> None:
        try:
            from datetime import datetime, timezone

            ride_service.close_event(
                ride_id=self.ride_id,
                event_type=event_type,
                end_timestamp=datetime.fromtimestamp(end_time, tz=timezone.utc),
                max_confidence=max_confidence,
            )
            ride_service.commit()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to persist event end: {e}")
            ride_service.rollback()

    # ── Scoring & summary ───────────────────────────────────────────────────

    def all_event_dicts(self) -> List[Dict[str, Any]]:
        with self._lock:
            events = [event.to_dict() for event in self.completed_events]
            events.extend(event.to_dict() for event in self.active_events.values())
            return events

    def apply_score(self, current_time: float) -> int:
        """Recompute the session score from confirmed events plus clean credit."""
        with self._lock:
            if self.finalized:
                return self.score
            if not self.active_events:
                step = min(MAX_CLEAN_CREDIT_STEP_SECONDS, max(0.0, current_time - self.last_activity_time))
                self.clean_seconds += step
            self.last_activity_time = current_time

            events = [event.to_dict() for event in self.completed_events]
            events.extend(event.to_dict() for event in self.active_events.values())
            result = score_from_events(events, self.clean_seconds)

            self.score = result["score"]
            self.grade = result["grade"]
            self.lowest_session_score = min(self.lowest_session_score, self.score)
            self.scored_frames += 1

            if current_time - self.last_timeline_sample >= SCORE_TIMELINE_INTERVAL_SECONDS:
                self.last_timeline_sample = current_time
                self.score_timeline.append({
                    "offset_seconds": round(current_time - self.session_start_time, 1),
                    "score": self.score,
                })

            return self.score

    def _build_summary(self) -> Dict[str, Any]:
        """Assemble the summary. The caller holds the lock, so this sees one state."""
        events = self.all_event_dicts()
        events.sort(key=lambda item: item["start_time"], reverse=True)

        score = self.score
        grade = self.grade
        lowest_score = int(self.lowest_session_score)
        clean_seconds = self.clean_seconds
        timeline = list(self.score_timeline)

        result = score_from_events(events, clean_seconds)
        total_event_seconds = round(sum(float(event["duration"]) for event in events), 1)

        return {
            "duration_seconds": round(time.time() - self.session_start_time, 1),
            "final_score": score,
            "grade": grade,
            "lowest_session_score": lowest_score,
            "points_lost": result["points_lost"],
            "score_breakdown": result["score_breakdown"],
            "total_events": len(events),
            "phone_events": sum(1 for event in events if event["type"] == "phone_use"),
            "total_distracted_duration": total_event_seconds,
            "events": events,
            "score_timeline": timeline,
        }

    def get_session_summary(self) -> Optional[Dict[str, Any]]:
        """
        The ride summary, or None when no frame has ever been scored.

        Same rule `finalize()` applies, for the same reason: a session that never
        scored carries START_SCORE only because nothing was measured, so
        building a summary from it would hand the caller a fabricated, event-free
        100/100 to present as a clean ride. Returns None so every caller — the
        live frame, the summary endpoint, the ride report — inherits one rule
        rather than each re-deciding it.
        """
        with self._lock:
            if self.scored_frames == 0:
                return None
            return self._build_summary()

    def finalize(self) -> Optional[Dict[str, Any]]:
        """
        Freeze this session and return the report of the ride that just ended.

        Held under the same lock that scores a frame, so the events, score and
        timeline returned are the ones the ride ended on: a frame still in flight
        either scored before this and is included, or lands after it and is
        refused, never half of each.

        Returns None when the session never scored a frame. Such a session carries
        START_SCORE only because nothing was measured, so reporting it as a clean
        ride would be a fabricated 100/100; no report is better than a false one.
        """
        with self._lock:
            self.finalized = True
            if self.scored_frames == 0:
                return None
            return self._build_summary()

    def reset(self) -> None:
        """Reset all session state."""
        with self._lock:
            now = time.time()
            self.session_start_time = now
            self.last_activity_time = now
            self.last_timeline_sample = now
            self.score = int(START_SCORE)
            self.grade = grade_for(START_SCORE)
            self.lowest_session_score = int(START_SCORE)
            self.clean_seconds = 0.0
            self.scored_frames = 0
            self.finalized = False
            self.score_timeline.clear()
            self.active_events.clear()
            self.completed_events.clear()
            self.tracks.clear()
            self.track_counter = 0
            self.last_frame_monotonic = time.monotonic()
            self.last_yolo_monotonic = 0.0
            self.yolo_runs = 0
            self.perf_frames = 0
            self.perf_totals = {}
            self.signal_state.clear()


class SessionManager:
    """Manages AI session state per user/ride."""

    def __init__(self):
        self._sessions: Dict[str, SessionState] = {}
        self._lock = threading.RLock()

    def _session_key(self, user_id: str, ride_id: Optional[int] = None) -> str:
        return f"{user_id}:{ride_id or 'no_ride'}"

    def get_session(self, user_id: str, ride_id: Optional[int] = None) -> SessionState:
        """Get or create session state for a user/ride."""
        key = self._session_key(user_id, ride_id)
        with self._lock:
            if key not in self._sessions:
                self._sessions[key] = SessionState(user_id=user_id, ride_id=ride_id)
            session = self._sessions[key]
            # Update ride_id if it changed (e.g., ride started)
            if ride_id is not None and session.ride_id != ride_id:
                session.ride_id = ride_id
            return session

    def find_session(self, user_id: str, ride_id: Optional[int] = None) -> Optional[SessionState]:
        """
        The session for a user/ride, or None when there is not one yet.

        Never creates one: reading a ride's final report must not bring a session
        into existence, because a session that has never scored a frame carries
        START_SCORE and would read as a perfect, event-free ride.
        """
        key = self._session_key(user_id, ride_id)
        with self._lock:
            return self._sessions.get(key)

    def finalize_session(self, user_id: str, ride_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Freeze a user's session for a ride and return its final report.

        None means there is no measured ride to report on: no session was ever
        scored for this ride, so no score may be written down for it.
        """
        session = self.find_session(user_id, ride_id)
        if session is None:
            return None
        return session.finalize()

    def set_ride(self, user_id: str, ride_id: int) -> SessionState:
        """
        Start a ride-scoped session, discarding whatever the last ride left.

        The previous session's score, events, timeline and tracks are dropped, not
        moved across: a new ride must never inherit them.
        """
        key_old = self._session_key(user_id, None)
        key_new = self._session_key(user_id, ride_id)
        with self._lock:
            if key_old != key_new:
                self._sessions.pop(key_old, None)
            session = self.get_session(user_id, ride_id)
            session.reset()
            return session

    def clear_ride(self, user_id: str) -> Optional[SessionState]:
        """
        Drop the ride-scoped sessions, keeping the live no-ride session.

        The live session is what the current frames are scored into and what the
        ride report reads, so it is left alone; the ride-scoped copies are discarded
        instead of being copied over it.
        """
        key_old = self._session_key(user_id, None)
        prefix = f"{user_id}:"
        with self._lock:
            for key in [k for k in self._sessions if k.startswith(prefix) and k != key_old]:
                del self._sessions[key]
            return self.get_session(user_id, None)

    def remove_session(self, user_id: str, ride_id: Optional[int] = None) -> bool:
        """Remove session for user/ride."""
        key = self._session_key(user_id, ride_id)
        with self._lock:
            if key in self._sessions:
                del self._sessions[key]
                return True
            return False

    def get_all_sessions(self) -> Dict[str, SessionState]:
        with self._lock:
            return dict(self._sessions)


ALL_EVENT_TYPES: frozenset = (
    SessionState.YOLO_EVENT_TYPES
    | SessionState.MEDIAPIPE_EVENT_TYPES
    | SessionState.INFERRED_EVENT_TYPES
)

# Global session manager
session_manager = SessionManager()

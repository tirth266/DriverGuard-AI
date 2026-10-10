"""MediaPipe Tasks driver-landmark analysis with temporal interpretation."""

import logging
import math
import os
import threading
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import cv2
import numpy as np

from app.ai.session_manager import session_manager

logger = logging.getLogger(__name__)

Point = Any


class MediaPipeDriverService:
    """Runs optional MediaPipe Tasks landmarks and interprets them over time."""

    # â”€â”€ Tunable thresholds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Eye aspect ratio below this counts as a closed eye.
    EYE_CLOSED_EAR = 0.25
    # Seconds of continuous eye closure before eyes_closed is raised.
    EYES_CLOSED_SECONDS = 0.7
    # Seconds of continuous eye closure before the drowsy escalation.
    DROWSY_SECONDS = 1.5
    # Mouth aspect ratio above this counts as a yawn.
    YAWN_MAR = 0.65
    # Seconds of continuous wide mouth before a yawn is raised.
    YAWN_SECONDS = 1.5
    # Seconds of sustained head deviation before head_away / head_down is raised.
    HEAD_POSE_SECONDS = 1.5
    # Absolute yaw (deg) beyond which the driver is looking away from the road.
    YAW_AWAY_DEG = 20.0
    # Pitch (deg) beyond which the head is angled down.
    PITCH_DOWN_DEG = 18.0
    # Exponential smoothing factor for yaw/pitch so single noisy frames cannot trigger.
    POSE_SMOOTHING = 0.35
    # A gap longer than this between frames is not evidence of anything, so all
    # sustained timers restart.
    FRAME_GAP_RESET_SECONDS = 1.0
    # Landmarks are normalized, so inference is capped for speed and the results
    # need no rescaling.
    MEDIAPIPE_MAX_WIDTH = 480
    # Seconds of continuous hand-at-ear before a phone call is suspected.
    PHONE_CALL_SUSPECTED_SECONDS = 2.5
    # The suspected call is dropped this long after the hand leaves the ear zone.
    PHONE_CALL_CLEAR_SECONDS = 1.0
    # A suspected call is capped below a real detection's confidence.
    PHONE_CALL_MAX_CONFIDENCE = 0.6
    # Last known face geometry is reused for this long when the face is briefly
    # hidden, so a hand covering the face does not reset the timer.
    FACE_GEOMETRY_HOLD_SECONDS = 1.0
    # Radius of each ear zone as a fraction of the face width (landmark 234 <-> 454).
    EAR_ZONE_RADIUS_RATIO = 0.35
    # The ear zones must not swallow the mouth/chin: a palm inside this margin of
    # the mouth/chin box is treated as resting the chin, not holding a phone.
    MOUTH_CHIN_ZONE_MARGIN = 0.06
    PALM_LANDMARK = 9

    LEFT_EYE = (33, 160, 158, 133, 153, 144)
    RIGHT_EYE = (362, 387, 385, 263, 373, 380)
    MOUTH = (61, 291, 13, 14, 81, 178)
    # Head-pose landmarks. MediaPipe blendshape coefficients are not used in IMAGE
    # mode, so yaw/pitch are approximated from this landmark geometry.
    NOSE_TIP = 1
    FOREHEAD = 10
    CHIN = 152
    LEFT_CHEEK = 234
    RIGHT_CHEEK = 454

    def __init__(self, face_model_path: Optional[str] = None, hand_model_path: Optional[str] = None, load_tasks: bool = True):
        # Allow re-initialization when called from app startup with explicit paths
        raw_face = face_model_path or os.getenv("MEDIAPIPE_FACE_MODEL_PATH", "")
        raw_hand = hand_model_path or os.getenv("MEDIAPIPE_HAND_MODEL_PATH", "")

        # Resolve relative paths against the backend root (three levels up from this file)
        backend_root = Path(__file__).resolve().parent.parent.parent
        self.face_model_path = str((backend_root / raw_face).resolve()) if raw_face and not Path(raw_face).is_absolute() else raw_face
        self.hand_model_path = str((backend_root / raw_hand).resolve()) if raw_hand and not Path(raw_hand).is_absolute() else raw_hand

        # Close any previously opened landmarkers before reloading
        if getattr(self, "face_landmarker", None) is not None:
            try:
                self.face_landmarker.close()
            except Exception:
                pass
        if getattr(self, "hand_landmarker", None) is not None:
            try:
                self.hand_landmarker.close()
            except Exception:
                pass

        self.face_landmarker = None
        self.hand_landmarker = None
        self.face_available = False
        self.hands_available = False
        # Module-level singletons shared by every session, so landmark detection is
        # guarded and no tracking state leaks between users.
        self._detect_lock = threading.Lock()
        if load_tasks:
            self._load_tasks()

    def _load_tasks(self) -> None:
        """Load Tasks models only when explicitly configured and present on disk."""
        try:
            from mediapipe.tasks.python import BaseOptions
            from mediapipe.tasks.python.vision import (
                FaceLandmarker,
                FaceLandmarkerOptions,
                HandLandmarker,
                HandLandmarkerOptions,
                RunningMode,
            )

            # Local files only: MediaPipe never fetches a .task bundle, and a
            # missing one is reported rather than downloaded.
            face_file = self._local_model_file(self.face_model_path, "face_landmarker.task")
            hand_file = self._local_model_file(self.hand_model_path, "hand_landmarker.task")

            if face_file is not None:
                self.face_landmarker = FaceLandmarker.create_from_options(
                    FaceLandmarkerOptions(
                        base_options=BaseOptions(model_asset_path=str(face_file)),
                        running_mode=RunningMode.IMAGE,
                        num_faces=1,
                        # Neither output is used, so both stay off.
                        output_face_blendshapes=False,
                        output_facial_transformation_matrixes=False,
                    )
                )
                self.face_available = True

            if hand_file is not None:
                self.hand_landmarker = HandLandmarker.create_from_options(
                    HandLandmarkerOptions(
                        base_options=BaseOptions(model_asset_path=str(hand_file)),
                        running_mode=RunningMode.IMAGE,
                        num_hands=2,
                    )
                )
                self.hands_available = True
        except Exception as error:
            logger.warning("MediaPipe Tasks unavailable: %s", error)
            self.face_landmarker = None
            self.hand_landmarker = None
            self.face_available = False
            self.hands_available = False

    @staticmethod
    def _local_model_file(path: Optional[str], label: str):
        """The model file when it exists and is non-empty, else None plus one log line."""
        if path and Path(path).is_file() and Path(path).stat().st_size > 0:
            return Path(path)
        logger.error(
            "[MediaPipe] Missing local model file: %s — run: python scripts/setup_models.py",
            path or label,
        )
        return None

    @staticmethod
    def _distance(first: Point, second: Point) -> float:
        return math.hypot(float(first.x) - float(second.x), float(first.y) - float(second.y))

    @classmethod
    def _ear(cls, points: Sequence[Point], indices: Iterable[int]) -> float:
        p1, p2, p3, p4, p5, p6 = (points[index] for index in indices)
        horizontal = cls._distance(p1, p4)
        if horizontal == 0:
            return 0.0
        return (cls._distance(p2, p6) + cls._distance(p3, p5)) / (2.0 * horizontal)

    @classmethod
    def _mar(cls, points: Sequence[Point]) -> float:
        left, right, upper, lower, upper_side, lower_side = (points[index] for index in cls.MOUTH)
        width = cls._distance(left, right)
        if width == 0:
            return 0.0
        return (cls._distance(upper, lower) + cls._distance(upper_side, lower_side)) / (2.0 * width)

    @classmethod
    def _head_angles(cls, points: Sequence[Point]) -> Dict[str, float]:
        """
        Approximate head yaw/pitch in degrees from face landmark geometry.

        Yaw is the signed horizontal displacement of the nose tip from the
        mid-point between the cheek extremes, scaled by the cheek-to-cheek width.
        Pitch is the vertical nose displacement relative to the forehead-to-chin
        axis. MediaPipe does not expose blendshape coefficients in IMAGE mode, so
        these are geometric estimates, not calibrated angles.
        """
        nose = points[cls.NOSE_TIP]
        left_face = points[cls.LEFT_CHEEK]
        right_face = points[cls.RIGHT_CHEEK]
        forehead = points[cls.FOREHEAD]
        chin = points[cls.CHIN]

        cheek_width = math.hypot(
            float(right_face.x) - float(left_face.x),
            float(right_face.y) - float(left_face.y),
        )
        face_height = max(math.hypot(
            float(chin.x) - float(forehead.x),
            float(chin.y) - float(forehead.y),
        ), 1e-6)

        yaw_ratio = (float(nose.x) - (float(left_face.x) + float(right_face.x)) / 2.0) / max(cheek_width, 1e-6)
        pitch_ratio = (float(nose.y) - (float(forehead.y) + float(chin.y)) / 2.0) / face_height

        return {
            "yaw": round(math.degrees(math.asin(max(-0.99, min(0.99, yaw_ratio)))), 2),
            "pitch": round(pitch_ratio * 90.0, 2),
        }

    @staticmethod
    def _box(points: Sequence[Point], width: int, height: int) -> Dict[str, int]:
        xs = [float(p.x) * width for p in points]
        ys = [float(p.y) * height for p in points]
        return {
            "x1": int(min(xs)),
            "y1": int(min(ys)),
            "x2": int(max(xs)),
            "y2": int(max(ys)),
        }

    @staticmethod
    def _smoother(
        signal_state: Dict[str, Any],
        key: str,
        value: float,
        factor: float,
    ) -> float:
        """Exponential smoothing kept per session so it is never shared across users."""
        previous = signal_state.get(key)
        smoothed = value if previous is None else previous + factor * (value - previous)
        signal_state[key] = smoothed
        return smoothed

    @staticmethod
    def _held_for(signal_state: Dict[str, Any], key: str, condition: bool, now: float) -> float:
        """
        Seconds `condition` has been continuously true, using monotonic time.

        The caller resets the sustained timers whenever a frame gap is detected,
        so a long pause never counts as evidence.
        """
        if not condition:
            signal_state.pop(key, None)
            return 0.0
        started = signal_state.get(key)
        if started is None:
            signal_state[key] = now
            return 0.0
        return max(0.0, now - started)

    @staticmethod
    def _reset_sustained_timers(signal_state: Dict[str, Any]) -> None:
        """A gap between frames is not evidence: drop every sustained timer."""
        for key in (
            "eyes_closed_since", "eye_closed_min_ear",
            "yawn_since",
            "pose_since", "pose_kind", "pose_deviation",
            "phone_call_since", "phone_call_duration", "phone_call_lost_at",
        ):
            signal_state.pop(key, None)

    @classmethod
    def _ear_zones(cls, points: Sequence[Point]) -> List[Tuple[float, float, float]]:
        """One ear zone per side, centred on the face edges with a radius in face widths."""
        left = points[cls.LEFT_CHEEK]
        right = points[cls.RIGHT_CHEEK]
        face_width = math.hypot(
            float(right.x) - float(left.x),
            float(right.y) - float(left.y),
        )
        radius = max(face_width, 1e-6) * cls.EAR_ZONE_RADIUS_RATIO
        return [
            (float(left.x), float(left.y), radius),
            (float(right.x), float(right.y), radius),
        ]

    @classmethod
    def _mouth_chin_zone(cls, points: Sequence[Point]) -> Tuple[float, float, float, float]:
        """Normalized bbox covering the mouth and chin, with a safety margin."""
        xs = [float(points[index].x) for index in cls.MOUTH] + [float(points[cls.CHIN].x)]
        ys = [float(points[index].y) for index in cls.MOUTH] + [float(points[cls.CHIN].y)]
        margin = cls.MOUTH_CHIN_ZONE_MARGIN
        return (min(xs) - margin, min(ys) - margin, max(xs) + margin, max(ys) + margin)

    @classmethod
    def _hand_at_ear(
        cls,
        hand: Sequence[Point],
        ear_zones: Sequence[Tuple[float, float, float]],
        mouth_chin: Tuple[float, float, float, float],
    ) -> bool:
        """
        True when a palm sits in an ear zone and clear of the mouth/chin.

        Resting a hand on the chin or cheek must not trigger this, which is why
        the condition is the ear zone only, minus the mouth/chin zone.
        """
        palm = hand[cls.PALM_LANDMARK]
        px, py = float(palm.x), float(palm.y)

        x1, y1, x2, y2 = mouth_chin
        if x1 <= px <= x2 and y1 <= py <= y2:
            return False

        return any(
            math.hypot(px - cx, py - cy) <= radius for cx, cy, radius in ear_zones
        )

    @staticmethod
    def _eye_landmarks(points: Sequence[Point], indices: Iterable[int]) -> List[Dict[str, float]]:
        return [
            {"x": round(float(points[index].x), 6), "y": round(float(points[index].y), 6)}
            for index in indices
        ]

    @staticmethod
    def _hand_landmarks(points: Sequence[Point]) -> List[Dict[str, float]]:
        """Extract all 21 hand landmarks as normalized coordinates."""
        return [
            {"x": round(float(p.x), 6), "y": round(float(p.y), 6), "z": round(float(p.z), 6)}
            for p in points
        ]

    def reset_temporal_state(self, user_id: str = "default", ride_id: Optional[int] = None) -> None:
        """Reset temporal interpretation state for a specific session."""
        session = session_manager.get_session(user_id, ride_id)
        with session._lock:
            session.signal_state.clear()

    @staticmethod
    def _held_face_landmarks(signal_state: Dict[str, Any], now: float) -> Optional[Sequence[Point]]:
        """
        Last known face landmarks, if the face was only briefly hidden.

        A hand passing in front of the face stops face detection; without this the
        ear-zone timer would restart on every small occlusion.
        """
        geometry = signal_state.get("face_geometry")
        geometry_at = signal_state.get("face_geometry_at")
        if geometry is None or geometry_at is None:
            return None
        if now - geometry_at > MediaPipeDriverService.FACE_GEOMETRY_HOLD_SECONDS:
            return None
        return geometry

    @classmethod
    def reset_sustained_events(cls, signal_state: Dict[str, Any]) -> None:
        """No usable face: nothing may stay asserted."""
        cls._reset_sustained_timers(signal_state)
        signal_state.pop("face_geometry", None)
        signal_state.pop("face_geometry_at", None)

    def analyze_landmarks(
        self,
        face_landmarks: Optional[Sequence[Point]],
        hand_landmarks: Optional[Sequence[Sequence[Point]]] = None,
        user_id: str = "default",
        ride_id: Optional[int] = None,
        frame_width: int = 640,
        frame_height: int = 480,
        now: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Analyze supplied landmarks; useful for both inference and focused tests."""
        session = session_manager.get_session(user_id, ride_id)
        now = time.monotonic() if now is None else now

        hand_landmarks_data: List[List[Dict[str, float]]] = []
        hand_boxes: List[Dict[str, int]] = []
        for hand in (hand_landmarks or []):
            hand_landmarks_data.append(self._hand_landmarks(hand))
            hand_boxes.append(self._box(hand, frame_width, frame_height))

        signal_state = session.signal_state

        # A gap longer than the reset window means earlier frames were never seen,
        # so nothing from before the gap may count as sustained evidence.
        with session._lock:
            if now - session.last_frame_monotonic > self.FRAME_GAP_RESET_SECONDS:
                self._reset_sustained_timers(signal_state)
            session.last_frame_monotonic = now

        face = face_landmarks or self._held_face_landmarks(signal_state, now)

        if not face:
            self.reset_sustained_events(signal_state)
            return self.empty_result(hand_landmarks_data, hand_boxes)

        signal_state["face_geometry"] = face
        signal_state["face_geometry_at"] = now

        ear_zones = self._ear_zones(face)
        mouth_chin = self._mouth_chin_zone(face)

        ear = (self._ear(face, self.LEFT_EYE) + self._ear(face, self.RIGHT_EYE)) / 2.0
        mar = self._mar(face)
        raw_angles = self._head_angles(face)
        yaw = self._smoother(signal_state, "yaw", raw_angles["yaw"], self.POSE_SMOOTHING)
        pitch = self._smoother(signal_state, "pitch", raw_angles["pitch"], self.POSE_SMOOTHING)

        # ── Eyes closed → drowsy escalation ────────────────────────────────
        eye_closed = ear < self.EYE_CLOSED_EAR
        eyes_closed_for = self._held_for(signal_state, "eyes_closed_since", eye_closed, now)
        previous_min = signal_state.get("eye_closed_min_ear")
        if eye_closed:
            signal_state["eye_closed_min_ear"] = ear if previous_min is None else min(previous_min, ear)
        else:
            signal_state["eye_closed_min_ear"] = None

        eyes_closed_confirmed = eyes_closed_for >= self.EYES_CLOSED_SECONDS
        drowsy_confirmed = eyes_closed_for >= self.DROWSY_SECONDS
        min_ear = signal_state.get("eye_closed_min_ear")

        # ── Head pose (yaw / pitch) ────────────────────────────────────────
        if pitch > self.PITCH_DOWN_DEG:
            head_pose, deviation = "down", pitch
        elif abs(yaw) > self.YAW_AWAY_DEG:
            head_pose, deviation = "away", abs(yaw)
        else:
            head_pose, deviation = "forward", 0.0

        if signal_state.get("pose_kind") != head_pose:
            signal_state["pose_kind"] = head_pose
            signal_state.pop("pose_since", None)
            signal_state.pop("pose_deviation", None)
        pose_for = self._held_for(signal_state, "pose_since", head_pose != "forward", now)
        if head_pose != "forward":
            previous_deviation = signal_state.get("pose_deviation")
            signal_state["pose_deviation"] = (
                deviation if previous_deviation is None else min(previous_deviation, deviation)
            )
        pose_confirmed = pose_for >= self.HEAD_POSE_SECONDS

        # ── Yawn ───────────────────────────────────────────────────────────
        yawn_for = self._held_for(signal_state, "yawn_since", mar >= self.YAWN_MAR, now)
        yawn_confirmed = yawn_for >= self.YAWN_SECONDS

        # ── Suspected phone call (inference, never a detection) ────────────
        at_ear = any(
            self._hand_at_ear(hand, ear_zones, mouth_chin) for hand in (hand_landmarks or [])
        )
        call_for = self._held_for(signal_state, "phone_call_since", at_ear, now)
        call_state = self._phone_call_state(signal_state, at_ear, call_for, now)
        phone_call_suspected = call_state["active"]
        call_duration = call_state["duration"]

        events: List[str] = []
        active_alerts: List[str] = []
        measurements: Dict[str, float] = {}

        if eyes_closed_confirmed:
            events.append("eyes_closed")
            active_alerts.append("eyes_closed")
            if min_ear is not None:
                measurements["eyes_closed"] = min_ear
        if drowsy_confirmed:
            events.append("drowsy")
            active_alerts.append("drowsy")
            if min_ear is not None:
                measurements["drowsy"] = min_ear
        if pose_confirmed and head_pose == "away":
            events.append("head_away")
            active_alerts.append("head_away")
            if signal_state.get("pose_deviation") is not None:
                measurements["head_away"] = signal_state["pose_deviation"]
        elif pose_confirmed and head_pose == "down":
            events.append("head_down")
            active_alerts.append("head_down")
            if signal_state.get("pose_deviation") is not None:
                measurements["head_down"] = signal_state["pose_deviation"]
        if yawn_confirmed:
            events.append("yawn")
            active_alerts.append("yawn")

        return {
            "available": True,
            "face_detected": bool(face_landmarks),
            "ear": round(ear, 4),
            "mar": round(mar, 4),
            "yaw": round(yaw, 2),
            "pitch": round(pitch, 2),
            "eye_state": "eyes_closed" if eye_closed else "eyes_open",
            "eye_measurement": round(ear, 4),
            "eye_landmarks": {
                "left": self._eye_landmarks(face, self.LEFT_EYE),
                "right": self._eye_landmarks(face, self.RIGHT_EYE),
            },
            "eyes_closed_event": eyes_closed_confirmed,
            "eyes_closed_duration": round(eyes_closed_for, 2),
            "min_ear": round(min_ear, 4) if min_ear is not None else None,
            "drowsiness_event": drowsy_confirmed,
            "yawn_detected": yawn_confirmed,
            "mouth_measurement": round(mar, 4),
            "head_pose": head_pose,
            "phone_call_condition": at_ear,
            "phone_call_suspected": phone_call_suspected,
            "phone_call_suspected_duration": call_duration,
            "hands_detected": bool(hand_landmarks),
            "hand_count": len(hand_landmarks or []),
            "hand_landmarks_available": bool(hand_landmarks),
            "hand_landmarks": hand_landmarks_data,
            "hand_boxes": hand_boxes,
            "mouth_box": self._box(
                [face[index] for index in self.MOUTH], frame_width, frame_height
            ),
            "events": events,
            "active_alerts": active_alerts,
            "measurements": measurements,
        }

    @classmethod
    def _phone_call_state(
        cls,
        signal_state: Dict[str, Any],
        at_ear: bool,
        call_for: float,
        now: float,
    ) -> Dict[str, Any]:
        """
        Suspected-call latch: the condition must hold long enough to assert, then
        survives a short break before it is cleared.
        """
        if at_ear:
            signal_state["phone_call_duration"] = call_for
            signal_state["phone_call_lost_at"] = None
            return {
                "active": call_for >= cls.PHONE_CALL_SUSPECTED_SECONDS,
                "duration": round(call_for, 2),
            }

        held = signal_state.get("phone_call_duration")
        if held is None:
            # The condition was never established, so there is nothing to hold.
            return {"active": False, "duration": 0.0}

        lost_at = signal_state.get("phone_call_lost_at")
        if lost_at is None:
            signal_state["phone_call_lost_at"] = now
        elif now - lost_at > cls.PHONE_CALL_CLEAR_SECONDS:
            signal_state["phone_call_duration"] = None
            signal_state["phone_call_lost_at"] = None
            return {"active": False, "duration": 0.0}

        return {"active": True, "duration": round(held, 2)}

    def detect_landmarks(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Run the Face and Hand landmarkers on one frame.

        Both go through the same MediaPipe TFLite runtime, so they run
        sequentially under one lock instead of concurrently: parallelising them
        deadlocks the runtime. This whole call is what runs alongside YOLO.
        IMAGE mode holds no tracking state, so nothing leaks between sessions.
        """
        if not (self.face_available or self.hands_available):
            return {"face": None, "hands": None, "face_ms": 0.0, "hands_ms": 0.0}

        from mediapipe import Image, ImageFormat

        image = Image(image_format=ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

        face_points = None
        face_ms = 0.0
        hand_points = None
        hands_ms = 0.0
        with self._detect_lock:
            if self.face_available:
                started = time.perf_counter()
                result = self.face_landmarker.detect(image)
                face_ms = (time.perf_counter() - started) * 1000.0
                face_points = result.face_landmarks[0] if result.face_landmarks else None
            if self.hands_available:
                started = time.perf_counter()
                result = self.hand_landmarker.detect(image)
                hands_ms = (time.perf_counter() - started) * 1000.0
                hand_points = result.hand_landmarks or None

        return {"face": face_points, "hands": hand_points, "face_ms": face_ms, "hands_ms": hands_ms}

    def downscale(self, frame: np.ndarray) -> np.ndarray:
        """Cap inference width. Landmarks are normalized, so results need no rescaling."""
        height, width = frame.shape[:2]
        if width <= self.MEDIAPIPE_MAX_WIDTH:
            return frame
        scaled_height = max(1, int(round(height * self.MEDIAPIPE_MAX_WIDTH / width)))
        return cv2.resize(
            frame,
            (self.MEDIAPIPE_MAX_WIDTH, scaled_height),
            interpolation=cv2.INTER_AREA,
        )

    def warmup(self) -> None:
        """Run one throwaway inference so the first real frame is not the slowest."""
        # Same inference width a live frame arrives at, so the first analysed frame
        # does not pay a resize/graph init the warm-up never exercised.
        dummy = np.zeros((self.MEDIAPIPE_MAX_WIDTH // 2, self.MEDIAPIPE_MAX_WIDTH, 3), dtype=np.uint8)
        try:
            self.detect_landmarks(dummy)
        except Exception as e:
            logger.warning("[MediaPipe] Warmup failed: %s", e)
        logger.info("[MediaPipe] Warmup complete (max width=%d)", self.MEDIAPIPE_MAX_WIDTH)

    def process_frame(self, frame: np.ndarray, user_id: str = "default", ride_id: Optional[int] = None) -> Dict[str, Any]:
        """Sequential convenience path: detect then interpret a single frame."""
        if not isinstance(frame, np.ndarray) or frame.size == 0:
            self.reset_temporal_state(user_id, ride_id)
            return self.unavailable("invalid_frame")
        if not self.face_available:
            self.reset_temporal_state(user_id, ride_id)
            return self.unavailable("mediapipe_model_unavailable")

        try:
            height, width = frame.shape[:2]
            detected = self.detect_landmarks(self.downscale(frame))
            return self.analyze_landmarks(
                detected["face"],
                detected["hands"],
                user_id,
                ride_id,
                frame_width=width,
                frame_height=height,
            )
        except Exception as error:
            logger.warning("MediaPipe frame processing failed: %s", error)
            self.reset_temporal_state(user_id, ride_id)
            return self.unavailable("processing_error")

    def empty_result(
        self,
        hand_landmarks_data: List[List[Dict[str, float]]],
        hand_boxes: List[Dict[str, int]],
    ) -> Dict[str, Any]:
        """Shape-identical to a real result, but with no face so nothing reads as safe."""
        return {
            "available": self.face_available or self.hands_available,
            "face_detected": False,
            "ear": None,
            "mar": None,
            "yaw": None,
            "pitch": None,
            "eye_state": "no_face",
            "eye_landmarks": {"left": [], "right": []},
            "eyes_closed_event": False,
            "eyes_closed_duration": 0.0,
            "min_ear": None,
            "drowsiness_event": False,
            "yawn_detected": False,
            "mouth_measurement": None,
            "head_pose": "no_face",
            "phone_call_condition": False,
            "phone_call_suspected": False,
            "phone_call_suspected_duration": 0.0,
            "hands_detected": bool(hand_boxes),
            "hand_count": len(hand_boxes),
            "hand_landmarks_available": bool(hand_landmarks_data),
            "hand_landmarks": hand_landmarks_data,
            "hand_boxes": hand_boxes,
            "mouth_box": None,
            "events": [],
            "active_alerts": [],
            "measurements": {},
        }

    def unavailable(self, reason: str) -> Dict[str, Any]:
        result = self.empty_result([], [])
        result["available"] = False
        result["reason"] = reason
        return result

    def close(self) -> None:
        """Close MediaPipe landmarkers and release resources."""
        if self.face_landmarker is not None:
            try:
                self.face_landmarker.close()
            except Exception as e:
                logger.warning("Error closing face_landmarker: %s", e)
            self.face_landmarker = None
            self.face_available = False

        if self.hand_landmarker is not None:
            try:
                self.hand_landmarker.close()
            except Exception as e:
                logger.warning("Error closing hand_landmarker: %s", e)
            self.hand_landmarker = None
            self.hands_available = False

        logger.info("MediaPipe resources cleaned up")


# The singleton is built WITHOUT loading the Tasks models: importing this module
# must stay cheap, because the app imports it on the request path. The startup
# warm-up thread performs the one and only landmarker load (see app.load_models).
mediapipe_service = MediaPipeDriverService(load_tasks=False)


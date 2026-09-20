"""MediaPipe Tasks driver-landmark analysis with temporal interpretation."""

import logging
import math
import os
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)

Point = Any


class MediaPipeDriverService:
    """Runs optional MediaPipe Tasks landmarks and interprets them over time."""

    EYE_CLOSED_EAR = 0.20
    EYE_CLOSED_FRAMES = 5
    YAWN_MAR = 0.65
    YAWN_FRAMES = 8
    HEAD_POSE_FRAMES = 8

    LEFT_EYE = (33, 160, 158, 133, 153, 144)
    RIGHT_EYE = (362, 387, 385, 263, 373, 380)
    MOUTH = (61, 291, 13, 14, 81, 178)

    def __init__(self, face_model_path: Optional[str] = None, hand_model_path: Optional[str] = None):
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
        if not hasattr(self, "_counters"):
            self._counters: Dict[str, int] = defaultdict(int)
        self._load_tasks()

    def _load_tasks(self) -> None:
        """Load Tasks models only when explicitly configured and present."""
        try:
            from mediapipe.tasks.python import BaseOptions
            from mediapipe.tasks.python.vision import (
                FaceLandmarker,
                FaceLandmarkerOptions,
                HandLandmarker,
                HandLandmarkerOptions,
                RunningMode,
            )

            if self.face_model_path and Path(self.face_model_path).is_file():
                self.face_landmarker = FaceLandmarker.create_from_options(
                    FaceLandmarkerOptions(
                        base_options=BaseOptions(model_asset_path=self.face_model_path),
                        running_mode=RunningMode.IMAGE,
                        num_faces=1,
                    )
                )
                self.face_available = True
            else:
                logger.warning(
                    "[MediaPipe] face_landmarker.task not found at: %s", self.face_model_path
                )

            if self.hand_model_path and Path(self.hand_model_path).is_file():
                self.hand_landmarker = HandLandmarker.create_from_options(
                    HandLandmarkerOptions(
                        base_options=BaseOptions(model_asset_path=self.hand_model_path),
                        running_mode=RunningMode.IMAGE,
                        num_hands=2,
                    )
                )
                self.hands_available = True
            else:
                logger.warning(
                    "[MediaPipe] hand_landmarker.task not found at: %s", self.hand_model_path
                )
        except Exception as error:
            logger.warning("MediaPipe Tasks unavailable: %s", error)
            self.face_landmarker = None
            self.hand_landmarker = None
            self.face_available = False
            self.hands_available = False

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
    def _head_pose(cls, points: Sequence[Point]) -> str:
        nose = points[1]
        left_face = points[234]
        right_face = points[454]
        chin = points[152]
        face_center_x = (float(left_face.x) + float(right_face.x)) / 2.0
        face_width = max(float(right_face.x) - float(left_face.x), 1e-6)
        horizontal_offset = (float(nose.x) - face_center_x) / face_width
        face_center_y = (float(left_face.y) + float(right_face.y)) / 2.0
        vertical_offset = (float(nose.y) - face_center_y) / max(float(chin.y) - float(left_face.y), 1e-6)
        if vertical_offset > 0.30:
            return "looking_down"
        if horizontal_offset < -0.12:
            return "looking_left"
        if horizontal_offset > 0.12:
            return "looking_right"
        return "forward"

    def reset_temporal_state(self) -> None:
        self._counters.clear()

    def analyze_landmarks(
        self,
        face_landmarks: Optional[Sequence[Point]],
        hand_landmarks: Optional[Sequence[Sequence[Point]]] = None,
    ) -> Dict[str, Any]:
        """Analyze supplied landmarks; useful for both inference and focused tests."""
        if not face_landmarks:
            self.reset_temporal_state()
            return {
                "available": self.face_available or face_landmarks is not None,
                "face_detected": False,
                "eye_state": "unsupported/no_face",
                "eye_measurement": None,
                "drowsiness_event": False,
                "yawn_detected": False,
                "mouth_measurement": None,
                "head_pose": "unsupported/no_face",
                "hands_detected": bool(hand_landmarks),
                "hand_count": len(hand_landmarks or []),
                "hand_landmarks_available": bool(hand_landmarks),
                "events": [],
            }

        left_ear = self._ear(face_landmarks, self.LEFT_EYE)
        right_ear = self._ear(face_landmarks, self.RIGHT_EYE)
        eye_ratio = (left_ear + right_ear) / 2.0
        mouth_ratio = self._mar(face_landmarks)
        head_pose = self._head_pose(face_landmarks)

        self._counters["eyes_closed"] = self._counters["eyes_closed"] + 1 if eye_ratio < self.EYE_CLOSED_EAR else 0
        self._counters["yawn"] = self._counters["yawn"] + 1 if mouth_ratio >= self.YAWN_MAR else 0
        for pose in ("looking_left", "looking_right", "looking_down"):
            self._counters[f"pose:{pose}"] = self._counters[f"pose:{pose}"] + 1 if head_pose == pose else 0

        drowsiness_event = self._counters["eyes_closed"] >= self.EYE_CLOSED_FRAMES
        yawn_detected = self._counters["yawn"] >= self.YAWN_FRAMES
        events = []
        if drowsiness_event:
            events.append("prolonged_eye_closure")
        if yawn_detected:
            events.append("yawning")
        for pose in ("looking_left", "looking_right", "looking_down"):
            if self._counters[f"pose:{pose}"] >= self.HEAD_POSE_FRAMES:
                events.append(f"head_pose_{pose.removeprefix('looking_')}")

        return {
            "available": True,
            "face_detected": True,
            "eye_state": "eyes_closed" if eye_ratio < self.EYE_CLOSED_EAR else "eyes_open",
            "eye_measurement": round(eye_ratio, 4),
            "drowsiness_event": drowsiness_event,
            "yawn_detected": yawn_detected,
            "mouth_measurement": round(mouth_ratio, 4),
            "head_pose": head_pose,
            "hands_detected": bool(hand_landmarks),
            "hand_count": len(hand_landmarks or []),
            "hand_landmarks_available": bool(hand_landmarks),
            "events": events,
        }

    def process_frame(self, frame: np.ndarray) -> Dict[str, Any]:
        """Run configured MediaPipe Tasks models on one BGR OpenCV frame."""
        if not isinstance(frame, np.ndarray) or frame.size == 0:
            self.reset_temporal_state()
            return self._unavailable("invalid_frame")
        if not self.face_available:
            self.reset_temporal_state()
            return self._unavailable("mediapipe_model_unavailable")

        try:
            from mediapipe import Image, ImageFormat

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = Image(image_format=ImageFormat.SRGB, data=rgb_frame)
            face_result = self.face_landmarker.detect(image)
            face_points = face_result.face_landmarks[0] if face_result.face_landmarks else None
            hand_points = None
            if self.hands_available:
                hand_result = self.hand_landmarker.detect(image)
                hand_points = hand_result.hand_landmarks or None
            return self.analyze_landmarks(face_points, hand_points)
        except Exception as error:
            logger.warning("MediaPipe frame processing failed: %s", error)
            self.reset_temporal_state()
            return self._unavailable("processing_error")

    def _unavailable(self, reason: str) -> Dict[str, Any]:
        return {
            "available": False,
            "reason": reason,
            "face_detected": False,
            "eye_state": "unsupported/no_face",
            "eye_measurement": None,
            "drowsiness_event": False,
            "yawn_detected": False,
            "mouth_measurement": None,
            "head_pose": "unsupported/no_face",
            "hands_detected": False,
            "hand_count": 0,
            "hand_landmarks_available": False,
            "events": [],
        }


mediapipe_service = MediaPipeDriverService()

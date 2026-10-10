"""
YOLO11 Object Detection Service for Real-time Driver Distraction & Cabin Monitoring.
Predicts bounding boxes, confidences, and object classes for items in the driver cabin.
Uses session-scoped state to isolate users/rides.
"""
import threading
import time
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from app.ai.session_manager import (
    CONFIRM_MIN_HITS,
    session_manager,
    SessionState,
    Track,
    TRACK_CLEAR_SECONDS,
    TRACK_OCCLUSION_SECONDS,
    TRACK_REVALIDATE_SECONDS,
)

logger = logging.getLogger(__name__)

# â”€â”€ Monitored cabin classes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Only these classes are reported to the UI. Names are matched against the
# loaded model's `names` at load time (see YOLOAIService.load_model), so a model
# that lacks a class never causes it to be reported.
CABIN_CLASS_CATEGORIES: Dict[str, str] = {
    "cell phone": "phone",
    "bottle": "drink",
    "cup": "drink",
    "wine glass": "drink",
    "bowl": "food",
    "sandwich": "food",
    "pizza": "food",
    "donut": "food",
    "cake": "food",
    "banana": "food",
    "apple": "food",
    "orange": "food",
    "hot dog": "food",
    "fork": "food",
    "knife": "food",
    "spoon": "food",
}
PERSON_CLASS = "person"
PERSON_CATEGORY = "person"

# Inference size. 640 matches the Ultralytics default the model was trained at.
YOLO_IMGSZ = 640
# Low floor so moving, angled or partly hand-covered objects still produce a
# candidate. The per-class gates below are applied in code, not in the model call.
YOLO_FLOOR_CONF = 0.15
# Hysteresis: a NEW track needs the enter threshold, an already matched track
# stays alive on a much weaker detection, but never on an arbitrarily weak one.
PHONE_ENTER_CONF = 0.40
CABIN_ENTER_CONF = 0.35
# Lower bound for keeping an existing track alive. Below it a detection may not
# extend a track, relabel it or drag its box onto another object; the phone gate
# is higher because a phone is the one class this product penalises.
PHONE_STAY_CONF = 0.30
CABIN_STAY_CONF = 0.20

# Greedy IoU matching threshold for associating a detection with a track.
TRACK_MATCH_IOU = 0.3
# A detection of a different class this strongly overlapping an existing track
# replaces it: the object in that box changed identity, so the old track must not
# survive and claim the new object's box.
TRACK_CONFLICT_IOU = 0.30
# The hand must have covered the object just now for the occlusion carry-over to
# be evidence of a hidden object rather than of a track that already went stale.
TRACK_OCCLUSION_ENTRY_SECONDS = 0.5

# Hand / mouth association is bbox-proximity based. Margins are a fraction of
# frame width so the tolerance scales with resolution.
HAND_PROXIMITY_MARGIN = 0.06
MOUTH_PROXIMITY_MARGIN = 0.08

# Per-session rate limit on YOLO inference. MediaPipe still runs every frame.
YOLO_MIN_INTERVAL_MS = 250


def enter_threshold(category: str) -> float:
    """Confidence a brand new track needs before it is allowed to exist."""
    return PHONE_ENTER_CONF if category == "phone" else CABIN_ENTER_CONF


def stay_threshold(category: str) -> float:
    """Lowest confidence that may keep an existing track of this category alive."""
    return PHONE_STAY_CONF if category == "phone" else CABIN_STAY_CONF


def iou(first: Dict[str, int], second: Dict[str, int]) -> float:
    """Intersection over union of two axis-aligned boxes."""
    ix1 = max(first["x1"], second["x1"])
    iy1 = max(first["y1"], second["y1"])
    ix2 = min(first["x2"], second["x2"])
    iy2 = min(first["y2"], second["y2"])
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    intersection = (ix2 - ix1) * (iy2 - iy1)
    area_a = max(0, first["x2"] - first["x1"]) * max(0, first["y2"] - first["y1"])
    area_b = max(0, second["x2"] - second["x1"]) * max(0, second["y2"] - second["y1"])
    union = area_a + area_b - intersection
    return intersection / union if union > 0 else 0.0


class YOLOAIService:
    """
    YOLO11 Object Detection Service for Real-time Driver Distraction & Cabin Monitoring.
    Predicts bounding boxes, confidences, and object classes for items in the driver cabin
    (e.g., person, mobile phone, drinking cup, etc.).
    """

    def __init__(self):
        self.model = None
        self.is_loaded = False
        self.model_path = None
        self.device = "cpu"
        self.task = "detect"
        self.classes: Dict[int, str] = {}
        # Monitored classes actually present in the loaded model: name -> category.
        self.cabin_classes: Dict[str, str] = {}
        self.person_class_available = False
        # The model is a module-level singleton shared by every session, so the
        # predict call is guarded. IMAGE-mode inference keeps no tracking state.
        self._infer_lock = threading.Lock()

    def load_model(self, custom_path: Optional[str] = None) -> bool:
        """
        Loads the YOLO11 Object Detection model once at startup, from a local file.

        Only an explicit local path is ever loaded. There is no bare model name and
        no Ultralytics Hub fallback, so a missing weights file is reported instead
        of downloaded. Strictly validates that the loaded model is an Object
        Detection model, rejecting classification checkpoints.
        """
        from app.config import resolve_from_backend

        try:
            base_dir = Path(__file__).resolve().parent.parent.parent  # backend/
            raw_path = custom_path or os.getenv("YOLO_MODEL_PATH") or (
                base_dir / "models" / "trained" / "yolo11" / "detection" / "best.pt"
            )
            weights = Path(resolve_from_backend(str(raw_path)))

            if not weights.is_file() or weights.stat().st_size == 0:
                # No download, ever. The one-time installer puts the file here.
                logger.error(
                    "[YOLO Detection] Missing local model file: %s — run: python scripts/setup_models.py",
                    weights,
                )
                print(f"[YOLO Detection] Missing local model file: {weights} — run: python scripts/setup_models.py")
                self.is_loaded = False
                return False

            candidate_path = str(weights)
            logger.info(f"[YOLO Detection] Loading local model: {candidate_path}")

            from ultralytics import YOLO
            import torch

            # Determine compute device
            self.device = "cuda" if torch.cuda.is_available() else "cpu"

            try:
                loaded_model = YOLO(candidate_path)
            except Exception as candidate_err:
                logger.error(f"[YOLO Detection] Failed to load {candidate_path}: {candidate_err}")
                print(f"[YOLO Detection] Failed to load {candidate_path}: {candidate_err}")
                self.is_loaded = False
                return False

            model_task = getattr(loaded_model, "task", "detect")
            model_classes = getattr(loaded_model, "names", {})

            # Strict Detection Validation Guards
            if model_task == "classify" or "-cls" in weights.name.lower():
                raise ValueError(
                    f"Expected YOLO Object Detection model, but a Classification model was loaded ('{weights.name}')."
                )

            if model_task != "detect":
                raise ValueError(
                    f"Invalid model task '{model_task}' in '{weights.name}' (expected 'detect')."
                )

            # Validation passed: assign model
            self.model_path = candidate_path
            self.model = loaded_model
            self.task = "detect"
            self._bind_model_classes(model_classes)
            self.is_loaded = True

            logger.info(f"[YOLO Detection] Model loaded successfully: {self.model_path}")
            logger.info(f"[YOLO Detection] Device: {self.device.upper()} | Task: {self.task} | Classes: {len(self.classes)}")
            logger.info(f"[YOLO Detection] Monitored cabin classes: {sorted(self.cabin_classes)}")
            print(f"[YOLO Detection] Model loaded successfully: {self.model_path}")
            print(f"[YOLO Detection] Device: {self.device.upper()} | Task: {self.task} | Classes ({len(self.classes)})")
            print(f"[YOLO Detection] Monitored cabin classes: {sorted(self.cabin_classes)}")
            return True

        except Exception as e:
            logger.error(f"[YOLO Detection] Failed to load model: {e}")
            print(f"[YOLO Detection] ERROR loading model: {e}")
            self.is_loaded = False
            return False

    def _bind_model_classes(self, raw_names: Any) -> None:
        """Normalise model.names and keep only the cabin classes this model has."""
        if isinstance(raw_names, dict):
            self.classes = {int(k): str(v) for k, v in raw_names.items()}
        else:
            self.classes = {index: str(name) for index, name in enumerate(raw_names or [])}

        available = {name.strip().lower() for name in self.classes.values()}
        self.cabin_classes = {
            name: category
            for name, category in CABIN_CLASS_CATEGORIES.items()
            if name in available
        }
        self.person_class_available = PERSON_CLASS in available

    def _get_session(self, user_id: str, ride_id: Optional[int] = None) -> SessionState:
        """Get the session state for this user/ride."""
        return session_manager.get_session(user_id, ride_id)

    @staticmethod
    def _boxes_overlap(first: Dict[str, int], second: Dict[str, int], margin: float) -> bool:
        """True when two boxes intersect, treating the second box as `margin` px larger."""
        return not (
            first["x2"] < second["x1"] - margin
            or second["x2"] + margin < first["x1"]
            or first["y2"] < second["y1"] - margin
            or second["y2"] + margin < first["y1"]
        )

    def run_inference(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Run YOLO on one frame and return raw candidates above the confidence floor.

        Stateless apart from the guarded model, so the caller may run this in a
        worker thread while MediaPipe runs on the same frame.
        """
        with self._infer_lock:
            results = self.model.predict(
                source=frame,
                conf=YOLO_FLOOR_CONF,
                imgsz=YOLO_IMGSZ,
                device=self.device,
                verbose=False,
            )

        res = results[0]
        if not hasattr(res, "boxes") or res.boxes is None or len(res.boxes) == 0:
            return []

        candidates: List[Dict[str, Any]] = []
        for box in res.boxes:
            cls_id = int(box.cls[0])
            confidence = float(box.conf[0])
            cls_name = str(res.names.get(cls_id, str(cls_id)))
            name = cls_name.lower().strip()

            if name == PERSON_CLASS:
                category = PERSON_CATEGORY
            else:
                category = self.cabin_classes.get(name)
                if category is None:
                    # Not a monitored cabin class.
                    continue

            x1, y1, x2, y2 = (int(v) for v in box.xyxy[0].tolist())
            candidates.append({
                "class_id": cls_id,
                "class_name": cls_name,
                "category": category,
                "confidence": round(confidence, 4),
                "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
            })
        return candidates

    def warmup(self) -> None:
        """Run one throwaway inference so the first real frame is not the slowest."""
        if not self.is_loaded or self.model is None:
            return
        try:
            # A captured frame arrives at the YOLO_IMGSZ width and 16:9, so the
            # warm-up uses that shape rather than a square one: identical letterbox
            # and identical imgsz=640 network input as the first live frame.
            self.run_inference(np.zeros((YOLO_IMGSZ // 2, YOLO_IMGSZ, 3), dtype=np.uint8))
            logger.info("[YOLO Detection] Warmup complete (imgsz=%d, conf floor=%.2f)", YOLO_IMGSZ, YOLO_FLOOR_CONF)
        except Exception as e:
            logger.warning("[YOLO Detection] Warmup failed: %s", e)

    def _update_tracks(
        self,
        session: SessionState,
        candidates: List[Dict[str, Any]],
        hand_boxes: Optional[List[Dict[str, int]]],
        frame_width: int,
        now: float,
    ) -> List[Track]:
        """
        Greedy IoU matching against this session's tracks, then age out.

        A track only matches its own class, and only on a detection at or above
        that class's stay threshold, so a weak read can neither extend it nor
        relabel it. A candidate with no match must clear the enter threshold to
        start a new track.
        """
        # A strong detection of another class takes the box over from whatever is
        # on it, so the old track is dropped before matching: this is what stops a
        # stale phone from being carried under a hand over a bottle.
        self._drop_conflicting_tracks(session, candidates)

        pairs: List[Tuple[float, str, int]] = []
        for track_id, track in session.tracks.items():
            stay = stay_threshold(track.category)
            for index, candidate in enumerate(candidates):
                if candidate["class_name"] != track.class_name:
                    continue
                if candidate["confidence"] < stay:
                    continue
                overlap = iou(track.bbox, candidate["bbox"])
                if overlap >= TRACK_MATCH_IOU:
                    pairs.append((overlap, track_id, index))
        pairs.sort(reverse=True)

        matched_tracks: set = set()
        matched_candidates: set = set()
        for _overlap, track_id, index in pairs:
            if track_id in matched_tracks or index in matched_candidates:
                continue
            track = session.tracks[track_id]
            candidate = candidates[index]
            enter = enter_threshold(track.category)
            track.bbox = candidate["bbox"]
            track.confidence = candidate["confidence"]
            track.last_matched = now
            track.last_match_conf = candidate["confidence"]
            if candidate["confidence"] >= enter:
                track.last_strong_match = now
            track.hits.append(True)
            track.confirmed = track.confirmed or sum(track.hits) >= CONFIRM_MIN_HITS
            track.clear_occlusion()
            matched_tracks.add(track_id)
            matched_candidates.add(index)

        for index, candidate in enumerate(candidates):
            if index in matched_candidates:
                continue
            # A track that has been alive for a while may still be revived by a
            # weak detection; a cold candidate must clear the enter threshold.
            if candidate["confidence"] < enter_threshold(candidate["category"]):
                continue
            track = Track(
                track_id=session.next_track_id(),
                class_name=candidate["class_name"],
                category=candidate["category"],
                bbox=candidate["bbox"],
                confidence=candidate["confidence"],
                last_matched=now,
                last_match_conf=candidate["confidence"],
                last_strong_match=now,
            )
            track.hits.append(True)
            track.confirmed = sum(track.hits) >= CONFIRM_MIN_HITS
            session.tracks[track.track_id] = track

        self._age_out_tracks(session, hand_boxes, frame_width, now, matched_tracks)
        return [track for track in session.tracks.values() if track.confirmed]

    @staticmethod
    def _drop_conflicting_tracks(session: SessionState, candidates: List[Dict[str, Any]]) -> None:
        """
        Drop tracks whose box now holds a confidently detected object of another class.

        The person box is skipped: it is a container for every cabin object, not a
        competing one, and it routinely overlaps whatever the driver is holding.
        """
        for candidate in candidates:
            if candidate["category"] == PERSON_CATEGORY:
                continue
            if candidate["confidence"] < enter_threshold(candidate["category"]):
                continue
            for track_id, track in list(session.tracks.items()):
                if track.class_name == candidate["class_name"]:
                    continue
                if iou(track.bbox, candidate["bbox"]) >= TRACK_CONFLICT_IOU:
                    del session.tracks[track_id]

    def _age_out_tracks(
        self,
        session: SessionState,
        hand_boxes: Optional[List[Dict[str, int]]],
        frame_width: int,
        now: float,
        matched_ids: Optional[set] = None,
    ) -> None:
        """
        Drop unmatched tracks in place. One rule set, whether YOLO ran or not.

        A track is dropped unless it was recently matched above its own enter
        threshold. Occlusion is the only exception: a hand over the object, a last
        match at full confidence and a match this very recently are the only
        conditions that let a hidden object outlive the clear time.
        """
        proximity_margin = HAND_PROXIMITY_MARGIN * frame_width
        for track_id in list(session.tracks):
            if matched_ids and track_id in matched_ids:
                continue
            track = session.tracks[track_id]
            idle = now - track.last_matched
            hand_covered = any(
                self._boxes_overlap(track.bbox, hand_box, proximity_margin)
                for hand_box in (hand_boxes or [])
            )
            if (
                track.confirmed
                and hand_covered
                and track.last_match_conf >= enter_threshold(track.category)
                and idle <= TRACK_OCCLUSION_ENTRY_SECONDS
            ):
                track.occluded = True

            if track.occluded and hand_covered and idle <= TRACK_OCCLUSION_SECONDS:
                continue
            if now - track.last_strong_match > TRACK_REVALIDATE_SECONDS:
                del session.tracks[track_id]
            elif idle > TRACK_CLEAR_SECONDS:
                del session.tracks[track_id]

    def reuse_tracks(
        self,
        user_id: str,
        ride_id: Optional[int] = None,
        hand_boxes: Optional[List[Dict[str, int]]] = None,
        mouth_box: Optional[Dict[str, int]] = None,
        frame_width: int = 640,
    ) -> Dict[str, Any]:
        """
        Report the session's surviving tracks without running inference.

        Used when YOLO is skipped by the per-session rate limit. Tracks expire on
        their own timers, so the counts stay truthful rather than dropping to zero.
        """
        session = self._get_session(user_id, ride_id)
        now = time.monotonic()
        with session._lock:
            self._age_out_tracks(session, hand_boxes, frame_width, now)
            tracks = [track for track in session.tracks.values() if track.confirmed]
        return self._describe_tracks(tracks, hand_boxes, mouth_box, frame_width, now)

    def _describe_tracks(
        self,
        confirmed_tracks: List[Track],
        hand_boxes: Optional[List[Dict[str, int]]],
        mouth_box: Optional[Dict[str, int]],
        frame_width: int,
        now: float,
    ) -> Dict[str, Any]:
        """Build the object-event payload from a set of confirmed tracks."""
        detections: List[Dict[str, Any]] = []
        person_detected = False
        cabin_objects: Dict[str, int] = {"phone": 0, "drink": 0, "food": 0}

        for track in confirmed_tracks:
            if track.category == PERSON_CATEGORY:
                person_detected = True
            else:
                cabin_objects[track.category] += 1
            detections.append({
                "track_id": track.track_id,
                "class_name": track.class_name,
                "category": track.category,
                "confidence": round(track.confidence, 4),
                "occluded": track.occluded,
                "bbox": dict(track.bbox),
            })

        active_events: Dict[str, Optional[float]] = {}
        alerts: List[str] = []
        active_alerts: List[str] = []

        # An occluded track is still drawn, so a hand over a real object stays
        # visible. Past the clear time that box is only a guess, so it is no
        # longer evidence: it may not raise or extend an event, or a phone hidden
        # under a hand would keep penalising the driver for as long as it is held.
        counting = [
            detection for track, detection in zip(confirmed_tracks, detections)
            if not track.occluded or now - track.last_matched <= TRACK_CLEAR_SECONDS
        ]

        phone_dets = [d for d in counting if d["category"] == "phone"]
        if phone_dets:
            best_phone = max(phone_dets, key=lambda d: d["confidence"])
            active_events["phone_use"] = best_phone["confidence"]
            active_alerts.append("phone_use")
            alerts.append("Warning: Phone use confirmed (handheld device)")

        # Only a drink/food object held at a hand or brought to the mouth counts as
        # an event. Otherwise it stays a plain cabin object with no penalty.
        proximity_margin = HAND_PROXIMITY_MARGIN * frame_width
        mouth_margin = MOUTH_PROXIMITY_MARGIN * frame_width
        contact_confidences = [
            d["confidence"] for d in counting
            if d["category"] in ("drink", "food") and (
                any(self._boxes_overlap(d["bbox"], hand_box, proximity_margin) for hand_box in (hand_boxes or []))
                or bool(mouth_box) and self._boxes_overlap(d["bbox"], mouth_box, mouth_margin)
            )
        ]
        if contact_confidences:
            active_events["drinking_eating"] = max(contact_confidences)
            active_alerts.append("drinking_eating")
            alerts.append("Warning: Drinking or eating confirmed")

        is_distracted = bool(active_events)
        top_class_name = "No Objects Detected"
        top_confidence = 0.0
        if detections:
            primary = max(detections, key=lambda x: x["confidence"])
            top_class_name = primary["class_name"].title()
            top_confidence = primary["confidence"]

        return {
            "success": True,
            "status": "distracted" if is_distracted else "safe",
            "is_distracted": is_distracted,
            "top_class": top_class_name.lower().replace(" ", "_") if detections else "none",
            "class_name": top_class_name,
            "confidence": top_confidence,
            "person_detected": person_detected,
            "phone_detected": "phone_use" in active_events,
            "detections": detections,
            "detection_count": len(detections),
            "cabin_objects": cabin_objects,
            "cabin_object_count": sum(cabin_objects.values()),
            "alerts": alerts,
            "active_alerts": active_alerts,
            "active_events": active_events,
        }

    def process_frame(
        self,
        frame: np.ndarray,
        user_id: str = "default",
        ride_id: Optional[int] = None,
        hand_boxes: Optional[List[Dict[str, int]]] = None,
        mouth_box: Optional[Dict[str, int]] = None,
        candidates: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Track cabin objects for one frame and derive the object events.

        Args:
            frame: OpenCV BGR frame
            user_id: User identifier for session isolation
            ride_id: Optional ride ID
            hand_boxes: Hand bboxes from MediaPipe for drink/food association
            mouth_box: Mouth bbox from MediaPipe for drink/food association
            candidates: Optional pre-computed YOLO candidates, so inference can
                run concurrently with MediaPipe. When omitted, run it here.

        Returns:
            Dict with tracked detections and active object events.
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError(
                f"YOLO Object Detection model not loaded: {self.model_path or 'yolo11n.pt'}"
            )

        session = self._get_session(user_id, ride_id)
        frame_width = frame.shape[1]
        now = time.monotonic()

        if candidates is None:
            candidates = self.run_inference(frame)
        with session._lock:
            session.last_yolo_monotonic = now
            session.yolo_runs += 1
            confirmed_tracks = self._update_tracks(session, candidates, hand_boxes, frame_width, now)

        return self._describe_tracks(confirmed_tracks, hand_boxes, mouth_box, frame_width, now)

    def get_session_summary(self, user_id: str, ride_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        The session's report, or None when there is no measured ride to report.

        Read through `find_session`, never `get_session`: reading a report must
        not bring a session into existence. A session created by a read has
        scored no frame, so it carries START_SCORE and reads as a perfect,
        event-free ride — a report that describes a ride that never happened.
        """
        session = session_manager.find_session(user_id, ride_id)
        if session is None:
            return None
        return session.get_session_summary()

    def finalize_session(self, user_id: str, ride_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Freeze a user's session for a ride and return its final report.

        The only read that can produce the report of a finished ride: it is taken
        while the session is still the one the ride's frames were scored into, and
        it freezes that session so no later frame can change the answer. Returns
        None when the ride was never scored, which is not a clean ride.
        """
        return session_manager.finalize_session(user_id, ride_id)

    def reset_session(self, user_id: str, ride_id: Optional[int] = None) -> None:
        """Reset session for a user/ride."""
        session = self._get_session(user_id, ride_id)
        session.reset()

    def set_ride(self, user_id: str, ride_id: Optional[int]) -> None:
        """Set ride context for a user."""
        session_manager.set_ride(user_id, ride_id)

    def clear_ride(self, user_id: str) -> None:
        """Clear ride context for a user."""
        session_manager.clear_ride(user_id)


# Singleton YOLO AI Service Instance
yolo_service = YOLOAIService()

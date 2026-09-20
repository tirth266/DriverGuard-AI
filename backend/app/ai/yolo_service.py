import time
import base64
import logging
import os
from collections import deque
from pathlib import Path
from typing import Optional, Dict, Any, List

import cv2
import numpy as np

logger = logging.getLogger(__name__)


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
        
        # Temporal reasoning for phone detections
        self.phone_history: deque = deque(maxlen=150)
        self.MIN_FRAMES_FOR_DISTRACTION = 3

        # Configured distraction classes (pretrained YOLO11 COCO)
        self.DISTRACTOR_CLASSES = {"cell phone", "bottle", "cup"}
        self.SAFE_BASELINE_SCORE = 98

        # In-memory session distraction summary (Phase 8)
        self.session_start_time: float = time.time()
        self.lowest_session_score: int = self.SAFE_BASELINE_SCORE
        self.active_events: Dict[str, Dict[str, Any]] = {}
        self.completed_events: List[Dict[str, Any]] = []

    def reset_session(self) -> None:
        """Resets all in-memory session metrics and event history."""
        self.session_start_time = time.time()
        self.lowest_session_score = self.SAFE_BASELINE_SCORE
        self.active_events.clear()
        self.completed_events.clear()
        self.phone_history.clear()

    def get_session_summary(self, current_score: Optional[int] = None) -> Dict[str, Any]:
        """
        Builds the in-memory session summary including all completed and currently active events.
        """
        score = current_score if current_score is not None else self.SAFE_BASELINE_SCORE

        # Combine completed and active events without duplicates
        all_events: List[Dict[str, Any]] = list(self.completed_events)
        for ev in self.active_events.values():
            all_events.append({
                "type": ev["type"],
                "start_time": round(ev["start_time"], 2),
                "end_time": round(ev["end_time"], 2),
                "duration": round(max(0.0, ev["end_time"] - ev["start_time"]), 2),
                "max_confidence": round(ev["max_confidence"], 4) if ev["max_confidence"] is not None else None,
                "min_score": int(ev["min_score"]),
            })

        phone_events = sum(1 for e in all_events if e["type"] == "cell phone")
        bottle_events = sum(1 for e in all_events if e["type"] == "bottle")
        cup_events = sum(1 for e in all_events if e["type"] == "cup")
        total_duration = round(sum(e["duration"] for e in all_events), 2)

        return {
            "current_safety_score": score,
            "lowest_session_score": int(self.lowest_session_score),
            "total_distraction_events": len(all_events),
            "phone_events": phone_events,
            "bottle_events": bottle_events,
            "cup_events": cup_events,
            "total_distracted_duration": total_duration,
            "events": all_events,
        }

    # Event types owned by each domain so updates don't cancel the other domain's events
    _YOLO_EVENT_TYPES: frozenset = frozenset({"cell phone", "bottle", "cup"})
    _MEDIAPIPE_EVENT_TYPES: frozenset = frozenset({
        "prolonged_eye_closure", "yawning",
        "head_pose_left", "head_pose_right", "head_pose_down",
    })

    def _update_session_events(
        self,
        active_detections: Dict[str, Optional[float]],
        score: int,
        current_time: float,
        owned_types: Optional[frozenset] = None,
    ) -> None:
        """Merge continuous confirmed detections and close events on absence.

        ``owned_types``: when provided, only events whose type belongs to this
        set are eligible for closure when absent.  Events from other domains are
        left untouched so concurrent YOLO + MediaPipe updates don't cancel each
        other.
        """
        self.lowest_session_score = min(self.lowest_session_score, score)

        for event_type, confidence in active_detections.items():
            event = self.active_events.get(event_type)
            if event is None:
                self.active_events[event_type] = {
                    "type": event_type,
                    "start_time": current_time,
                    "end_time": current_time,
                    "max_confidence": confidence,
                    "min_score": score,
                }
                continue

            event["end_time"] = current_time
            if confidence is not None:
                event["max_confidence"] = max(event["max_confidence"] or 0.0, confidence)
            event["min_score"] = min(event["min_score"], score)

        for event_type in list(self.active_events):
            if event_type in active_detections:
                continue
            # If domain scoping is active, only close events owned by this domain
            if owned_types is not None and event_type not in owned_types:
                continue
            event = self.active_events.pop(event_type)
            self.completed_events.append({
                "type": event["type"],
                "start_time": round(event["start_time"], 2),
                "end_time": round(event["end_time"], 2),
                "duration": round(max(0.0, event["end_time"] - event["start_time"]), 2),
                "max_confidence": round(event["max_confidence"], 4) if event["max_confidence"] is not None else None,
                "min_score": int(event["min_score"]),
            })

    def update_mediapipe_events(self, media_result: Dict[str, Any], score: int) -> None:
        """Merge confirmed MediaPipe events into the existing Phase 8 session."""
        confirmed_events = media_result.get("events", []) if media_result.get("face_detected") else []
        active_events = {event_type: None for event_type in confirmed_events}
        self._update_session_events(active_events, score, time.time(), owned_types=self._MEDIAPIPE_EVENT_TYPES)


    def load_model(self, custom_path: Optional[str] = None) -> bool:
        """
        Loads the YOLO11 Object Detection model once at startup.
        Strictly validates that the loaded model is an Object Detection model,
        rejecting classification checkpoints.
        """
        try:
            base_dir = Path(__file__).resolve().parent.parent.parent  # backend/
            candidates: List[Path] = []

            if custom_path:
                candidates.append(Path(custom_path))

            env_path = os.getenv("YOLO_MODEL_PATH")
            if env_path:
                candidates.append(Path(env_path))

            # Detection model locations
            candidates.extend([
                base_dir / "models" / "trained" / "yolo11" / "detection" / "best.pt",
                base_dir / "models" / "trained" / "yolo11" / "detection" / "yolo11n.pt",
                base_dir / "yolo11n.pt",
                base_dir.parent / "yolo11n.pt",
            ])

            from ultralytics import YOLO
            import torch

            # Determine compute device
            self.device = "cuda" if torch.cuda.is_available() else "cpu"

            resolved_path = None
            last_error = None

            for p in candidates:
                if not p.exists() or not p.is_file():
                    continue

                candidate_path = str(p.resolve())
                logger.info(f"[YOLO Detection] Testing candidate model: {candidate_path}")
                print(f"[YOLO Detection] Testing candidate model: {candidate_path}")

                try:
                    loaded_model = YOLO(candidate_path)
                    model_task = getattr(loaded_model, "task", "detect")
                    model_classes = getattr(loaded_model, "names", {})

                    # ── Strict Detection Validation Guards ────────────────────
                    if model_task == "classify" or "-cls" in p.name.lower():
                        raise ValueError(
                            f"Expected YOLO Object Detection model, but a Classification model was loaded ('{p.name}')."
                        )

                    if model_task != "detect":
                        raise ValueError(
                            f"Invalid model task '{model_task}' in '{p.name}' (expected 'detect')."
                        )

                    # Validation passed: assign model
                    self.model_path = candidate_path
                    self.model = loaded_model
                    self.task = "detect"
                    self.classes = model_classes
                    self.is_loaded = True

                    logger.info(f"[YOLO Detection] Model loaded successfully: {self.model_path}")
                    logger.info(f"[YOLO Detection] Device: {self.device.upper()} | Task: {self.task} | Classes: {len(self.classes)}")
                    print(f"[YOLO Detection] Model loaded successfully: {self.model_path}")
                    print(f"[YOLO Detection] Device: {self.device.upper()} | Task: {self.task} | Classes ({len(self.classes)})")
                    return True

                except Exception as candidate_err:
                    last_error = candidate_err
                    logger.warning(f"[YOLO Detection] Candidate '{p.name}' rejected: {candidate_err}")
                    print(f"[YOLO Detection] Candidate '{p.name}' rejected: {candidate_err}")
                    continue

            # If no local candidate was valid, attempt to load default yolo11n.pt from Ultralytics Hub
            try:
                logger.info("[YOLO Detection] Falling back to standard yolo11n.pt detection checkpoint...")
                loaded_model = YOLO("yolo11n.pt")
                if getattr(loaded_model, "task", "detect") == "detect":
                    self.model_path = "yolo11n.pt"
                    self.model = loaded_model
                    self.task = "detect"
                    self.classes = getattr(loaded_model, "names", {})
                    self.is_loaded = True
                    return True
            except Exception as hub_err:
                last_error = hub_err

            err_msg = f"No valid YOLO Object Detection model could be loaded. Last error: {last_error}"
            logger.error(f"[YOLO Detection] {err_msg}")
            print(f"[YOLO Detection] ERROR: {err_msg}")
            self.is_loaded = False
            return False

        except Exception as e:
            logger.error(f"[YOLO Detection] Failed to load model: {e}")
            print(f"[YOLO Detection] ERROR loading model: {e}")
            self.is_loaded = False
            return False

    def process_frame(
        self,
        frame: np.ndarray,
        confidence_threshold: float = 0.40
    ) -> Dict[str, Any]:
        """
        Runs YOLO11 Object Detection inference on an OpenCV BGR frame.
        Extracts all valid bounding boxes, class labels, and confidences.
        Identifies distracted driver behaviors (e.g. phone in cabin) and
        generates an annotated HUD overlay frame.
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError(
                f"YOLO Object Detection model not loaded: {self.model_path or 'yolo11n.pt'}"
            )

        h, w, _ = frame.shape
        overlay_frame = frame.copy()

        # Run detection inference
        results = self.model.predict(
            source=frame,
            conf=confidence_threshold,
            device=self.device,
            verbose=False,
        )

        res = results[0]
        detections: List[Dict[str, Any]] = []
        alerts: List[str] = []

        face_detected = False
        frame_has_phone = False
        frame_has_bottle = False
        frame_has_cup = False

        top_class_name = "No Objects Detected"
        top_confidence = 0.0

        # ── Extract Object Detections ──────────────────────────────────────────
        if hasattr(res, "boxes") and res.boxes is not None and len(res.boxes) > 0:
            for box in res.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                cls_name = res.names.get(cls_id, str(cls_id))
                xyxy = [int(v) for v in box.xyxy[0].tolist()]
                x1, y1, x2, y2 = xyxy

                if conf < confidence_threshold:
                    continue

                cls_name_lower = cls_name.lower().strip()

                # Determine distractor classification (COCO classes: cell phone, bottle, cup)
                is_phone = "phone" in cls_name_lower or "cell" in cls_name_lower
                is_bottle = "bottle" in cls_name_lower
                is_cup = "cup" in cls_name_lower
                is_person = "person" in cls_name_lower

                # Only configured distractors are flagged; normal cabin objects remain non-distractors
                is_distractor = is_phone or is_bottle or is_cup

                if is_phone:
                    frame_has_phone = True
                if is_bottle:
                    frame_has_bottle = True
                if is_cup:
                    frame_has_cup = True
                if is_person:
                    face_detected = True

                # Record detection with integer coordinates and distractor flag
                detection_entry = {
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "confidence": round(conf, 4),
                    "is_distractor": is_distractor,
                    "bbox": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                    }
                }
                detections.append(detection_entry)

                # Render Bounding Box on overlay frame
                # Distractor -> RED (0, 0, 255), Normal/background -> GREEN (0, 255, 0)
                box_color = (0, 0, 255) if is_distractor else (0, 255, 0)
                cv2.rectangle(overlay_frame, (x1, y1), (x2, y2), box_color, 2)

                # Draw label with filled background rectangle for clear contrast
                label = f"{cls_name.upper()} {int(conf * 100)}%"
                (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                cv2.rectangle(
                    overlay_frame,
                    (x1, max(y1 - lh - 8, 0)),
                    (x1 + lw + 6, max(y1, lh + 8)),
                    box_color,
                    -1
                )
                cv2.putText(
                    overlay_frame,
                    label,
                    (x1 + 3, max(y1 - 4, lh)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.45,
                    (255, 255, 255),
                    1,
                    cv2.LINE_AA
                )

        # ── Temporal Logic for Distraction ─────────────────────────────────────
        current_time = time.time()
        if frame_has_phone:
            self.phone_history.append(current_time)
        else:
            self.phone_history.clear()

        # Clean up old history outside the rolling window
        phone_confirmed = len(self.phone_history) >= self.MIN_FRAMES_FOR_DISTRACTION
        phone_detected_event = phone_confirmed

        # Active distractor detections in the current frame
        distractor_dets = [d for d in detections if d.get("is_distractor")]

        # Distraction status: distracted whenever at least one configured distractor object
        # is currently or temporally confirmed; safe when no distractor is present.
        is_distracted = phone_confirmed or frame_has_bottle or frame_has_cup or (frame_has_phone and phone_confirmed)

        # ── Dynamic Safety Score Calculation ──────────────────────────────────
        if is_distracted:
            status = "distracted"
            total_penalty = 0.0
            distractor_count = 0

            for d in distractor_dets:
                cname = d["class_name"].lower()
                c_conf = d["confidence"]
                if "phone" in cname or "cell" in cname:
                    total_penalty += 25.0 + (15.0 * c_conf)
                    distractor_count += 1
                elif "bottle" in cname:
                    total_penalty += 15.0 + (10.0 * c_conf)
                    distractor_count += 1
                elif "cup" in cname:
                    total_penalty += 15.0 + (10.0 * c_conf)
                    distractor_count += 1

            # If phone is temporally confirmed during a brief frame drop
            if phone_confirmed and not any("phone" in d["class_name"].lower() or "cell" in d["class_name"].lower() for d in distractor_dets):
                total_penalty += 35.0
                distractor_count += 1

            # Compound penalty for multiple concurrent distractors
            if distractor_count > 1:
                total_penalty += 5.0 * (distractor_count - 1)

            score = max(20, min(self.SAFE_BASELINE_SCORE, int(round(self.SAFE_BASELINE_SCORE - total_penalty))))

            # Distractor alerts without fabricating driver actions (never infer drinking from bottle/cup)
            active_distractor_names = set()
            for d in distractor_dets:
                cname = d["class_name"].lower()
                if "phone" in cname or "cell" in cname:
                    active_distractor_names.add("Mobile Phone")
                elif "bottle" in cname:
                    active_distractor_names.add("Bottle")
                elif "cup" in cname:
                    active_distractor_names.add("Cup")

            if phone_confirmed and "Mobile Phone" not in active_distractor_names:
                active_distractor_names.add("Mobile Phone")

            for d_name in sorted(active_distractor_names):
                if d_name == "Mobile Phone":
                    alerts.append("Warning: Mobile phone distractor detected")
                else:
                    alerts.append(f"Warning: Distractor object detected ({d_name})")
        else:
            status = "safe"
            score = self.SAFE_BASELINE_SCORE

        # Session events use confirmed phone detections and immediate bottle/cup detections.
        active_event_confidences: Dict[str, float] = {}
        for detection in distractor_dets:
            class_name = detection["class_name"].lower()
            if "cell phone" in class_name or "phone" in class_name:
                event_type = "cell phone"
            elif "bottle" in class_name:
                event_type = "bottle"
            elif "cup" in class_name:
                event_type = "cup"
            else:
                continue

            if event_type == "cell phone" and not phone_confirmed:
                continue
            active_event_confidences[event_type] = max(
                active_event_confidences.get(event_type, 0.0),
                detection["confidence"],
            )

        self._update_session_events(active_event_confidences, score, current_time, owned_types=self._YOLO_EVENT_TYPES)
        session_summary = self.get_session_summary(score)

        # Prioritize alerts / primary display item
        if distractor_dets:
            primary = max(distractor_dets, key=lambda x: x["confidence"])
            top_class_name = primary["class_name"].title()
            top_confidence = primary["confidence"]
        elif detections:
            primary = max(detections, key=lambda x: x["confidence"])
            top_class_name = primary["class_name"].title()
            top_confidence = primary["confidence"]

        # ── Draw AI HUD Overlays ──────────────────────────────────────────────
        hud_bg = overlay_frame.copy()
        cv2.rectangle(hud_bg, (0, 0), (w, 36), (10, 10, 10), -1)
        cv2.rectangle(hud_bg, (0, h - 32), (w, h), (10, 10, 10), -1)
        cv2.addWeighted(hud_bg, 0.75, overlay_frame, 0.25, 0, overlay_frame)

        # Header Badge
        header_color = (0, 0, 255) if is_distracted else (0, 255, 128)
        status_banner = f"YOLO11 DETECTING ({len(detections)} OBJECTS)" if not is_distracted else f"YOLO11 ALERT: {top_class_name.upper()} DETECTED"

        cv2.putText(
            overlay_frame,
            status_banner,
            (12, 24),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            header_color,
            2,
            cv2.LINE_AA
        )

        cv2.putText(
            overlay_frame,
            f"SAFETY SCORE: {score}/100",
            (w - 195, 24),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.50,
            (0, 255, 255),
            2,
            cv2.LINE_AA
        )

        # Footer Bar
        footer_text = f"OBJECTS: {len(detections)} | CABIN: {'ALERT' if is_distracted else 'FOCUSED'} | DISTRACTORS: {len(distractor_dets)}"
        cv2.putText(
            overlay_frame,
            footer_text,
            (12, h - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.42,
            (220, 220, 220),
            1,
            cv2.LINE_AA
        )

        # Encode processed frame back to base64 JPEG
        _, buffer = cv2.imencode(".jpg", overlay_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        processed_base64 = base64.b64encode(buffer).decode("utf-8")

        return {
            "success": True,
            "status": status,
            "is_distracted": is_distracted,
            "top_class": top_class_name.lower().replace(" ", "_") if detections else "none",
            "class_name": top_class_name,
            "confidence": top_confidence,
            "score": score,
            "face_detected": face_detected,
            "phone_detected": phone_detected_event,
            "detections": detections,
            "detection_count": len(detections),
            "alerts": alerts,
            "session_summary": session_summary,
            "processed_frame": f"data:image/jpeg;base64,{processed_base64}",
            "width": w,
            "height": h,
        }


# Singleton YOLO AI Service Instance
yolo_service = YOLOAIService()

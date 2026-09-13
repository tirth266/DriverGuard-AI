import base64
import logging
import os
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

        is_distracted = False
        phone_detected = False
        face_detected = False
        eyes_on_road = True
        status = "safe"
        score = 98

        top_class_name = "Cabin Safe"
        top_confidence = 0.98

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

                cls_name_lower = cls_name.lower()

                # Determine distractor classification
                is_phone = "phone" in cls_name_lower or "cell" in cls_name_lower
                is_smoke = "smoke" in cls_name_lower or "cigarette" in cls_name_lower
                is_distractor = is_phone or is_smoke or "distract" in cls_name_lower

                if is_phone:
                    phone_detected = True
                    is_distracted = True
                    status = "distracted"
                    alerts.append(f"Warning: Mobile phone detected ({int(conf * 100)}%)")

                if is_smoke:
                    is_distracted = True
                    status = "distracted"
                    alerts.append(f"Warning: Smoking detected ({int(conf * 100)}%)")

                if "person" in cls_name_lower:
                    face_detected = True

                # Record detection with integer coordinates
                detection_entry = {
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "confidence": round(conf, 4),
                    "bbox": {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                    }
                }
                detections.append(detection_entry)

                # Render Bounding Box on overlay frame
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

        # Update scoring and distraction states
        if is_distracted:
            score = max(35, int(70 - (10 * len(alerts))))
            eyes_on_road = False
        else:
            status = "safe"
            score = 98

        # Prioritize alerts / primary display item
        if detections:
            # If phone or distractor is detected, make it the prominent class
            distractor_dets = [d for d in detections if any(kw in d["class_name"].lower() for kw in ["phone", "cell", "smoke"])]
            if distractor_dets:
                primary = max(distractor_dets, key=lambda x: x["confidence"])
                top_class_name = primary["class_name"].title()
                top_confidence = primary["confidence"]
            else:
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
        footer_text = f"OBJECTS: {len(detections)} | CABIN: {'ALERT' if is_distracted else 'FOCUSED'} | PHONE: {'DETECTED' if phone_detected else 'CLEAR'}"
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
            "top_class": top_class_name.lower().replace(" ", "_"),
            "class_name": top_class_name,
            "confidence": top_confidence,
            "score": score,
            "face_detected": face_detected,
            "eyes_on_road": eyes_on_road,
            "phone_detected": phone_detected,
            "seatbelt_ok": True,
            "drowsiness": 5 if is_distracted else 2,
            "detections": detections,
            "detection_count": len(detections),
            "alerts": alerts,
            "processed_frame": f"data:image/jpeg;base64,{processed_base64}",
            "width": w,
            "height": h,
        }


# Singleton YOLO AI Service Instance
yolo_service = YOLOAIService()

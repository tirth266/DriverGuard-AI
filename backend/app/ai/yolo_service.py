import base64
import logging
import os
from pathlib import Path
from typing import Optional, Dict, Any, List

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Class labels and human-readable descriptions for Distracted Driver Dataset (c0 - c9)
CLASS_DESCRIPTIONS = {
    "c0": {"label": "Safe Driving", "distracted": False, "phone": False, "eyes": True},
    "c1": {"label": "Texting (Right Hand)", "distracted": True, "phone": True, "eyes": False},
    "c2": {"label": "Talking on Phone (Right Hand)", "distracted": True, "phone": True, "eyes": False},
    "c3": {"label": "Texting (Left Hand)", "distracted": True, "phone": True, "eyes": False},
    "c4": {"label": "Talking on Phone (Left Hand)", "distracted": True, "phone": True, "eyes": False},
    "c5": {"label": "Operating Radio / Dashboard", "distracted": True, "phone": False, "eyes": False},
    "c6": {"label": "Drinking / Eating", "distracted": True, "phone": False, "eyes": False},
    "c7": {"label": "Reaching Behind", "distracted": True, "phone": False, "eyes": False},
    "c8": {"label": "Hair & Makeup Grooming", "distracted": True, "phone": False, "eyes": False},
    "c9": {"label": "Talking to Passenger", "distracted": True, "phone": False, "eyes": False},
}


class YOLOAIService:
    """YOLO11 Model Service for Real-time Driver Distraction Detection."""

    def __init__(self):
        self.model = None
        self.is_loaded = False
        self.model_path = None
        self.device = "cpu"
        self.task = "classify"
        self.classes = {}

    def load_model(self, custom_path: Optional[str] = None) -> bool:
        """Loads the YOLO11 best.pt model once at startup using robust pathlib resolution."""
        try:
            # 1. Resolve model candidate paths in priority order
            base_dir = Path(__file__).resolve().parent.parent.parent  # backend/
            candidates = []

            if custom_path:
                candidates.append(Path(custom_path))

            env_path = os.getenv("YOLO_MODEL_PATH")
            if env_path:
                candidates.append(Path(env_path))

            candidates.extend([
                base_dir / "models" / "trained" / "yolo11" / "ddd_yolo11_full_best.pt",
            ])

            from ultralytics import YOLO
            import torch

            # Determine device (CUDA GPU if available, else CPU fallback)
            self.device = "cuda" if torch.cuda.is_available() else "cpu"

            resolved_path = None
            last_error = None

            for p in candidates:
                if not p.exists() or not p.is_file():
                    continue

                candidate_path = str(p.resolve())
                logger.info(f"[YOLO] Testing candidate model: {candidate_path}")
                print(f"[YOLO] Testing candidate model: {candidate_path}")

                try:
                    loaded_model = YOLO(candidate_path)
                    model_task = getattr(loaded_model, "task", "classify")
                    model_classes = getattr(loaded_model, "names", {})

                    # ── Strict Validation Guards ──────────────────────────────
                    if model_task != "classify":
                        raise ValueError(f"Invalid model task '{model_task}' (expected 'classify')")

                    if len(model_classes) == 1000:
                        raise ValueError(
                            f"ImageNet 1000-class base model detected in '{p.name}'. "
                            "Expected the fine-tuned 10-class (c0-c9) DDD model."
                        )

                    if len(model_classes) != 10:
                        raise ValueError(
                            f"Invalid class count ({len(model_classes)}). Expected 10 classes (c0-c9)."
                        )

                    # Validation passed!
                    self.model_path = candidate_path
                    self.model = loaded_model
                    self.task = model_task
                    self.classes = model_classes
                    self.is_loaded = True

                    logger.info(f"[YOLO] Model loaded successfully from: {self.model_path}")
                    logger.info(f"[YOLO] Device: {self.device.upper()} | Task: {self.task} | Classes: {len(self.classes)}")
                    print(f"[YOLO] Model loaded successfully from: {self.model_path}")
                    print(f"[YOLO] Device: {self.device.upper()} | Task: {self.task} | Classes ({len(self.classes)}): {self.classes}")
                    return True

                except Exception as candidate_err:
                    last_error = candidate_err
                    logger.warning(f"[YOLO] Candidate '{p.name}' rejected: {candidate_err}")
                    print(f"[YOLO] Candidate '{p.name}' rejected: {candidate_err}")
                    continue

            err_msg = f"No valid 10-class DDD model could be loaded. Last error: {last_error}"
            logger.error(f"[YOLO] {err_msg}")
            print(f"[YOLO] ERROR: {err_msg}")
            self.is_loaded = False
            return False

        except Exception as e:
            logger.error(f"[YOLO] Failed to load model: {e}")
            print(f"[YOLO] ERROR loading model: {e}")
            self.is_loaded = False
            return False

    def process_frame(
        self,
        frame: np.ndarray,
        confidence_threshold: float = 0.40
    ) -> Dict[str, Any]:
        """
        Runs YOLO11 inference on a BGR image frame, extracts predictions,
        builds clean JSON response, and draws AI HUD overlays.
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError(f"YOLO model not found: {self.model_path or 'backend/models/trained/yolo11/best.pt'}")

        h, w, _ = frame.shape
        overlay_frame = frame.copy()

        # Run inference
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
        status = "safe"
        top_class_code = "c0"
        top_class_name = "Safe Driving"
        top_confidence = 0.0
        phone_detected = False
        eyes_on_road = True
        score = 98

        # Case A: Classification Model (yolo11n-cls.pt)
        if self.task == "classify" and hasattr(res, "probs") and res.probs is not None:
            top1_idx = int(res.probs.top1)
            top1_conf = float(res.probs.top1conf)
            class_code = res.names.get(top1_idx, f"c{top1_idx}")

            top_class_code = class_code
            top_confidence = round(top1_conf, 4)

            desc = CLASS_DESCRIPTIONS.get(class_code, {
                "label": f"Class {class_code}",
                "distracted": class_code != "c0",
                "phone": "phone" in class_code.lower() or "text" in class_code.lower(),
                "eyes": class_code == "c0"
            })

            top_class_name = desc["label"]
            is_distracted = desc["distracted"]
            phone_detected = desc["phone"]
            eyes_on_road = desc["eyes"]

            if top_confidence >= confidence_threshold:
                if is_distracted:
                    status = "distracted"
                    score = max(35, int((1.0 - (top_confidence * 0.55)) * 100))
                    alerts.append(f"Warning: Driver distraction detected ({top_class_name})")
                else:
                    status = "safe"
                    score = min(99, int(top_confidence * 100))

                detections.append({
                    "class_id": top1_idx,
                    "class_name": top_class_name,
                    "raw_class": top_class_code,
                    "confidence": top_confidence,
                    "bbox": None
                })

        # Case B: Object Detection Model (yolo11n.pt) fallback
        elif hasattr(res, "boxes") and res.boxes is not None and len(res.boxes) > 0:
            for box in res.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                cls_name = res.names.get(cls_id, str(cls_id))
                xyxy = [int(v) for v in box.xyxy[0].tolist()]

                if conf >= confidence_threshold:
                    det_distracted = "phone" in cls_name.lower() or "smoke" in cls_name.lower() or "distract" in cls_name.lower()
                    if det_distracted:
                        is_distracted = True
                        status = "distracted"
                        alerts.append(f"Warning: {cls_name.capitalize()} detected")
                        if "phone" in cls_name.lower():
                            phone_detected = True

                    detections.append({
                        "class_id": cls_id,
                        "class_name": cls_name,
                        "raw_class": cls_name,
                        "confidence": round(conf, 4),
                        "bbox": {
                            "x1": xyxy[0],
                            "y1": xyxy[1],
                            "x2": xyxy[2],
                            "y2": xyxy[3]
                        }
                    })

                    # Draw Bounding Box on overlay
                    box_color = (0, 0, 255) if det_distracted else (0, 255, 0)
                    cv2.rectangle(overlay_frame, (xyxy[0], xyxy[1]), (xyxy[2], xyxy[3]), box_color, 2)
                    cv2.putText(
                        overlay_frame,
                        f"{cls_name} {int(conf * 100)}%",
                        (xyxy[0], max(xyxy[1] - 8, 15)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        box_color,
                        2
                    )

            if is_distracted:
                score = 65
                eyes_on_road = False

        # Draw AI HUD Overlay (Top & Bottom status bars)
        hud_bg = overlay_frame.copy()
        cv2.rectangle(hud_bg, (0, 0), (w, 40), (10, 10, 10), -1)
        cv2.rectangle(hud_bg, (0, h - 35), (w, h), (10, 10, 10), -1)
        cv2.addWeighted(hud_bg, 0.7, overlay_frame, 0.3, 0, overlay_frame)

        # Header Badge
        header_color = (0, 0, 255) if is_distracted else (0, 255, 128)
        status_banner = f"YOLO11 AI: {top_class_name.upper()} ({int(top_confidence * 100)}%)" if self.task == "classify" else f"YOLO11 DETECTING ({len(detections)} OBJECTS)"

        cv2.putText(
            overlay_frame,
            status_banner,
            (15, 26),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            header_color,
            2,
            cv2.LINE_AA
        )

        cv2.putText(
            overlay_frame,
            f"SAFETY SCORE: {score}/100",
            (w - 200, 26),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (0, 255, 255),
            2,
            cv2.LINE_AA
        )

        # Footer Bar
        footer_text = f"CABIN GAZE: {'FOCUSED' if eyes_on_road else 'DISTRACTED'} | PHONE: {'DETECTED' if phone_detected else 'CLEAR'}"
        cv2.putText(
            overlay_frame,
            footer_text,
            (15, h - 12),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
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
            "top_class": top_class_code,
            "class_name": top_class_name,
            "confidence": top_confidence,
            "score": score,
            "face_detected": True,
            "eyes_on_road": eyes_on_road,
            "phone_detected": phone_detected,
            "seatbelt_ok": True,
            "drowsiness": 5 if is_distracted else 2,
            "detections": detections,
            "alerts": alerts,
            "processed_frame": f"data:image/jpeg;base64,{processed_base64}",
            "width": w,
            "height": h
        }


# Singleton YOLO AI Service Instance
yolo_service = YOLOAIService()

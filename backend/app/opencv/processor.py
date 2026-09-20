import base64
import logging
import cv2
import numpy as np

logger = logging.getLogger(__name__)


class OpenCVFrameProcessor:
    """Processor for live driver monitoring video frames combining YOLO11 AI & OpenCV."""

    def __init__(self):
        # Load built-in OpenCV Haar Cascades for face and eye detection fallback
        try:
            self.face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            self.eye_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_eye.xml'
            )
            logger.info("OpenCV Haar cascades initialized for fallback processing.")
        except Exception as e:
            logger.error(f"Error loading OpenCV cascades: {e}")
            self.face_cascade = None
            self.eye_cascade = None

    def process_base64_frame(self, base64_str: str) -> dict:
        """
        Decodes a base64 frame, passes it to YOLO11 AI model if loaded,
        or falls back to OpenCV HaarCascade processor.
        """
        if not base64_str:
            raise ValueError("No frame data provided")

        # Strip header if data URI scheme is present
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]

        # Decode base64 to binary bytes
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise ValueError("Failed to decode image frame with OpenCV")

        # ── Primary Path: pretrained YOLO object detection ─────────────────
        from app.ai.yolo_service import yolo_service
        if not yolo_service.is_loaded:
            message = "YOLO detection service is not ready"
            logger.error("[YOLO] Frame rejected: %s", message)
            raise RuntimeError(message)

        try:
            from app.config import get_config
            from app.ai.mediapipe_service import mediapipe_service
            conf_threshold = get_config()().YOLO_CONFIDENCE_THRESHOLD
            result = yolo_service.process_frame(frame, confidence_threshold=conf_threshold)
            mediapipe_result = mediapipe_service.process_frame(frame)
            yolo_service.update_mediapipe_events(mediapipe_result, result["score"])
            result["mediapipe"] = mediapipe_result
            result["session_summary"] = yolo_service.get_session_summary(result["score"])
            return result
        except Exception as yolo_err:
            logger.exception("[YOLO] Frame inference failed: %s", yolo_err)
            raise RuntimeError("YOLO inference failed") from yolo_err


opencv_processor = OpenCVFrameProcessor()

import base64
import logging
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Set once the background model load/warm-up thread has finished, successfully or
# not. Until then the server accepts requests but cannot run live detection, so
# /api/video/status reports "warming_up" and /api/video/process_frame refuses
# immediately instead of making the caller wait on a model that is not there yet.
_warmup_finished = threading.Event()


def is_warming_up() -> bool:
    """True while the startup model load / warm-up thread is still running."""
    return not _warmup_finished.is_set()


def mark_warmup_finished() -> None:
    """Called by the startup thread once every model has been loaded and warmed."""
    _warmup_finished.set()

# Ordered by how badly they invalidate the live AI signal.
AI_STATUS_PRIORITY = ("backend_down", "no_face", "no_result")

# Torch defaults to the logical core count, which oversubscribes on SMT machines
# and slows inference. One thread per physical core is the usual CPU win.
TORCH_NUM_THREADS = os.cpu_count() or 1

# YOLO and MediaPipe share the CPU, so each frame runs both at once: two workers,
# one stateless submission each. The MediaPipe side runs its two models internally.
_INFERENCE_POOL = ThreadPoolExecutor(max_workers=2, thread_name_prefix="dg-infer")


def configure_torch_threads() -> int:
    """Apply the thread budget once, before any inference happens."""
    try:
        import torch

        torch.set_num_threads(TORCH_NUM_THREADS)
    except Exception as e:  # pragma: no cover - torch is an inference dependency
        logger.warning("[Torch] Could not set thread count: %s", e)
    return TORCH_NUM_THREADS


def _timed(fn):
    """Wrap an inference so it reports its own elapsed time, not the wait for it."""
    def wrapper(*args):
        started = time.perf_counter()
        try:
            return fn(*args), (time.perf_counter() - started) * 1000.0, None
        except Exception as e:
            return None, (time.perf_counter() - started) * 1000.0, e
    return wrapper


def _safe_submit(pool, fn, *args):
    """Submit work and never let one failing model raise into the caller."""
    try:
        return pool.submit(_timed(fn), *args)
    except Exception as e:  # pragma: no cover - pool submission failure
        logger.exception("[Pipeline] Failed to submit %s: %s", getattr(fn, "__name__", fn), e)
        return None


class OpenCVFrameProcessor:
    """Processor for live driver monitoring video frames using YOLO11 AI and MediaPipe.

    Each inference component (base64 decode, OpenCV decode, YOLO, MediaPipe) is handled
    independently to prevent cascading failures. One model failing does not corrupt
    the other model's output.
    """

    def __init__(self):
        pass

    def process_base64_frame(
        self,
        base64_str: str,
        user_id: str = "default",
        ride_id: int = None,
    ) -> dict:
        """
        Decodes a base64 frame and processes it through YOLO11 and MediaPipe.

        Returns a structured response with explicit success/failure status for each component.
        """
        if not base64_str:
            raise ValueError("No frame data provided")

        decode_started = time.perf_counter()

        # Strip header if data URI scheme is present
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]

        # Decode base64 to binary bytes
        try:
            img_bytes = base64.b64decode(base64_str)
        except Exception as e:
            raise ValueError("Invalid base64 encoding") from e

        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            raise ValueError("Failed to decode image frame with OpenCV")

        decode_ms = (time.perf_counter() - decode_started) * 1000.0
        result = self._process_frame(frame, user_id, ride_id, decode_ms)
        result["timings_ms"]["decode"] = round(decode_ms, 2)
        return result

    def _process_frame(self, frame: np.ndarray, user_id: str, ride_id: int = None, decode_ms: float = 0.0) -> dict:
        """Run YOLO and MediaPipe concurrently, then interpret both for this session."""
        from app.ai.yolo_service import yolo_service, YOLO_MIN_INTERVAL_MS
        from app.ai.mediapipe_service import mediapipe_service
        from app.ai.session_manager import session_manager, PERF_LOG_EVERY_N_FRAMES

        total_started = time.perf_counter()
        session = session_manager.get_session(user_id, ride_id)

        # YOLO is rate limited per session; MediaPipe still runs on every frame and
        # the surviving tracks simply age by time.
        yolo_due = (
            session.last_yolo_monotonic == 0.0
            or (time.monotonic() - session.last_yolo_monotonic) * 1000.0 >= YOLO_MIN_INTERVAL_MS
        )
        yolo_ran = yolo_service.is_loaded and yolo_due
        yolo_error = None if yolo_service.is_loaded else "YOLO detection service is not ready"

        small = mediapipe_service.downscale(frame)
        mediapipe_future = _safe_submit(_INFERENCE_POOL, mediapipe_service.detect_landmarks, small)
        yolo_future = _safe_submit(_INFERENCE_POOL, yolo_service.run_inference, frame) if yolo_ran else None

        detected, _mediapipe_wall = self._collect(mediapipe_future, "mediapipe")
        candidates, yolo_ms = self._collect(yolo_future, "yolo")
        if yolo_future is not None and candidates is None:
            yolo_ran = False

        logic_started = time.perf_counter()
        frame_width, frame_height = frame.shape[1], frame.shape[0]
        if detected is None:
            detected = {"face": None, "hands": None, "face_ms": 0.0, "hands_ms": 0.0}

        mediapipe_result = self._interpret_face(
            mediapipe_service, detected["face"], detected["hands"], user_id, ride_id, frame_width, frame_height
        )

        yolo_result = None
        if yolo_ran and candidates is not None:
            try:
                yolo_result = yolo_service.process_frame(
                    frame,
                    user_id=user_id,
                    ride_id=ride_id,
                    hand_boxes=mediapipe_result.get("hand_boxes"),
                    mouth_box=mediapipe_result.get("mouth_box"),
                    candidates=candidates,
                )
            except Exception as e:
                logger.exception("[YOLO] Frame tracking failed: %s", e)
                yolo_error = str(e)
                yolo_ran = False
        if not yolo_ran:
            # Reuse the tracks still alive in this session; they expire on their own.
            yolo_result = yolo_service.reuse_tracks(
                user_id,
                ride_id,
                hand_boxes=mediapipe_result.get("hand_boxes"),
                mouth_box=mediapipe_result.get("mouth_box"),
                frame_width=frame_width,
            )

        score, session_summary, score_available = self._commit(
            session, yolo_result, mediapipe_result, yolo_ran
        )
        logic_ms = (time.perf_counter() - logic_started) * 1000.0

        yolo_block = self._build_yolo_block(yolo_result, yolo_error, score, yolo_skipped=not yolo_ran)
        mediapipe_block = self._build_mediapipe_block(mediapipe_result)

        active_alerts: list[str] = []
        for source in (yolo_result, mediapipe_result):
            if source is None:
                continue
            for alert in source.get("active_alerts", []):
                if alert not in active_alerts:
                    active_alerts.append(alert)

        # Honesty gate for the UI: never present SAFE, CLEAR or counts unless the
        # whole pipeline produced a usable signal on this frame.
        fail_reasons = []
        if yolo_result is None:
            fail_reasons.append("backend_down")
        elif yolo_ran and yolo_result.get("detection_count", 0) == 0:
            fail_reasons.append("no_result")
        if not mediapipe_result.get("face_detected"):
            fail_reasons.append("no_face")

        ai_status = "ok"
        for reason in AI_STATUS_PRIORITY:
            if reason in fail_reasons:
                ai_status = reason
                break

        total_ms = (time.perf_counter() - total_started) * 1000.0
        timings = {
            "decode": round(decode_ms, 2),
            "yolo": round(yolo_ms, 2),
            "face": round(detected["face_ms"], 2),
            "hands": round(detected["hands_ms"], 2),
            "logic": round(logic_ms, 2),
            "total": round(total_ms + decode_ms, 2),
        }
        if session.record_perf(timings):
            averages = session.average_perf()
            logger.info(
                "[Pipeline] avg over %d frames | total %.1fms | yolo %.1fms | face %.1fms | hands %.1fms | logic %.1fms",
                PERF_LOG_EVERY_N_FRAMES,
                averages.get("total", 0.0),
                averages.get("yolo", 0.0),
                averages.get("face", 0.0),
                averages.get("hands", 0.0),
                averages.get("logic", 0.0),
            )

        return {
            "success": yolo_result is not None,
            "status": yolo_result.get("status", "error") if yolo_result is not None else "error",
            "ai_status": ai_status,
            "fail_reasons": fail_reasons,
            # The exact image that was analysed. Every YOLO bbox is a pixel
            # rectangle of this frame and every MediaPipe landmark is normalized
            # against it, so a client can map both without guessing.
            "frame_width": frame_width,
            "frame_height": frame_height,
            "score": score,
            "score_available": score_available,
            "grade": session_summary["grade"],
            "active_alerts": active_alerts,
            "timings_ms": timings,
            "yolo": yolo_block,
            "mediapipe": mediapipe_block,
            "session": session_summary,
        }

    @staticmethod
    def _collect(future, label: str):
        """Wait for one inference. Returns (result, elapsed_ms); errors never propagate."""
        if future is None:
            return None, 0.0
        result, elapsed_ms, error = future.result()
        if error is not None:
            logger.error("[%s] Inference failed: %s", label, error)
        return result, elapsed_ms

    @staticmethod
    def _interpret_face(mediapipe_service, face_points, hand_points, user_id, ride_id, width, height):
        """Run the landmark interpretation, or report honestly why it could not run."""
        try:
            return mediapipe_service.analyze_landmarks(
                face_points,
                hand_points,
                user_id,
                ride_id,
                frame_width=width,
                frame_height=height,
                now=time.monotonic(),
            )
        except Exception as e:
            logger.exception("[MediaPipe] Landmark interpretation failed: %s", e)
            return mediapipe_service.empty_result([], [])

    def _commit(self, session, yolo_result, mediapipe_result, yolo_ran):
        """
        Merge confirmed events and recompute the score.

        MediaPipe events and the score depend only on the frame having been
        processed and a face being visible, never on how many objects YOLO found.
        Object events still require YOLO tracks.
        """
        from app.ai.session_manager import ALL_EVENT_TYPES
        from app.ai.mediapipe_service import mediapipe_service

        active_events = dict((yolo_result or {}).get("active_events", {}))
        for event_type in mediapipe_result.get("events", []):
            active_events.setdefault(event_type, None)

        # A suspected call upgrades to a real phone_use when a confirmed phone
        # track is alive, because the ear-zone inference is then backed by a
        # detection. Otherwise it stays an explicitly inferred event.
        if mediapipe_result.get("phone_call_condition") and "phone_use" in active_events:
            mediapipe_result["phone_call_suspected"] = False
            mediapipe_result["phone_call_suspected_duration"] = 0.0
        elif mediapipe_result.get("phone_call_condition") and mediapipe_result.get("phone_call_suspected"):
            active_events["phone_call_suspected"] = mediapipe_service.PHONE_CALL_MAX_CONFIDENCE
            mediapipe_result["active_alerts"] = list(mediapipe_result["active_alerts"]) + [
                "phone_call_suspected"
            ]
        else:
            active_events.pop("phone_call_suspected", None)

        score_available = yolo_ran and mediapipe_result.get("face_detected") is True
        now = time.time()
        if score_available:
            session.update_events(
                active_events,
                now,
                owned_types=ALL_EVENT_TYPES,
                measurements=mediapipe_result.get("measurements"),
            )
            score = session.apply_score(now)
        else:
            score = session.score
        return score, session.get_session_summary(), score_available

    def _build_yolo_block(self, yolo_result: dict | None, yolo_error: str | None, score: int, yolo_skipped: bool) -> dict:
        """Build standardized YOLO response block."""
        if yolo_result is not None:
            return {
                "loaded": True,
                "error": None,
                "yolo_skipped": yolo_skipped,
                "detections": yolo_result.get("detections", []),
                "detection_count": yolo_result.get("detection_count", 0),
                "person_detected": yolo_result.get("person_detected", False),
                "phone_detected": yolo_result.get("phone_detected", False),
                "distractor_detected": yolo_result.get("is_distracted", False),
                "cabin_objects": yolo_result.get("cabin_objects", {"phone": 0, "drink": 0, "food": 0}),
                "cabin_object_count": yolo_result.get("cabin_object_count", 0),
                "top_class": yolo_result.get("top_class", "none"),
                "class_name": yolo_result.get("class_name", "none"),
                "confidence": yolo_result.get("confidence", 0.0),
                "score": score,
                "status": yolo_result.get("status", "error"),
                "alerts": yolo_result.get("alerts", []),
            }
        return {
            "loaded": False,
            "error": yolo_error,
            "yolo_skipped": yolo_skipped,
            "detections": [],
            "detection_count": 0,
            "person_detected": False,
            "phone_detected": False,
            "distractor_detected": False,
            "cabin_objects": {"phone": 0, "drink": 0, "food": 0},
            "cabin_object_count": 0,
            "top_class": "none",
            "class_name": "none",
            "confidence": 0.0,
            "score": score,
            "status": "error",
            "alerts": [],
        }

    def _build_mediapipe_block(self, mediapipe_result: dict | None) -> dict:
        """Build standardized MediaPipe response block."""
        from app.ai.mediapipe_service import mediapipe_service
        if mediapipe_result is None:
            mediapipe_result = mediapipe_service.unavailable("mediapipe_failed")
        return {
            "loaded": mediapipe_service.face_available or mediapipe_service.hands_available,
            "error": None,
            "available": mediapipe_result.get("available", False),
            "reason": mediapipe_result.get("reason"),
            "face_detected": mediapipe_result.get("face_detected", False),
            "ear": mediapipe_result.get("ear"),
            "mar": mediapipe_result.get("mar"),
            "yaw": mediapipe_result.get("yaw"),
            "pitch": mediapipe_result.get("pitch"),
            "eye_state": mediapipe_result.get("eye_state"),
            "eye_measurement": mediapipe_result.get("eye_measurement"),
            "eye_landmarks": mediapipe_result.get("eye_landmarks", {"left": [], "right": []}),
            "eyes_closed_event": mediapipe_result.get("eyes_closed_event", False),
            "eyes_closed_duration": mediapipe_result.get("eyes_closed_duration", 0.0),
            "min_ear": mediapipe_result.get("min_ear"),
            "drowsiness_event": mediapipe_result.get("drowsiness_event", False),
            "yawn_detected": mediapipe_result.get("yawn_detected", False),
            "mouth_measurement": mediapipe_result.get("mouth_measurement"),
            "head_pose": mediapipe_result.get("head_pose"),
            "phone_call_condition": mediapipe_result.get("phone_call_condition", False),
            "phone_call_suspected": mediapipe_result.get("phone_call_suspected", False),
            "phone_call_suspected_duration": mediapipe_result.get("phone_call_suspected_duration", 0.0),
            "hands_detected": mediapipe_result.get("hands_detected", False),
            "hand_count": mediapipe_result.get("hand_count", 0),
            "hand_landmarks_available": mediapipe_result.get("hand_landmarks_available", False),
            "hand_landmarks": mediapipe_result.get("hand_landmarks", []),
            "events": mediapipe_result.get("events", []),
            "active_alerts": mediapipe_result.get("active_alerts", []),
        }


opencv_processor = OpenCVFrameProcessor()

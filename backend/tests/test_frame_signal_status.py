"""
Frame signal-status tests: what the pipeline says when it ran, and when it did not.

`ai_status` and `fail_reasons` are the honesty gate in front of everything the
UI shows. They used to conflate two opposite situations — a frame whose models
ran and confirmed nothing, and a frame whose detector was down — so a clean ride
was announced as "no AI signal" and a broken detector was announced as a clean
cabin. These tests drive the real `_process_frame` with stand-in services, so
they pin what the gate reports rather than re-deriving it.

No models are loaded and no frame is decoded: the inference services are replaced
for the duration of each test, and only the pipeline's own logic runs.

Run from the `backend` directory:  python -m pytest tests/test_frame_signal_status.py -v
"""
import time

import numpy as np
import pytest

import app.ai.mediapipe_service as mediapipe_module
import app.ai.yolo_service as yolo_module
from app.ai.session_manager import session_manager
from app.opencv.processor import OpenCVFrameProcessor

FRAME = np.zeros((480, 640, 3), dtype=np.uint8)
# A user id the session manager is asked to resolve against the ride table, so it
# has to look like the integer ids that table stores.
USER_ID = '4242'


# ── Stand-in inference services ───────────────────────────────────────────────
#
# Only the members `_process_frame` touches are provided. Each returns the same
# shape the real service returns, so the pipeline's own interpretation — not the
# stub — decides what the frame reports.

def yolo_payload(detections=0, status='safe'):
    return {
        'success': True,
        'status': status,
        'is_distracted': status == 'distracted',
        'detections': [
            {
                'track_id': f't{index}',
                'class_name': 'Person',
                'category': 'person',
                'confidence': 0.91,
                'occluded': False,
                'bbox': {'x1': 1, 'y1': 1, 'x2': 40, 'y2': 40},
            }
            for index in range(detections)
        ],
        'detection_count': detections,
        'person_detected': detections > 0,
        'phone_detected': False,
        'cabin_objects': {'phone': 0, 'drink': 0, 'food': 0},
        'cabin_object_count': 0,
        'top_class': 'person' if detections else 'none',
        'class_name': 'Person' if detections else 'none',
        'confidence': 0.91 if detections else 0.0,
        'alerts': [],
        'active_alerts': [],
        'active_events': {},
    }


def mediapipe_payload(face=True, available=True, reason=None):
    payload = {
        'available': available,
        'face_detected': face,
        'ear': 0.30 if face else None,
        'mar': 0.20 if face else None,
        'yaw': 0.0 if face else None,
        'pitch': 0.0 if face else None,
        'eye_state': 'eyes_open' if face else 'no_face',
        'eye_measurement': None,
        'eye_landmarks': {'left': [], 'right': []},
        'eyes_closed_event': False,
        'eyes_closed_duration': 0.0,
        'min_ear': None,
        'drowsiness_event': False,
        'yawn_detected': False,
        'mouth_measurement': None,
        'head_pose': 'forward' if face else 'no_face',
        'phone_call_condition': False,
        'phone_call_suspected': False,
        'phone_call_suspected_duration': 0.0,
        'hands_detected': False,
        'hand_count': 0,
        'hand_landmarks_available': False,
        'hand_landmarks': [],
        'hand_boxes': [],
        'mouth_box': None,
        'events': [],
        'active_alerts': [],
        'measurements': {},
    }
    if reason is not None:
        payload['reason'] = reason
    return payload


class FakeYolo:
    def __init__(self, loaded=True, detections=0, inference_error=None, tracking_error=None):
        self.is_loaded = loaded
        self._detections = detections
        self._inference_error = inference_error
        self._tracking_error = tracking_error

    def run_inference(self, frame):
        if self._inference_error is not None:
            raise self._inference_error
        return []

    def process_frame(self, frame, user_id=None, ride_id=None, hand_boxes=None,
                      mouth_box=None, candidates=None):
        if self._tracking_error is not None:
            raise self._tracking_error
        return yolo_payload(self._detections)

    def reuse_tracks(self, user_id, ride_id=None, hand_boxes=None, mouth_box=None, frame_width=640):
        return yolo_payload(0)


class FakeMediaPipe:
    PHONE_CALL_MAX_CONFIDENCE = 0.6

    def __init__(self, face=True, available=True, reason=None, interpretation_error=None):
        self.face_available = True
        self.hands_available = True
        self._face = face
        self._available = available
        self._reason = reason
        self._interpretation_error = interpretation_error

    def downscale(self, frame):
        return frame

    def detect_landmarks(self, frame):
        return {'face': None, 'hands': None, 'face_ms': 1.0, 'hands_ms': 1.0}

    def analyze_landmarks(self, face_landmarks, hand_landmarks=None, user_id='default',
                          ride_id=None, frame_width=640, frame_height=480, now=None):
        if self._interpretation_error is not None:
            raise self._interpretation_error
        return mediapipe_payload(self._face, self._available, self._reason)

    def empty_result(self, hand_landmarks_data=None, hand_boxes=None):
        return mediapipe_payload(face=False, available=self.face_available or self.hands_available)

    def unavailable(self, reason):
        return mediapipe_payload(face=False, available=False, reason=reason)


@pytest.fixture(autouse=True)
def pipeline(monkeypatch):
    """
    Install a stand-in for each inference service and give every test a session
    of its own, so no test can see another's score or rate-limit state.
    """
    def install(yolo=None, mediapipe=None):
        yolo = yolo if yolo is not None else FakeYolo()
        mediapipe = mediapipe if mediapipe is not None else FakeMediaPipe()
        monkeypatch.setattr(yolo_module, 'yolo_service', yolo)
        monkeypatch.setattr(mediapipe_module, 'mediapipe_service', mediapipe)
        return OpenCVFrameProcessor()

    session_manager.remove_session(USER_ID)
    try:
        yield install
    finally:
        session_manager.remove_session(USER_ID)


def run_frame(processor, yolo_due=True):
    """
    Run one frame through the real pipeline.

    YOLO's per-session rate limiter is driven by the session's own last-run clock,
    so priming it is how a skipped frame is produced without sleeping.
    """
    if not yolo_due:
        session = session_manager.get_session(USER_ID)
        session.last_yolo_monotonic = time.monotonic()
    return processor._process_frame(FRAME, USER_ID)


# ── A frame that ran and found nothing ─────────────────────────────────────────

def test_a_successful_frame_with_no_detections_is_a_live_signal(pipeline):
    """
    Inference that ran and confirmed nothing is a result, not a missing signal.

    An empty cabin is the state a good ride is in. Reporting it as a failure told
    the UI the pipeline was down on every frame of a clean ride.
    """
    result = run_frame(pipeline(FakeYolo(loaded=True, detections=0)))

    assert result['ai_status'] == 'ok'
    assert result['fail_reasons'] == []
    assert result['score_available'] is True
    assert result['yolo']['detection_count'] == 0
    assert result['yolo']['cabin_objects'] == {'phone': 0, 'drink': 0, 'food': 0}
    assert result['yolo']['yolo_skipped'] is False


def test_a_frame_with_a_confirmed_person_track_is_still_a_live_signal(pipeline):
    """The counter-case: detections present, reported the same honest way."""
    result = run_frame(pipeline(FakeYolo(loaded=True, detections=1)))

    assert result['ai_status'] == 'ok'
    assert result['fail_reasons'] == []
    assert result['yolo']['detection_count'] == 1


def test_the_rate_limiter_skipping_a_frame_is_not_a_failure(pipeline):
    """
    A skipped frame still analysed MediaPipe and reports the tracks it holds.

    It is not a failure and must not be reported as one; its score is carried by
    the client, which reads `yolo_skipped` rather than a dead pipeline.
    """
    result = run_frame(pipeline(FakeYolo(loaded=True)), yolo_due=False)

    assert result['ai_status'] == 'ok'
    assert result['fail_reasons'] == []
    assert result['yolo']['yolo_skipped'] is True
    assert result['yolo']['loaded'] is True
    assert result['yolo']['error'] is None


# ── Frames whose results are genuinely unavailable ─────────────────────────────

def test_an_unloaded_detector_is_reported_as_the_signal_being_down(pipeline):
    """
    With no model loaded nothing on this frame was measured, so it is not ok.

    Falling back to the surviving tracks must not dress that up as a clean read.
    """
    result = run_frame(pipeline(FakeYolo(loaded=False)))

    assert result['ai_status'] == 'backend_down'
    assert 'backend_down' in result['fail_reasons']
    assert result['yolo']['loaded'] is False
    assert result['yolo']['error']
    assert result['score_available'] is False


def test_a_failed_inference_is_reported_as_the_signal_being_down(pipeline):
    """
    Inference that raised is a dead detector, not an empty cabin.

    This is the failure that used to be invisible: it fell into the rate-limit
    branch, and the frame was returned as a healthy result with zero detections.
    """
    result = run_frame(pipeline(FakeYolo(loaded=True, inference_error=RuntimeError('cuda exploded'))))

    assert result['ai_status'] == 'backend_down'
    assert 'backend_down' in result['fail_reasons']
    assert result['yolo']['error']
    assert result['score_available'] is False


def test_a_failed_tracking_step_is_reported_as_the_signal_being_down(pipeline):
    """A tracking failure after inference is the same kind of loss of signal."""
    result = run_frame(pipeline(FakeYolo(loaded=True, tracking_error=RuntimeError('track failure'))))

    assert result['ai_status'] == 'backend_down'
    assert 'backend_down' in result['fail_reasons']
    assert result['score_available'] is False


def test_no_face_is_reported_as_no_face(pipeline):
    """A face that was sought and not found is its own honest status."""
    result = run_frame(pipeline(mediapipe=FakeMediaPipe(face=False)))

    assert result['ai_status'] == 'no_face'
    assert 'no_face' in result['fail_reasons']
    assert 'backend_down' not in result['fail_reasons']


def test_an_unavailable_landmarker_is_not_reported_as_a_missing_face(pipeline):
    """
    A landmarker that could not run says nothing about the driver's face.

    Reporting it as `no_face` would state a measurement that was never taken.
    """
    result = run_frame(pipeline(mediapipe=FakeMediaPipe(face=False, available=False, reason='mediapipe_model_unavailable')))

    assert result['ai_status'] == 'backend_down'
    assert 'backend_down' in result['fail_reasons']
    assert 'no_face' not in result['fail_reasons']


def test_a_failed_landmark_interpretation_is_reported_as_the_signal_being_down(pipeline):
    """The landmarker was reached and raised, so the frame measured no face."""
    processor = pipeline(mediapipe=FakeMediaPipe(interpretation_error=RuntimeError('landmark failure')))

    result = processor._process_frame(FRAME, USER_ID)

    assert result['ai_status'] == 'backend_down'
    assert result['mediapipe']['available'] is False
    assert result['mediapipe']['reason'] == 'landmark_interpretation_failed'


def test_the_pipeline_being_down_outranks_a_missing_face(pipeline):
    """Both reasons are reported, and the worse one names the status."""
    processor = pipeline(FakeYolo(loaded=False), FakeMediaPipe(face=False))

    result = processor._process_frame(FRAME, USER_ID)

    assert set(result['fail_reasons']) == {'backend_down', 'no_face'}
    assert result['ai_status'] == 'backend_down'


def test_no_result_is_never_reported_as_a_failure(pipeline):
    """
    No frame in any of these states is reported as `no_result`.

    That status conflated "the models ran and found nothing" with "the models
    could not run", so it is what made a clean ride look like a dead pipeline.
    """
    cases = [
        (FakeYolo(loaded=True, detections=0), FakeMediaPipe(face=True)),
        (FakeYolo(loaded=False), FakeMediaPipe(face=True)),
        (FakeYolo(loaded=True, inference_error=RuntimeError('boom')), FakeMediaPipe(face=True)),
        (FakeYolo(loaded=True), FakeMediaPipe(face=False)),
        (FakeYolo(loaded=True), FakeMediaPipe(face=False, available=False)),
    ]

    for yolo, mediapipe in cases:
        result = run_frame(pipeline(yolo, mediapipe))
        assert 'no_result' not in result['fail_reasons']
        assert result['ai_status'] != 'no_result'
        session_manager.remove_session(USER_ID)
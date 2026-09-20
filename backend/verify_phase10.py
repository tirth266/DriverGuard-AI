"""Focused verification for Phase 10 MediaPipe measurements and temporal events."""

import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.ai.mediapipe_service import MediaPipeDriverService
from app.ai.yolo_service import yolo_service


def landmarks(eye_open=True, mouth_open=False, pose="forward"):
    points = [SimpleNamespace(x=0.5, y=0.5) for _ in range(478)]

    eye_vertical = 0.04 if eye_open else 0.005
    for indices, x in ((MediaPipeDriverService.LEFT_EYE, 0.35), (MediaPipeDriverService.RIGHT_EYE, 0.65)):
        p1, p2, p3, p4, p5, p6 = indices
        points[p1] = SimpleNamespace(x=x - 0.05, y=0.5)
        points[p4] = SimpleNamespace(x=x + 0.05, y=0.5)
        points[p2] = SimpleNamespace(x=x - 0.02, y=0.5 - eye_vertical)
        points[p3] = SimpleNamespace(x=x + 0.02, y=0.5 - eye_vertical)
        points[p5] = SimpleNamespace(x=x + 0.02, y=0.5 + eye_vertical)
        points[p6] = SimpleNamespace(x=x - 0.02, y=0.5 + eye_vertical)

    points[61] = SimpleNamespace(x=0.35, y=0.5)
    points[291] = SimpleNamespace(x=0.65, y=0.5)
    mouth_vertical = 0.25 if mouth_open else 0.02
    points[13] = SimpleNamespace(x=0.5, y=0.5 - mouth_vertical / 2)
    points[14] = SimpleNamespace(x=0.5, y=0.5 + mouth_vertical / 2)
    points[81] = SimpleNamespace(x=0.45, y=0.5 - mouth_vertical * 0.4)
    points[178] = SimpleNamespace(x=0.45, y=0.5 + mouth_vertical * 0.4)

    points[234] = SimpleNamespace(x=0.3, y=0.5)
    points[454] = SimpleNamespace(x=0.7, y=0.5)
    points[152] = SimpleNamespace(x=0.5, y=0.8)
    points[1] = SimpleNamespace(
        x={"forward": 0.5, "looking_left": 0.4, "looking_right": 0.6}.get(pose, 0.5),
        y=0.65 if pose == "looking_down" else 0.45,
    )
    return points


def run():
    service = MediaPipeDriverService()
    hands = [[SimpleNamespace(x=0.2, y=0.2) for _ in range(21)]]

    open_result = service.analyze_landmarks(landmarks(), hands)
    assert open_result["face_detected"] and open_result["eye_state"] == "eyes_open"
    assert open_result["hands_detected"] and open_result["hand_count"] == 1

    blink = service.analyze_landmarks(landmarks(eye_open=False))
    assert blink["eye_state"] == "eyes_closed" and not blink["drowsiness_event"]

    prolonged = blink
    for _ in range(service.EYE_CLOSED_FRAMES - 1):
        prolonged = service.analyze_landmarks(landmarks(eye_open=False))
    assert prolonged["drowsiness_event"] and "prolonged_eye_closure" in prolonged["events"]

    assert service.analyze_landmarks(landmarks(mouth_open=False))["yawn_detected"] is False
    yawn = None
    for _ in range(service.YAWN_FRAMES):
        yawn = service.analyze_landmarks(landmarks(mouth_open=True))
    assert yawn["yawn_detected"] and "yawning" in yawn["events"]

    for pose in ("forward", "looking_left", "looking_right", "looking_down"):
        service.reset_temporal_state()
        pose_result = service.analyze_landmarks(landmarks(pose=pose))
        assert pose_result["head_pose"] == pose

    no_face = service.analyze_landmarks(None)
    assert no_face["eye_state"] == "unsupported/no_face"
    invalid = service.process_frame(np.array([], dtype=np.uint8))
    assert invalid["available"] is False and invalid["reason"] == "invalid_frame"
    recovered = service.analyze_landmarks(landmarks())
    assert recovered["face_detected"] and recovered["eye_state"] == "eyes_open"

    yolo_service.reset_session()
    yolo_service.update_mediapipe_events({"face_detected": True, "events": ["yawning"]}, 98)
    summary = yolo_service.get_session_summary(98)
    assert summary["events"][0]["type"] == "yawning"
    assert summary["events"][0]["max_confidence"] is None
    yolo_service.update_mediapipe_events({"face_detected": False, "events": []}, 98)
    assert yolo_service.get_session_summary(98)["total_distraction_events"] == 1
    print("Phase 10 verification passed: landmarks, temporal events, poses, hands, invalid-frame recovery, and shared session events.")


if __name__ == "__main__":
    run()

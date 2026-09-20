"""Focused in-memory verification for the Phase 8 session summary."""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.ai.yolo_service import yolo_service


class MockTensor:
    def __init__(self, values):
        self.values = values

    def __getitem__(self, index):
        return self.values[index]

    def tolist(self):
        return list(self.values)


class MockBox:
    def __init__(self, class_id, confidence):
        self.cls = MockTensor([class_id])
        self.conf = MockTensor([confidence])
        self.xyxy = [MockTensor([10, 10, 100, 100])]


class MockResult:
    def __init__(self, boxes):
        self.boxes = boxes
        self.names = {39: "bottle", 41: "cup", 67: "cell phone"}


class MockModel:
    def __init__(self):
        self.boxes = []

    def predict(self, **_kwargs):
        return [MockResult(self.boxes)]


def run():
    original_model = yolo_service.model
    original_loaded = yolo_service.is_loaded
    yolo_service.model = MockModel()
    yolo_service.is_loaded = True
    frame = np.zeros((120, 120, 3), dtype=np.uint8)

    try:
        yolo_service.reset_session()
        safe = yolo_service.process_frame(frame)
        assert safe["score"] == 98
        assert safe["session_summary"]["lowest_session_score"] == 98

        yolo_service.model.boxes = [MockBox(67, 0.60)]
        yolo_service.process_frame(frame)
        yolo_service.model.boxes = [MockBox(67, 0.90)]
        yolo_service.process_frame(frame)
        phone = yolo_service.process_frame(frame)
        assert phone["session_summary"]["total_distraction_events"] == 1
        assert phone["session_summary"]["phone_events"] == 1
        assert phone["session_summary"]["events"][0]["max_confidence"] == 0.9
        assert phone["session_summary"]["events"][0]["min_score"] == phone["score"]

        yolo_service.model.boxes = []
        ended_phone = yolo_service.process_frame(frame)
        assert ended_phone["session_summary"]["total_distraction_events"] == 1

        yolo_service.model.boxes = [MockBox(67, 0.80)]
        yolo_service.process_frame(frame)
        yolo_service.process_frame(frame)
        yolo_service.process_frame(frame)
        assert yolo_service.get_session_summary()["phone_events"] == 2

        yolo_service.model.boxes = [MockBox(39, 0.70)]
        bottle = yolo_service.process_frame(frame)
        assert bottle["session_summary"]["bottle_events"] == 1
        yolo_service.model.boxes = [MockBox(41, 0.75)]
        cup = yolo_service.process_frame(frame)
        assert cup["session_summary"]["cup_events"] == 1
        yolo_service.model.boxes = [MockBox(39, 0.80), MockBox(41, 0.85)]
        both = yolo_service.process_frame(frame)
        assert both["session_summary"]["total_distraction_events"] == 5
        assert both["session_summary"]["lowest_session_score"] == both["score"]

        yolo_service.model.boxes = []
        finished = yolo_service.process_frame(frame)["session_summary"]
        assert finished["total_distraction_events"] == 5
        assert finished["total_distracted_duration"] >= 0
        print("Phase 8 verification passed: safe, merged, split, typed, multi-event, and score statistics.")
    finally:
        yolo_service.model = original_model
        yolo_service.is_loaded = original_loaded


if __name__ == "__main__":
    run()
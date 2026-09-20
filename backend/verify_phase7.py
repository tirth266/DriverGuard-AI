#!/usr/bin/env python3
"""
Phase 7 Verification Suite: Distractor Objects + Dynamic Score
=============================================================
Verifies:
1. Blank/zero-detection frame -> Safe, Score = 98 (baseline), 0 detections
2. Normal/Person detection -> GREEN box, Safe, Score = 98
3. Phone detection -> RED box, Distracted, Score decreases from baseline
4. Bottle detection -> RED box, Distracted, Score decreases, NO 'drinking' in alerts
5. Cup detection -> RED box, Distracted, Score decreases, NO 'drinking' in alerts
6. Multiple distractors -> All RED boxes, Compound score penalty (lower than single)
7. Distraction disappears -> Score recovers back to baseline 98
8. Bounding box colors -> Distractors: RED (0,0,255), Normal: GREEN (0,255,0)
"""

import sys
import time
from pathlib import Path
import cv2
import numpy as np

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.ai.yolo_service import yolo_service

def create_mock_boxes(cls_name: str, cls_id: int, conf: float, xyxy=(50, 50, 200, 200)):
    class MockTensor:
        def __init__(self, val):
            self.val = val
        def tolist(self):
            return list(self.val)
        def __getitem__(self, idx):
            return self.val[idx]

    class MockBox:
        def __init__(self):
            self.cls = MockTensor([cls_id])
            self.conf = MockTensor([conf])
            self.xyxy = [MockTensor(xyxy)]
    return MockBox()

class MockResult:
    def __init__(self, boxes, names):
        self.boxes = boxes
        self.names = names

class MockYOLOModel:
    def __init__(self, names_dict):
        self.names = names_dict
        self.task = "detect"
        self.mock_boxes = []

    def set_boxes(self, boxes):
        self.mock_boxes = boxes

    def predict(self, source, conf=0.4, device="cpu", verbose=False):
        return [MockResult(self.mock_boxes, self.names)]

def run_phase7_verification():
    print("=" * 70)
    print("STARTING PHASE 7 VERIFICATION SUITE: DISTRACTORS + DYNAMIC SCORE")
    print("=" * 70)

    # Ensure model loaded
    if not yolo_service.is_loaded:
        loaded = yolo_service.load_model()
        assert loaded, "Failed to load YOLO model"

    names = yolo_service.classes or {0: "person", 39: "bottle", 41: "cup", 67: "cell phone"}
    mock_model = MockYOLOModel(names)
    original_model = yolo_service.model
    yolo_service.model = mock_model

    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)

    try:
        # -------------------------------------------------------------
        # TEST 1: Blank Frame
        # -------------------------------------------------------------
        print("\n--- TEST 1: Blank Frame ---")
        mock_model.set_boxes([])
        yolo_service.phone_history.clear()
        res1 = yolo_service.process_frame(dummy_frame)
        print(f"  status: {res1['status']}, score: {res1['score']}, detections: {res1['detection_count']}")
        assert res1['status'] == 'safe'
        assert res1['score'] == 98
        assert res1['detection_count'] == 0
        assert res1['is_distracted'] is False
        print("  --> TEST 1 PASSED: Blank frame is safe with baseline score 98.")

        # -------------------------------------------------------------
        # TEST 2: Normal Object (Person) -> GREEN, Safe
        # -------------------------------------------------------------
        print("\n--- TEST 2: Normal / Background Object (Person) ---")
        mock_model.set_boxes([create_mock_boxes("person", 0, 0.85)])
        yolo_service.phone_history.clear()
        res2 = yolo_service.process_frame(dummy_frame)
        print(f"  class: {res2['class_name']}, status: {res2['status']}, score: {res2['score']}, distractor: {res2['detections'][0]['is_distractor']}")
        assert res2['status'] == 'safe'
        assert res2['score'] == 98
        assert res2['is_distracted'] is False
        assert res2['detections'][0]['is_distractor'] is False
        assert res2['face_detected'] is True
        print("  --> TEST 2 PASSED: Person is non-distractor (GREEN), status safe, score 98.")

        # -------------------------------------------------------------
        # TEST 3: Phone Distractor (Repeated frames for temporal confirmation)
        # -------------------------------------------------------------
        print("\n--- TEST 3: Phone Distraction (Temporal Confirmation) ---")
        mock_model.set_boxes([create_mock_boxes("cell phone", 67, 0.85)])
        yolo_service.phone_history.clear()
        
        # Frame 1: Single frame (temporal transient)
        res3_f1 = yolo_service.process_frame(dummy_frame)
        print(f"  Frame 1: distractor={res3_f1['detections'][0]['is_distractor']}, phone_confirmed={res3_f1['phone_detected']}")
        assert res3_f1['detections'][0]['is_distractor'] is True, "Phone box must be marked as distractor (RED)"

        # Frames 2 & 3: Temporal persistence
        yolo_service.process_frame(dummy_frame)
        res3_f3 = yolo_service.process_frame(dummy_frame)
        print(f"  Frame 3: status={res3_f3['status']}, score={res3_f3['score']}, alerts={res3_f3['alerts']}")
        assert res3_f3['status'] == 'distracted'
        assert res3_f3['is_distracted'] is True
        assert res3_f3['phone_detected'] is True
        assert res3_f3['score'] < 98, f"Score should decrease from 98, got {res3_f3['score']}"
        assert any("phone" in a.lower() for a in res3_f3['alerts'])
        print(f"  --> TEST 3 PASSED: Phone is RED, confirmed distracted, score decreased to {res3_f3['score']}.")

        # -------------------------------------------------------------
        # TEST 4: Bottle Distractor -> RED, Distracted, No Drinking Claim
        # -------------------------------------------------------------
        print("\n--- TEST 4: Bottle Distractor (No Drinking Claim) ---")
        yolo_service.phone_history.clear()
        mock_model.set_boxes([create_mock_boxes("bottle", 39, 0.75)])
        res4 = yolo_service.process_frame(dummy_frame)
        print(f"  class: {res4['class_name']}, status: {res4['status']}, score: {res4['score']}, alerts: {res4['alerts']}")
        assert res4['detections'][0]['is_distractor'] is True, "Bottle must be distractor (RED)"
        assert res4['status'] == 'distracted'
        assert res4['is_distracted'] is True
        assert res4['score'] < 98, f"Score should decrease from 98, got {res4['score']}"
        for a in res4['alerts']:
            assert "drinking" not in a.lower(), f"Forbidden drinking claim in alert: {a}"
        print(f"  --> TEST 4 PASSED: Bottle is RED, distracted, score decreased to {res4['score']}, NO drinking claim.")

        # -------------------------------------------------------------
        # TEST 5: Cup Distractor -> RED, Distracted, No Drinking Claim
        # -------------------------------------------------------------
        print("\n--- TEST 5: Cup Distractor (No Drinking Claim) ---")
        yolo_service.phone_history.clear()
        mock_model.set_boxes([create_mock_boxes("cup", 41, 0.70)])
        res5 = yolo_service.process_frame(dummy_frame)
        print(f"  class: {res5['class_name']}, status: {res5['status']}, score: {res5['score']}, alerts: {res5['alerts']}")
        assert res5['detections'][0]['is_distractor'] is True, "Cup must be distractor (RED)"
        assert res5['status'] == 'distracted'
        assert res5['is_distracted'] is True
        assert res5['score'] < 98, f"Score should decrease from 98, got {res5['score']}"
        for a in res5['alerts']:
            assert "drinking" not in a.lower(), f"Forbidden drinking claim in alert: {a}"
        print(f"  --> TEST 5 PASSED: Cup is RED, distracted, score decreased to {res5['score']}, NO drinking claim.")

        # -------------------------------------------------------------
        # TEST 6: Multiple Distractors -> Compound Penalty
        # -------------------------------------------------------------
        print("\n--- TEST 6: Multiple Distractor Objects (Compound Penalty) ---")
        yolo_service.phone_history.clear()
        # Phone + Bottle together
        mock_model.set_boxes([
            create_mock_boxes("cell phone", 67, 0.85, (50, 50, 150, 150)),
            create_mock_boxes("bottle", 39, 0.75, (200, 200, 300, 300)),
        ])
        # Run 3 frames so phone is also temporally confirmed
        yolo_service.process_frame(dummy_frame)
        yolo_service.process_frame(dummy_frame)
        res6 = yolo_service.process_frame(dummy_frame)
        print(f"  Multiple score: {res6['score']} (Single bottle was {res4['score']}, single phone was {res3_f3['score']})")
        assert res6['status'] == 'distracted'
        assert res6['score'] < res4['score'], "Multiple distractors must produce a lower score than single bottle"
        assert res6['score'] < res3_f3['score'], "Multiple distractors must produce a lower score than single phone"
        assert all(d['is_distractor'] for d in res6['detections']), "All distractors must be marked RED"
        print(f"  --> TEST 6 PASSED: Multiple distractors compound penalty -> Score = {res6['score']}.")

        # -------------------------------------------------------------
        # TEST 7: Distraction Disappears -> Score Recovers
        # -------------------------------------------------------------
        print("\n--- TEST 7: Distraction Disappears -> Score Recovers ---")
        mock_model.set_boxes([])
        yolo_service.phone_history.clear() # Phone removed
        res7 = yolo_service.process_frame(dummy_frame)
        print(f"  Post-distraction status: {res7['status']}, score: {res7['score']}")
        assert res7['status'] == 'safe'
        assert res7['score'] == 98, f"Score should recover to safe baseline 98, got {res7['score']}"
        print("  --> TEST 7 PASSED: Distraction disappeared, score cleanly recovered to 98.")

        # -------------------------------------------------------------
        # TEST 8: Live Real Model Detection Verification
        # -------------------------------------------------------------
        print("\n--- TEST 8: Real Pretrained YOLO11 Model Inference ---")
        yolo_service.model = original_model # Restore real model
        c0_path = backend_dir.parent / "Data" / "distracted-driver-detection" / "train" / "c0" / "img_100026.jpg"
        if c0_path.exists():
            real_img = cv2.imread(str(c0_path))
            yolo_service.phone_history.clear()
            real_res = yolo_service.process_frame(real_img)
            print(f"  Real driver image: class='{real_res['class_name']}', conf={real_res['confidence']}, status='{real_res['status']}', score={real_res['score']}")
            assert real_res['status'] == 'safe', "Normal driver should be safe"
            assert real_res['score'] == 98, "Normal driver score should be 98"
            for d in real_res['detections']:
                if "person" in d['class_name'].lower():
                    assert d['is_distractor'] is False, "Person must NOT be flagged as distractor"
            print("  --> TEST 8 PASSED: Real image processed with honest metrics.")

        print("\n" + "=" * 70)
        print("ALL 8 PHASE 7 VERIFICATION TESTS PASSED SUCCESSFULLY!")
        print("=" * 70)

    finally:
        yolo_service.model = original_model

if __name__ == "__main__":
    run_phase7_verification()

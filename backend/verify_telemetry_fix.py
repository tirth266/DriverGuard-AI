#!/usr/bin/env python3
"""
Automated Verification Suite for DriverGuard-AI Telemetry Fix
============================================================
Verifies:
1. Blank/zero-detection frame returns 'No Objects Detected', 'none', 0.0 confidence, status 'safe'.
2. Safe-driver frame preserves real YOLO detection class and confidence.
3. Driver-texting frame preserves real detection metrics.
4. Phone-call frame preserves real detection metrics.
5. Repeated inference requests maintain consistent output and state.
6. Invalid/malformed frames trigger appropriate HTTP 400 validation errors.
7. API recovers cleanly from errors to process valid frames with accurate telemetry.
"""

import base64
import sys
from pathlib import Path
import cv2
import numpy as np
from fastapi.testclient import TestClient

# Add backend to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app import create_app

def encode_image_to_base64(img_bgr: np.ndarray) -> str:
    _, buf = cv2.imencode(".jpg", img_bgr)
    return f"data:image/jpeg;base64,{base64.b64encode(buf).decode('utf-8')}"

def main():
    print("=" * 70)
    print("STARTING TELEMETRY VERIFICATION SUITE")
    print("=" * 70)

    app = create_app()
    with TestClient(app) as client:
        # Check service status
        status_res = client.get("/api/video/status")
        assert status_res.status_code == 200, f"Status check failed: {status_res.text}"
        status_json = status_res.json()
        print(f"[INIT] Model loaded: {status_json.get('yolo_loaded')}")
        print(f"[INIT] Model task: {status_json.get('yolo_task')}")
        print(f"[INIT] Model classes count: {status_json.get('yolo_classes_count')}")

        # -------------------------------------------------------------
        # TEST 1: Blank / Zero-Detection Frame
        # -------------------------------------------------------------
        print("\n--- TEST 1: Blank / Zero-Detection Frame ---")
        blank_img = np.zeros((480, 640, 3), dtype=np.uint8)
        b64_blank = encode_image_to_base64(blank_img)
        res1 = client.post("/api/video/process_frame", json={"frame": b64_blank})
        assert res1.status_code == 200, f"Test 1 HTTP status {res1.status_code}"
        d1 = res1.json()

        print(f"  success:         {d1.get('success')}")
        print(f"  class_name:      '{d1.get('class_name')}'")
        print(f"  top_class:       '{d1.get('top_class')}'")
        print(f"  confidence:      {d1.get('confidence')}")
        print(f"  detection_count: {d1.get('detection_count')}")
        print(f"  detections:      {d1.get('detections')}")
        print(f"  status:          '{d1.get('status')}'")

        assert d1.get("class_name") == "No Objects Detected", f"Expected 'No Objects Detected', got {d1.get('class_name')}"
        assert d1.get("top_class") == "none", f"Expected 'none', got {d1.get('top_class')}"
        assert d1.get("confidence") == 0.0, f"Expected 0.0, got {d1.get('confidence')}"
        assert d1.get("detection_count") == 0, f"Expected 0, got {d1.get('detection_count')}"
        assert d1.get("detections") == [], f"Expected [], got {d1.get('detections')}"
        assert d1.get("status") == "safe", f"Expected 'safe', got {d1.get('status')}"
        assert "Cabin Safe" not in str(d1), "Found 'Cabin Safe' in response!"
        assert d1.get("confidence") != 0.98, "Found fabricated 0.98 confidence!"
        print("  --> TEST 1 PASSED: Zero detections return honest telemetry.")

        # -------------------------------------------------------------
        # TEST 2: Safe-Driver Frame (c0)
        # -------------------------------------------------------------
        print("\n--- TEST 2: Safe-Driver Frame (c0: normal driving) ---")
        c0_path = backend_dir.parent / "Data" / "distracted-driver-detection" / "train" / "c0" / "img_100026.jpg"
        assert c0_path.exists(), f"Image not found at {c0_path}"
        c0_img = cv2.imread(str(c0_path))
        b64_c0 = encode_image_to_base64(c0_img)
        res2 = client.post("/api/video/process_frame", json={"frame": b64_c0})
        assert res2.status_code == 200
        d2 = res2.json()

        print(f"  success:         {d2.get('success')}")
        print(f"  class_name:      '{d2.get('class_name')}'")
        print(f"  top_class:       '{d2.get('top_class')}'")
        print(f"  confidence:      {d2.get('confidence')}")
        print(f"  detection_count: {d2.get('detection_count')}")
        print(f"  detections len:  {len(d2.get('detections', []))}")
        print(f"  status:          '{d2.get('status')}'")

        assert d2.get("detection_count") == len(d2.get("detections", []))
        assert d2.get("detection_count") > 0, "Expected at least 1 detection on driver image"
        assert d2.get("class_name") != "Cabin Safe", "Class name must not be 'Cabin Safe'"
        assert d2.get("confidence") > 0.0, "Confidence must be > 0.0 for real detections"
        assert d2.get("status") == "safe", "Driver with no distraction must have status 'safe'"
        print("  --> TEST 2 PASSED: Real detections and confidence preserved for safe driver.")

        # -------------------------------------------------------------
        # TEST 3: Driver-Texting Frame (c1)
        # -------------------------------------------------------------
        print("\n--- TEST 3: Driver-Texting Frame (c1: texting right) ---")
        c1_path = backend_dir.parent / "Data" / "distracted-driver-detection" / "train" / "c1" / "img_100021.jpg"
        assert c1_path.exists(), f"Image not found at {c1_path}"
        c1_img = cv2.imread(str(c1_path))
        b64_c1 = encode_image_to_base64(c1_img)
        res3 = client.post("/api/video/process_frame", json={"frame": b64_c1})
        assert res3.status_code == 200
        d3 = res3.json()

        print(f"  success:         {d3.get('success')}")
        print(f"  class_name:      '{d3.get('class_name')}'")
        print(f"  confidence:      {d3.get('confidence')}")
        print(f"  detection_count: {d3.get('detection_count')}")
        print(f"  detections len:  {len(d3.get('detections', []))}")
        assert d3.get("detection_count") == len(d3.get("detections", []))
        assert d3.get("class_name") != "Cabin Safe"
        print("  --> TEST 3 PASSED: Driver-texting frame processed accurately.")

        # -------------------------------------------------------------
        # TEST 4: Phone-Call Frame (c2)
        # -------------------------------------------------------------
        print("\n--- TEST 4: Phone-Call Frame (c2: phone right) ---")
        c2_path = backend_dir.parent / "Data" / "distracted-driver-detection" / "train" / "c2" / "img_100029.jpg"
        assert c2_path.exists(), f"Image not found at {c2_path}"
        c2_img = cv2.imread(str(c2_path))
        b64_c2 = encode_image_to_base64(c2_img)
        res4 = client.post("/api/video/process_frame", json={"frame": b64_c2})
        assert res4.status_code == 200
        d4 = res4.json()

        print(f"  success:         {d4.get('success')}")
        print(f"  class_name:      '{d4.get('class_name')}'")
        print(f"  confidence:      {d4.get('confidence')}")
        print(f"  detection_count: {d4.get('detection_count')}")
        print(f"  detections len:  {len(d4.get('detections', []))}")
        assert d4.get("detection_count") == len(d4.get("detections", []))
        assert d4.get("class_name") != "Cabin Safe"
        print("  --> TEST 4 PASSED: Phone-call frame processed accurately.")

        # -------------------------------------------------------------
        # TEST 5: Repeated Inference Requests
        # -------------------------------------------------------------
        print("\n--- TEST 5: Repeated Inference Requests (5 sequential frames) ---")
        for i in range(5):
            # Alternating between blank and driver image
            target_b64 = b64_blank if i % 2 == 0 else b64_c0
            r = client.post("/api/video/process_frame", json={"frame": target_b64})
            assert r.status_code == 200
            dat = r.json()
            if i % 2 == 0:
                assert dat.get("class_name") == "No Objects Detected"
                assert dat.get("confidence") == 0.0
            else:
                assert dat.get("class_name") != "No Objects Detected"
                assert dat.get("confidence") > 0.0
            print(f"  Request {i+1}/5 OK: class='{dat.get('class_name')}', conf={dat.get('confidence')}")
        print("  --> TEST 5 PASSED: Repeated inference state is stable and consistent.")

        # -------------------------------------------------------------
        # TEST 6: Invalid / Malformed Frame
        # -------------------------------------------------------------
        print("\n--- TEST 6: Invalid / Malformed Frame ---")
        # Empty payload
        r_empty = client.post("/api/video/process_frame", json={"frame": ""})
        print(f"  Empty frame status: {r_empty.status_code}, body: {r_empty.json()}")
        assert r_empty.status_code == 400
        assert r_empty.json().get("success") is False

        # Corrupted Base64
        r_corrupt = client.post("/api/video/process_frame", json={"frame": "data:image/jpeg;base64,corrupted_junk_here"})
        print(f"  Corrupted frame status: {r_corrupt.status_code}, body: {r_corrupt.json()}")
        assert r_corrupt.status_code == 400
        assert r_corrupt.json().get("success") is False
        print("  --> TEST 6 PASSED: Invalid frames correctly rejected with HTTP 400.")

        # -------------------------------------------------------------
        # TEST 7: Inference / API Error Recovery
        # -------------------------------------------------------------
        print("\n--- TEST 7: API Recovery After Errors ---")
        # After failed frames in Test 6, ensure valid frame processes cleanly immediately
        r_recover = client.post("/api/video/process_frame", json={"frame": b64_blank})
        assert r_recover.status_code == 200
        d_rec = r_recover.json()
        assert d_rec.get("success") is True
        assert d_rec.get("class_name") == "No Objects Detected"
        assert d_rec.get("confidence") == 0.0
        print(f"  Recovered frame status: {r_recover.status_code}, class: '{d_rec.get('class_name')}', conf: {d_rec.get('confidence')}")
        print("  --> TEST 7 PASSED: API immediately recovers and processes valid frames.")

    print("\n" + "=" * 70)
    print("ALL 7 AUTOMATED TELEMETRY VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    main()

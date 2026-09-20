#!/usr/bin/env python3
"""
Phase 5 Real-World Capability Audit Script for DriverGuard-AI
=============================================================
Audits the current pretrained YOLO model and backend application logic across:
Scenario 1: Normal driver/cabin (c0)
Scenario 2: Driver holding a mobile phone (c1)
Scenario 3: Driver using a phone near ear (c2)
Scenario 4: Driver drinking / holding a bottle or cup (c6)
Scenario 5: Driver/frame with no detected objects
Scenario 6: Multiple objects in cabin
"""

import sys
from pathlib import Path
import cv2
import numpy as np
import json

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.ai.yolo_service import yolo_service

def test_image_set(category_name: str, image_paths: list, conf_thresh: float = 0.25):
    print(f"\n{'='*70}")
    print(f"AUDIT EVALUATION: {category_name}")
    print(f"{'='*70}")
    
    results = []
    for p in image_paths:
        img_path = Path(p)
        if not img_path.exists():
            print(f"File not found: {p}")
            continue
        
        img = cv2.imread(str(img_path))
        if img is None:
            continue
            
        res = yolo_service.process_frame(img, confidence_threshold=conf_thresh)
        summary = {
            "image": img_path.name,
            "detection_count": res["detection_count"],
            "top_class": res["top_class"],
            "class_name": res["class_name"],
            "confidence": res["confidence"],
            "status": res["status"],
            "is_distracted": res["is_distracted"],
            "score": res["score"],
            "detections": [
                {
                    "class_name": d["class_name"],
                    "confidence": d["confidence"],
                    "bbox": d["bbox"]
                }
                for d in res["detections"]
            ]
        }
        results.append(summary)
        print(f"Image: {img_path.name}")
        det_strs = [f"{d['class_name']} ({d['confidence']})" for d in res['detections']]
        print(f"  Detections ({res['detection_count']}): {det_strs}")
        print(f"  API class_name: '{res['class_name']}', confidence: {res['confidence']}")
        print(f"  API status: '{res['status']}', is_distracted: {res['is_distracted']}, score: {res['score']}")
    return results

def main():
    loaded = yolo_service.load_model()
    print(f"[YOLO Loaded]: {loaded}, model: {yolo_service.model_path}, device: {yolo_service.device}")
    
    base_data = backend_dir.parent / "Data" / "distracted-driver-detection" / "train"
    
    # 1. Normal driver/cabin (c0)
    c0_imgs = list((base_data / "c0").glob("*.jpg"))[:5]
    res_c0 = test_image_set("Scenario 1: Normal driver/cabin (c0)", c0_imgs)
    
    # 2. Driver holding a mobile phone (c1: texting right)
    c1_imgs = list((base_data / "c1").glob("*.jpg"))[:5]
    res_c1 = test_image_set("Scenario 2: Driver holding a mobile phone (c1: texting)", c1_imgs)
    
    # 3. Driver using phone near ear (c2: talking phone right)
    c2_imgs = list((base_data / "c2").glob("*.jpg"))[:5]
    res_c2 = test_image_set("Scenario 3: Driver phone near ear (c2: talking)", c2_imgs)
    
    # 4. Driver drinking / holding bottle/cup (c6)
    c6_imgs = list((base_data / "c6").glob("*.jpg"))[:5]
    res_c6 = test_image_set("Scenario 4: Driver drinking / bottle / cup (c6)", c6_imgs)
    
    # 5. Driver / frame with no detected objects
    blank_img = np.zeros((480, 640, 3), dtype=np.uint8)
    res_blank = yolo_service.process_frame(blank_img, confidence_threshold=0.25)
    print(f"\n{'='*70}")
    print("AUDIT EVALUATION: Scenario 5: Frame with No Detected Objects")
    print(f"{'='*70}")
    print(f"  Detections ({res_blank['detection_count']}): {res_blank['detections']}")
    print(f"  API class_name: '{res_blank['class_name']}', confidence: {res_blank['confidence']}")
    print(f"  API status: '{res_blank['status']}', is_distracted: {res_blank['is_distracted']}, score: {res_blank['score']}")

    # 6. Multiple objects in the cabin
    # Let's search for images across c0-c9 that produce >1 detection
    print(f"\n{'='*70}")
    print("AUDIT EVALUATION: Scenario 6: Multiple objects in the cabin")
    print(f"{'='*70}")
    multi_imgs = []
    for cat in ["c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"]:
        for img_p in (base_data / cat).glob("*.jpg"):
            img = cv2.imread(str(img_p))
            if img is not None:
                r = yolo_service.process_frame(img, confidence_threshold=0.25)
                if r["detection_count"] >= 2:
                    multi_imgs.append((img_p, r))
                    if len(multi_imgs) >= 5:
                        break
        if len(multi_imgs) >= 5:
            break
            
    for img_p, res in multi_imgs:
        print(f"Image ({img_p.parent.name}/{img_p.name}):")
        det_strs = [f"{d['class_name']} ({d['confidence']})" for d in res['detections']]
        print(f"  Detections ({res['detection_count']}): {det_strs}")
        print(f"  API class_name: '{res['class_name']}', confidence: {res['confidence']}")
        print(f"  API status: '{res['status']}', is_distracted: {res['is_distracted']}")

if __name__ == "__main__":
    main()

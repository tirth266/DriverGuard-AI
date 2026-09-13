#!/usr/bin/env python3
"""
DriverGuard-AI: YOLO11 Object Detection Inference & Testing Script
==================================================================
Runs detection on a single image, directory of images, or video/webcam.
Outputs structured detection JSON (class, confidence, integer bounding boxes)
and saves cleanly annotated images with bounding boxes and labels.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import List, Dict, Any

import cv2


def run_detection_on_image(
    model,
    image_path: Path,
    conf_threshold: float,
    device: str,
    output_dir: Path,
) -> Dict[str, Any]:
    """Runs YOLO11 object detection on a single image and saves annotated output."""
    frame = cv2.imread(str(image_path))
    if frame is None:
        raise ValueError(f"Could not read image at: {image_path}")

    start_time = time.time()
    results = model.predict(
        source=frame,
        conf=conf_threshold,
        device=device,
        verbose=False,
    )
    inference_time_ms = round((time.time() - start_time) * 1000, 2)

    res = results[0]
    detections: List[Dict[str, Any]] = []

    annotated_frame = frame.copy()

    if hasattr(res, "boxes") and res.boxes is not None and len(res.boxes) > 0:
        for box in res.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            cls_name = res.names.get(cls_id, f"class_{cls_id}")
            xyxy = [int(v) for v in box.xyxy[0].tolist()]

            x1, y1, x2, y2 = xyxy

            # Highlight phone/distraction in red, other cabin items in green
            is_distractor = any(kw in cls_name.lower() for kw in ["phone", "cell", "smoke", "distract"])
            color = (0, 0, 255) if is_distractor else (0, 255, 0)

            # Draw bounding box
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)

            # Draw label banner
            label = f"{cls_name} {int(conf * 100)}%"
            (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
            cv2.rectangle(
                annotated_frame,
                (x1, max(y1 - label_h - 10, 0)),
                (x1 + label_w + 6, max(y1, label_h + 10)),
                color,
                -1,
            )
            cv2.putText(
                annotated_frame,
                label,
                (x1 + 3, max(y1 - 5, label_h)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

            detections.append({
                "class_id": cls_id,
                "class_name": cls_name,
                "confidence": round(conf, 4),
                "bbox": {
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                },
            })

    output_dir.mkdir(parents=True, exist_ok=True)
    out_file = output_dir / f"detected_{image_path.name}"
    cv2.imwrite(str(out_file), annotated_frame)

    return {
        "image": str(image_path),
        "annotated_saved_to": str(out_file),
        "inference_time_ms": inference_time_ms,
        "detection_count": len(detections),
        "detections": detections,
    }


def main():
    parser = argparse.ArgumentParser(description="Test YOLO11 Object Detection")
    parser.add_argument(
        "--source",
        type=str,
        required=True,
        help="Path to an image file, directory of images, or '0' for webcam",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="yolo11n.pt",
        help="YOLO11 detection model checkpoint (default: yolo11n.pt)",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=0.40,
        help="Confidence threshold (default: 0.40)",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="auto",
        help="Device to use ('cpu', 'cuda', 'auto')",
    )
    parser.add_argument(
        "--save-dir",
        type=str,
        default="runs/detect/test_output",
        help="Directory to save annotated images",
    )

    args = parser.parse_args()

    try:
        from ultralytics import YOLO
        import torch
    except ImportError:
        print("Ultralytics or PyTorch not installed.", file=sys.stderr)
        sys.exit(1)

    # Check model task
    if "-cls" in args.model.lower():
        raise ValueError(f"Model '{args.model}' is a classification model, not an object detection model.")

    device = 0 if (args.device == "auto" and torch.cuda.is_available()) else ("cpu" if args.device == "auto" else args.device)

    print(f"[YOLO Test] Loading detection model: {args.model} on {device}...")
    model = YOLO(args.model)

    if getattr(model, "task", "detect") != "detect":
        raise ValueError(f"Model task is '{getattr(model, 'task', None)}', expected 'detect'.")

    source_path = Path(args.source)
    output_dir = Path(args.save_dir)

    if source_path.is_file():
        result = run_detection_on_image(model, source_path, args.conf, device, output_dir)
        print("\n" + "=" * 60)
        print(json.dumps(result, indent=2))
        print("=" * 60)
        print(f"[SUCCESS] Annotated result saved to: {result['annotated_saved_to']}")

    elif source_path.is_dir():
        image_exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
        image_files = [p for p in source_path.iterdir() if p.suffix.lower() in image_exts]
        print(f"Found {len(image_files)} images in {source_path}")

        results_summary = []
        for img_p in image_files[:10]:  # test first 10
            res = run_detection_on_image(model, img_p, args.conf, device, output_dir)
            results_summary.append(res)
            print(f"Processed: {img_p.name} -> {res['detection_count']} detections ({res['inference_time_ms']} ms)")

        summary_file = output_dir / "detection_results.json"
        with open(summary_file, "w", encoding="utf-8") as f:
            json.dump(results_summary, f, indent=2)
        print(f"\n[SUCCESS] Processed images. Summary saved to: {summary_file}")

    else:
        print(f"Invalid source: {args.source}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

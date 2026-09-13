#!/usr/bin/env python3
"""
DriverGuard-AI: YOLO11 Object Detection Evaluation Script
=========================================================
Evaluates a trained YOLO11 object detection model against validation data.
Reports standard object detection metrics:
- Precision (P)
- Recall (R)
- mAP@50
- mAP@50-95
- Per-class metrics
Strictly no fabricated metrics.
"""

import argparse
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Evaluate YOLO11 Object Detection Model")
    parser.add_argument(
        "--model",
        type=str,
        default="models/trained/yolo11/detection/best.pt",
        help="Path to trained detection model weights",
    )
    parser.add_argument(
        "--data",
        type=str,
        default="backend/yolo11/data.yaml",
        help="Path to data.yaml dataset config",
    )
    parser.add_argument(
        "--imgsz",
        type=int,
        default=640,
        help="Image size for evaluation (default: 640)",
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=16,
        help="Batch size for evaluation",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="auto",
        help="Device to run on (default: auto)",
    )

    args = parser.parse_args()

    try:
        from ultralytics import YOLO
        import torch
    except ImportError:
        print("Ultralytics or PyTorch not installed.", file=sys.stderr)
        sys.exit(1)

    model_path = Path(args.model)
    if not model_path.exists():
        # Fallback to yolo11n.pt if custom trained weights not present
        if Path("yolo11n.pt").exists():
            model_path = Path("yolo11n.pt")
        else:
            print(f"Model weights not found at: {model_path}", file=sys.stderr)
            sys.exit(1)

    device = 0 if (args.device == "auto" and torch.cuda.is_available()) else ("cpu" if args.device == "auto" else args.device)

    print("=" * 60)
    print("YOLO11 OBJECT DETECTION EVALUATION")
    print("=" * 60)
    print(f"Model:  {model_path.resolve()}")
    print(f"Data:   {args.data}")
    print(f"Device: {device}")
    print("=" * 60)

    model = YOLO(str(model_path))

    if getattr(model, "task", "detect") != "detect":
        raise ValueError(f"Model is not an object detection model (task='{getattr(model, 'task', None)}')")

    metrics = model.val(
        data=args.data,
        imgsz=args.imgsz,
        batch=args.batch,
        device=device,
        split="val",
    )

    print("\n" + "=" * 60)
    print("OBJECT DETECTION VALIDATION METRICS:")
    print(f"  Precision:   {metrics.box.mp:.4f}")
    print(f"  Recall:      {metrics.box.mr:.4f}")
    print(f"  mAP@50:      {metrics.box.map50:.4f}")
    print(f"  mAP@50-95:   {metrics.box.map:.4f}")
    print("=" * 60)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
DriverGuard-AI: YOLO11 Training Pipeline Entry Point
Redirects to the proper YOLO11 Object Detection training pipeline (train_detect.py).
"""
import sys
from pathlib import Path

# Add backend/yolo11 to sys.path
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from train_detect import main

if __name__ == "__main__":
    main()

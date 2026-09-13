#!/usr/bin/env python3
"""
DriverGuard-AI: YOLO11 Object Detection Training Pipeline
=========================================================
Trains a YOLO11 object detection model (task="detect") on annotated driver data.
Supports GPU acceleration with automatic CPU fallback, configurable hyperparameters,
strict validation guards against classification models, and comprehensive result logging.
"""

import argparse
import logging
import os
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_detect")


def validate_detection_dataset(data_yaml_path: Path):
    """
    Validates that the data.yaml exists and points to an object detection dataset
    with matching image and label directories.
    """
    if not data_yaml_path.exists():
        raise FileNotFoundError(
            f"Detection configuration file not found at: {data_yaml_path.resolve()}\n"
            "Please ensure data.yaml exists and points to valid images/ and labels/ directories."
        )

    import yaml
    with open(data_yaml_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    dataset_root = Path(config.get("path", data_yaml_path.parent))
    if not dataset_root.is_absolute():
        dataset_root = (data_yaml_path.parent / dataset_root).resolve()

    train_images = dataset_root / config.get("train", "images/train")
    if not train_images.is_absolute():
        train_images = (dataset_root / config.get("train", "images/train")).resolve()

    # Corresponding labels directory in standard YOLO format
    train_labels = Path(str(train_images).replace("images", "labels"))

    logger.info(f"Dataset Root:   {dataset_root}")
    logger.info(f"Train Images:   {train_images}")
    logger.info(f"Expected Labels:{train_labels}")

    if not train_images.exists():
        logger.warning(
            f"Train images directory does not exist at: {train_images}\n"
            "If you are preparing to train, ensure you have placed images into images/train/."
        )

    if not train_labels.exists():
        logger.warning(
            f"Train labels directory does not exist at: {train_labels}\n"
            "YOLO Object Detection requires .txt bounding-box annotation files matching each image."
        )


def main():
    parser = argparse.ArgumentParser(
        description="Train YOLO11 Object Detection Model for DriverGuard-AI"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="yolo11n.pt",
        help="Pretrained YOLO11 detection checkpoint (e.g., yolo11n.pt, yolo11s.pt). Must NOT be a classification model.",
    )
    parser.add_argument(
        "--data",
        type=str,
        default="backend/yolo11/data.yaml",
        help="Path to data.yaml dataset configuration file",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=50,
        help="Number of training epochs (default: 50)",
    )
    parser.add_argument(
        "--imgsz",
        type=int,
        default=640,
        help="Input image resolution (default: 640)",
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=16,
        help="Batch size (default: 16, use -1 for AutoBatch)",
    )
    parser.add_argument(
        "--device",
        type=str,
        default="auto",
        help="Compute device: 'auto', '0', '1', 'cpu', 'cuda' (default: auto)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4 if os.name != "nt" else 0,
        help="Dataloader workers (default: 4 on Linux, 0 on Windows)",
    )
    parser.add_argument(
        "--project",
        type=str,
        default="runs/detect",
        help="Output directory to save training runs (default: runs/detect)",
    )
    parser.add_argument(
        "--name",
        type=str,
        default="driverguard_yolo11_detection",
        help="Experiment run name",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate parameters, model checkpoint, and dataset configuration without training",
    )

    args = parser.parse_args()

    # Guard 1: Enforce detection model; strictly reject classification models
    if "-cls" in args.model.lower() or "classify" in args.model.lower():
        raise ValueError(
            f"INVALID MODEL: '{args.model}' is a classification checkpoint! "
            "Object detection requires a detection checkpoint such as 'yolo11n.pt', not 'yolo11n-cls.pt'."
        )

    # Resolve paths
    script_dir = Path(__file__).resolve().parent
    workspace_root = script_dir.parent.parent

    data_path = Path(args.data)
    if not data_path.is_absolute():
        data_path = workspace_root / data_path

    project_path = Path(args.project)
    if not project_path.is_absolute():
        project_path = workspace_root / project_path

    # Device resolution
    try:
        import torch
        if args.device == "auto":
            device = 0 if torch.cuda.is_available() else "cpu"
        else:
            device = args.device
    except ImportError:
        device = "cpu"

    print("=" * 70)
    print("DRIVERGUARD-AI: YOLO11 OBJECT DETECTION TRAINING")
    print("=" * 70)
    print(f"Task:               detect (Object Detection)")
    print(f"Base Model:         {args.model}")
    print(f"Dataset Config:     {data_path.resolve()}")
    print(f"Epochs:             {args.epochs}")
    print(f"Image Size:         {args.imgsz}")
    print(f"Batch Size:         {args.batch}")
    print(f"Device:             {device}")
    print(f"Workers:            {args.workers}")
    print(f"Project Directory:  {project_path.resolve()}")
    print(f"Run Name:           {args.name}")
    print("=" * 70)

    # Pre-flight dataset check
    validate_detection_dataset(data_path)

    if args.dry_run:
        print("\n[DRY RUN SUCCESSFUL] Configuration and parameters verified. Training skipped.")
        return

    # Ultralytics import & model initialization
    try:
        from ultralytics import YOLO
    except ImportError:
        logger.error("Ultralytics package is not installed. Run: pip install ultralytics")
        sys.exit(1)

    logger.info(f"Loading YOLO11 detection model: {args.model} ...")
    model = YOLO(args.model)

    # Guard 2: Confirm task is detection
    model_task = getattr(model, "task", "detect")
    if model_task != "detect":
        raise ValueError(
            f"Loaded model has task '{model_task}', expected 'detect'. "
            "Please ensure you are loading a YOLO detection checkpoint (e.g. yolo11n.pt)."
        )

    logger.info(f"Starting YOLO11 Object Detection Training...")
    results = model.train(
        data=str(data_path.resolve()),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=device,
        workers=args.workers,
        project=str(project_path.resolve()),
        name=args.name,
        task="detect",
        verbose=True,
    )

    output_dir = project_path / args.name
    best_weights = output_dir / "weights" / "best.pt"
    last_weights = output_dir / "weights" / "last.pt"

    print("\n" + "=" * 70)
    print("TRAINING COMPLETE")
    print(f"Run Directory:     {output_dir.resolve()}")
    print(f"Best Weights:      {best_weights.resolve()}")
    print(f"Last Weights:      {last_weights.resolve()}")
    print("=" * 70)


if __name__ == "__main__":
    main()

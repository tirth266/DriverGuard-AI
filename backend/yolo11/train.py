import argparse
import os
import sys
import tempfile
from pathlib import Path

def verify_dataset_count(data_dir: Path, expected_train: int = 4000, expected_val: int = 1000):
    """
    Verifies that the temporary dataset contains exactly 5,000 images (4,000 train, 1,000 val) across 10 classes.
    """
    train_dir = data_dir / "train"
    val_dir = data_dir / "val"

    if not train_dir.exists() or not val_dir.exists():
        raise FileNotFoundError(
            f"Dataset directory structure invalid. Expected 'train' and 'val' subdirectories inside {data_dir}"
        )

    classes = [f"c{i}" for i in range(10)]
    train_count = 0
    val_count = 0

    for cls in classes:
        cls_train = train_dir / cls
        cls_val = val_dir / cls

        if not cls_train.exists():
            raise FileNotFoundError(f"Missing train class folder: {cls_train}")
        if not cls_val.exists():
            raise FileNotFoundError(f"Missing val class folder: {cls_val}")

        cls_train_imgs = len([
            f for f in os.listdir(cls_train)
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp"))
        ])
        cls_val_imgs = len([
            f for f in os.listdir(cls_val)
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp"))
        ])

        train_count += cls_train_imgs
        val_count += cls_val_imgs

    total_count = train_count + val_count

    print("-" * 60)
    print("DATASET COUNT VERIFICATION BEFORE TRAINING:")
    print(f"  Training Images:   {train_count} (Expected: {expected_train})")
    print(f"  Validation Images: {val_count} (Expected: {expected_val})")
    print(f"  Total Images:      {total_count} (Expected: {expected_train + expected_val})")
    print("-" * 60)

    if train_count != expected_train:
        raise ValueError(
            f"HARD LIMIT ERROR: Training image count is {train_count}, expected exactly {expected_train}."
        )
    if val_count != expected_val:
        raise ValueError(
            f"HARD LIMIT ERROR: Validation image count is {val_count}, expected exactly {expected_val}."
        )
    if total_count != (expected_train + expected_val):
        raise ValueError(
            f"HARD LIMIT ERROR: Total image count is {total_count}, expected exactly {expected_train + expected_val}."
        )

    print("[SUCCESS] Dataset count is EXACTLY 5,000 images! Safe to proceed.")


def main():
    default_data = str(Path("/tmp/subset_5k") if os.name != "nt" else Path(tempfile.gettempdir()) / "subset_5k")

    parser = argparse.ArgumentParser(description="Train YOLO11 Classification Model on 5K Distracted Driver Dataset")
    parser.add_argument(
        "--data-dir",
        type=str,
        default=default_data,
        help=f"Path to 5,000 image temporary dataset working directory (default: {default_data})",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="yolo11n-cls.pt",
        help="Pretrained YOLO11 classification model (MUST be a classification model like yolo11n-cls.pt)",
    )
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--imgsz", type=int, default=224, help="Input image size (height & width)")
    parser.add_argument("--batch", type=int, default=32, help="Batch size")
    parser.add_argument(
        "--project",
        type=str,
        default="backend/models/trained",
        help="Directory to save training results and weights permanently",
    )
    parser.add_argument("--name", type=str, default="yolo11_5k_exp1", help="Experiment name")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Verify dataset and configuration without running full training",
    )

    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    workspace_root = script_dir.parent.parent

    data_path = Path(args.data_dir)
    if not data_path.is_absolute():
        data_path = workspace_root / data_path

    project_path = Path(args.project)
    if not project_path.is_absolute():
        project_path = workspace_root / project_path

    # Mandatory check on model name
    if "cls" not in args.model.lower():
        raise ValueError(
            f"INVALID MODEL: '{args.model}' is not a classification model! Must use yolo11n-cls.pt or similar classification model."
        )

    print("=" * 60)
    print("YOLO11 CLASSIFICATION TRAINING PIPELINE")
    print("=" * 60)
    print(f"Location:           backend/yolo11/train.py")
    print(f"Model:              {args.model}")
    print(f"Task:               Classification")
    print(f"Dataset Path:       {data_path.resolve()}")
    print(f"Output Project:     {project_path.resolve()}")
    print(f"Experiment Name:    {args.name}")
    print(f"Epochs:             {args.epochs}")
    print(f"Image Size:         {args.imgsz}")
    print(f"Batch Size:         {args.batch}")

    # Step 1: Verify dataset hard limit
    verify_dataset_count(data_path, expected_train=4000, expected_val=1000)

    if args.dry_run:
        print("\n[DRY RUN COMPLETE] Dataset and configuration checks passed successfully. Training skipped.")
        return

    # Step 2: Import Ultralytics and start training
    try:
        from ultralytics import YOLO
    except ImportError:
        print(
            "\n[ERROR] Ultralytics package is not installed. Please run: pip install -r backend/yolo11/requirements.txt",
            file=sys.stderr,
        )
        sys.exit(1)

    print("\nLoading YOLO11 Classification Model...")
    model = YOLO(args.model)

    print("\nStarting YOLO11 Classification Training...")
    results = model.train(
        data=str(data_path.resolve()),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=str(project_path.resolve()),
        name=args.name,
        task="classify",
        verbose=True,
    )

    print("\n" + "=" * 60)
    print(f"[TRAINING COMPLETE] Results saved permanently to: {(project_path / args.name).resolve()}")
    print("=" * 60)


if __name__ == "__main__":
    main()

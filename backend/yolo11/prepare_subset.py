import argparse
import json
import os
import random
import shutil
import sys
import tempfile
from pathlib import Path

CLASSES = [f"c{i}" for i in range(10)]

def prepare_subset(
    source_dir: Path,
    dest_dir: Path,
    seed: int = 42,
    images_per_class: int = 500,
    train_ratio: float = 0.8,
) -> dict:
    """
    Deterministically selects a subset of images per class, splits into train and validation sets,
    copies ONLY the selected files to dest_dir (no symlinks required), and enforces exact count checks.
    
    The original Data/ directory remains the SINGLE SOURCE OF TRUTH and is NEVER modified.
    """
    print("=" * 60)
    print("YOLO11 CLASSIFICATION DATASET SUBSET PREPARATION")
    print("=" * 60)
    print(f"Single Source of Truth: {source_dir.resolve()}")
    print(f"Temporary Working Dir: {dest_dir.resolve()}")
    print(f"Seed: {seed}")
    print(f"Images Per Class Target: {images_per_class}")

    if not source_dir.exists():
        raise FileNotFoundError(f"Source directory does not exist: {source_dir}")

    train_target_per_class = int(images_per_class * train_ratio)
    val_target_per_class = images_per_class - train_target_per_class

    expected_total_train = train_target_per_class * len(CLASSES)
    expected_total_val = val_target_per_class * len(CLASSES)
    expected_total = images_per_class * len(CLASSES)

    print(f"Target Train Count: {expected_total_train} ({train_target_per_class}/class)")
    print(f"Target Val Count:   {expected_total_val} ({val_target_per_class}/class)")
    print(f"Target Total Count: {expected_total}")

    # Prepare destination working directory
    dest_train = dest_dir / "train"
    dest_val = dest_dir / "val"

    if dest_dir.exists():
        print(f"Cleaning existing temporary working directory: {dest_dir}")
        shutil.rmtree(dest_dir)

    dest_train.mkdir(parents=True, exist_ok=True)
    dest_val.mkdir(parents=True, exist_ok=True)

    manifest = {
        "source_dir": str(source_dir.resolve()),
        "dest_dir": str(dest_dir.resolve()),
        "seed": seed,
        "classes": CLASSES,
        "images_per_class": images_per_class,
        "train_count": 0,
        "val_count": 0,
        "total_count": 0,
        "files": {"train": {}, "val": {}},
    }

    total_train_copied = 0
    total_val_copied = 0

    for cls in CLASSES:
        cls_src_dir = source_dir / cls
        if not cls_src_dir.exists():
            raise FileNotFoundError(f"Class folder missing in source: {cls_src_dir}")

        all_imgs = sorted([
            f for f in os.listdir(cls_src_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp"))
        ])

        if len(all_imgs) < images_per_class:
            raise ValueError(
                f"Class {cls} only has {len(all_imgs)} images, but {images_per_class} were requested."
            )

        # Deterministic shuffle using global seed + class specific offset
        rng = random.Random(seed + int(cls[1:]))
        selected_imgs = rng.sample(all_imgs, images_per_class)

        train_imgs = selected_imgs[:train_target_per_class]
        val_imgs = selected_imgs[train_target_per_class:]

        if len(train_imgs) != train_target_per_class or len(val_imgs) != val_target_per_class:
            raise ValueError(f"Split error for class {cls}: train={len(train_imgs)}, val={len(val_imgs)}")

        # Create class subfolders
        (dest_train / cls).mkdir(parents=True, exist_ok=True)
        (dest_val / cls).mkdir(parents=True, exist_ok=True)

        # Copy train files
        for img_name in train_imgs:
            src_file = cls_src_dir / img_name
            dst_file = dest_train / cls / img_name
            shutil.copy2(src_file, dst_file)
            manifest["files"]["train"][f"{cls}/{img_name}"] = str(src_file.resolve())
            total_train_copied += 1

        # Copy val files
        for img_name in val_imgs:
            src_file = cls_src_dir / img_name
            dst_file = dest_val / cls / img_name
            shutil.copy2(src_file, dst_file)
            manifest["files"]["val"][f"{cls}/{img_name}"] = str(src_file.resolve())
            total_val_copied += 1

        print(f"  Class {cls}: {len(train_imgs)} train + {len(val_imgs)} val = {len(selected_imgs)} total")

    manifest["train_count"] = total_train_copied
    manifest["val_count"] = total_val_copied
    manifest["total_count"] = total_train_copied + total_val_copied

    # HARD LIMIT ASSERTION
    print("-" * 60)
    print("VERIFYING SUBSET COUNT HARD LIMITS:")
    print(f"  Train Images Copied: {total_train_copied} / {expected_total_train}")
    print(f"  Val Images Copied:   {total_val_copied} / {expected_total_val}")
    print(f"  Total Images Copied: {manifest['total_count']} / {expected_total}")

    if total_train_copied != expected_total_train:
        raise ValueError(f"HARD LIMIT ERROR: Train count ({total_train_copied}) != expected ({expected_total_train})")
    if total_val_copied != expected_total_val:
        raise ValueError(f"HARD LIMIT ERROR: Val count ({total_val_copied}) != expected ({expected_total_val})")
    if manifest["total_count"] != expected_total:
        raise ValueError(f"HARD LIMIT ERROR: Total count ({manifest['total_count']}) != expected ({expected_total})")

    print("[SUCCESS] All 5,000 image count verification checks passed!")

    # Save manifest
    manifest_path = dest_dir / "dataset_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Saved dataset manifest to: {manifest_path.resolve()}")
    print("=" * 60)
    return manifest


def main():
    default_dest = str(Path("/tmp/subset_5k") if os.name != "nt" else Path(tempfile.gettempdir()) / "subset_5k")

    parser = argparse.ArgumentParser(description="Prepare 5,000 image subset for YOLO11 Classification")
    parser.add_argument(
        "--source-dir",
        type=str,
        default="Data/distracted-driver-detection/train",
        help="Path to single source of truth dataset train directory",
    )
    parser.add_argument(
        "--use-enhanced",
        action="store_true",
        help="Use enhanced dataset (train E) instead of original train",
    )
    parser.add_argument(
        "--dest-dir",
        type=str,
        default=default_dest,
        help=f"Destination directory for temporary working 5k subset (default: {default_dest})",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed for selection")
    parser.add_argument(
        "--images-per-class",
        type=int,
        default=500,
        help="Images per class (default: 500 for 5,000 total)",
    )

    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    workspace_root = script_dir.parent.parent

    source_path = Path(args.source_dir)
    if args.use_enhanced:
        source_path = Path("Data/distracted-driver-detection/train E")

    if not source_path.is_absolute():
        source_path = workspace_root / source_path

    dest_path = Path(args.dest_dir)
    if not dest_path.is_absolute():
        dest_path = workspace_root / dest_path

    try:
        prepare_subset(
            source_dir=source_path,
            dest_dir=dest_path,
            seed=args.seed,
            images_per_class=args.images_per_class,
        )
    except Exception as e:
        print(f"\n[ERROR] Dataset preparation failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

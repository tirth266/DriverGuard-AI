import argparse
import json
import os
import random
import shutil
import sys
import zipfile
from pathlib import Path

CLASSES = [f"c{i}" for i in range(10)]

def create_transfer_package(
    source_dir: Path,
    output_dir: Path,
    zip_name: str = "subset_5k.zip",
    seed: int = 42,
    images_per_class: int = 500,
    train_ratio: float = 0.8,
) -> Path:
    """
    Selects exactly 5,000 images (500/class across 10 classes) deterministically (seed=42)
    from local Data/distracted-driver-detection/train, verifies hard limits (4k train / 1k val),
    and packages them into a single portable zip archive for Google Colab transfer.
    
    Original dataset is NEVER modified.
    """
    print("=" * 70)
    print("YOLO11 5K PORTABLE TRANSFER PACKAGE CREATOR (OPTION 2)")
    print("=" * 70)
    print(f"Local Source (Single Source of Truth): {source_dir.resolve()}")
    print(f"Transfer Staging Dir:                  {output_dir.resolve()}")
    print(f"Target Zip Output:                     {(output_dir / zip_name).resolve()}")
    print(f"Seed:                                  {seed}")
    print(f"Images Per Class Target:               {images_per_class}")

    if not source_dir.exists():
        raise FileNotFoundError(f"Local source directory does not exist: {source_dir}")

    train_target_per_class = int(images_per_class * train_ratio)
    val_target_per_class = images_per_class - train_target_per_class

    expected_total_train = train_target_per_class * len(CLASSES)
    expected_total_val = val_target_per_class * len(CLASSES)
    expected_total = images_per_class * len(CLASSES)

    print(f"Target Train Count: {expected_total_train} ({train_target_per_class}/class)")
    print(f"Target Val Count:   {expected_total_val} ({val_target_per_class}/class)")
    print(f"Target Total Count: {expected_total}")

    # Prepare staging directories
    subset_staging = output_dir / "subset_5k"
    dest_train = subset_staging / "train"
    dest_val = subset_staging / "val"

    if output_dir.exists():
        print(f"Cleaning existing transfer staging directory: {output_dir}")
        shutil.rmtree(output_dir)

    dest_train.mkdir(parents=True, exist_ok=True)
    dest_val.mkdir(parents=True, exist_ok=True)

    manifest = {
        "source_dir": str(source_dir.resolve()),
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

        # Deterministic selection
        rng = random.Random(seed + int(cls[1:]))
        selected_imgs = rng.sample(all_imgs, images_per_class)

        train_imgs = selected_imgs[:train_target_per_class]
        val_imgs = selected_imgs[train_target_per_class:]

        # Create class folders in staging
        (dest_train / cls).mkdir(parents=True, exist_ok=True)
        (dest_val / cls).mkdir(parents=True, exist_ok=True)

        for img_name in train_imgs:
            src_file = cls_src_dir / img_name
            dst_file = dest_train / cls / img_name
            shutil.copy2(src_file, dst_file)
            manifest["files"]["train"][f"{cls}/{img_name}"] = str(src_file.name)
            total_train_copied += 1

        for img_name in val_imgs:
            src_file = cls_src_dir / img_name
            dst_file = dest_val / cls / img_name
            shutil.copy2(src_file, dst_file)
            manifest["files"]["val"][f"{cls}/{img_name}"] = str(src_file.name)
            total_val_copied += 1

        print(f"  Class {cls}: {len(train_imgs)} train + {len(val_imgs)} val = {len(selected_imgs)} total")

    manifest["train_count"] = total_train_copied
    manifest["val_count"] = total_val_copied
    manifest["total_count"] = total_train_copied + total_val_copied

    # HARD LIMIT VERIFICATION
    print("-" * 70)
    print("VERIFYING SUBSET COUNT HARD LIMITS:")
    print(f"  Train Images Copied: {total_train_copied} / {expected_total_train}")
    print(f"  Val Images Copied:   {total_val_copied} / {expected_total_val}")
    print(f"  Total Images Copied: {manifest['total_count']} / {expected_total}")

    if total_train_copied != expected_total_train:
        raise ValueError(f"COUNT ABORT: Train count ({total_train_copied}) != expected ({expected_total_train})")
    if total_val_copied != expected_total_val:
        raise ValueError(f"COUNT ABORT: Val count ({total_val_copied}) != expected ({expected_total_val})")
    if manifest["total_count"] != expected_total:
        raise ValueError(f"COUNT ABORT: Total count ({manifest['total_count']}) != expected ({expected_total})")

    print("[SUCCESS] Exact 5,000 image hard count limit verified!")

    # Save dataset_manifest.json inside subset_5k/
    manifest_path = subset_staging / "dataset_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # Create ZIP archive
    zip_output_path = output_dir / zip_name
    print(f"\nCompressing into single portable archive: {zip_output_path.resolve()}")

    with zipfile.ZipFile(zip_output_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(subset_staging):
            for file in files:
                full_path = Path(root) / file
                arcname = full_path.relative_to(output_dir)
                zipf.write(full_path, arcname)

    zip_size_mb = zip_output_path.stat().st_size / (1024 * 1024)
    print(f"[SUCCESS] Zip package created: {zip_output_path.resolve()} ({zip_size_mb:.2f} MB)")
    print("=" * 70)
    return zip_output_path


def main():
    parser = argparse.ArgumentParser(description="Export 5K Transfer Zip Package for Colab")
    parser.add_argument(
        "--source-dir",
        type=str,
        default="Data/distracted-driver-detection/train",
        help="Path to local single source of truth train dataset",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="yolo11_transfer",
        help="Path to staging output directory",
    )
    parser.add_argument(
        "--zip-name",
        type=str,
        default="subset_5k.zip",
        help="Name of output zip archive",
    )
    parser.add_argument("--seed", type=int, default=42, help="Selection seed")
    parser.add_argument("--images-per-class", type=int, default=500, help="Images per class")

    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    workspace_root = script_dir.parent.parent

    source_path = Path(args.source_dir)
    if not source_path.is_absolute():
        source_path = workspace_root / source_path

    output_path = Path(args.output_dir)
    if not output_path.is_absolute():
        output_path = workspace_root / output_path

    try:
        create_transfer_package(
            source_dir=source_path,
            output_dir=output_path,
            zip_name=args.zip_name,
            seed=args.seed,
            images_per_class=args.images_per_class,
        )
    except Exception as e:
        print(f"\n[ERROR] Transfer package export failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

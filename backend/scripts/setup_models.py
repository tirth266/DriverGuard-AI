"""
One-time model installer for DriverGuard AI.

Run once, manually:

    python scripts/setup_models.py

The backend never downloads anything: it loads only the files this script
checks for, from backend/models/. Re-running is safe — a model that is already
installed and has a plausible size is skipped.

This script is not imported by the app and nothing in app startup calls it.
"""

import os
import sys
from dataclasses import dataclass
from typing import Optional

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# A truncated or placeholder file is treated as missing rather than installed.
MIN_MODEL_BYTES = 1_000_000


@dataclass(frozen=True)
class ModelFile:
    label: str
    relative_path: str
    expected_mb: str
    # This project records no download URL for its models, so a missing file is
    # reported with instructions rather than fetched from a guessed location.
    instructions: str


# One entry per model the frame pipeline loads. Paths are relative to BACKEND_DIR
# and must match app/config.py.
MODELS = (
    ModelFile(
        label="YOLO11 detection weights",
        relative_path=os.path.join("models", "trained", "yolo11", "detection", "best.pt"),
        expected_mb="~5.4 MB",
        instructions=(
            "This is this project's own fine-tuned checkpoint, not a public download.\n"
            "      Produce it with the training pipeline (backend/yolo11/train_detect.py),\n"
            "      or copy an existing best.pt into that path."
        ),
    ),
    ModelFile(
        label="MediaPipe face landmarker",
        relative_path=os.path.join("models", "mediapipe", "face_landmarker.task"),
        expected_mb="~3.6 MB",
        instructions=(
            "Official MediaPipe face landmarker task bundle (.task).\n"
            "      No download URL for it is recorded in this project, so place the file\n"
            "      here manually from Google's official MediaPipe model release."
        ),
    ),
    ModelFile(
        label="MediaPipe hand landmarker",
        relative_path=os.path.join("models", "mediapipe", "hand_landmarker.task"),
        expected_mb="~7.5 MB",
        instructions=(
            "Official MediaPipe hand landmarker task bundle (.task).\n"
            "      No download URL for it is recorded in this project, so place the file\n"
            "      here manually from Google's official MediaPipe model release."
        ),
    ),
)


def installed_size(path: str) -> Optional[int]:
    """Size in bytes when the file is present and plausibly complete, else None."""
    if not os.path.isfile(path):
        return None
    size = os.path.getsize(path)
    return size if size >= MIN_MODEL_BYTES else None


def report(model: ModelFile) -> bool:
    """Print the state of one model file. True when it is ready to load."""
    path = os.path.join(BACKEND_DIR, model.relative_path)
    size = installed_size(path)
    if size is not None:
        print(f"  OK, skipping  {model.label}: {model.relative_path} ({size / 1_048_576:.2f} MB)")
        return True

    print(f"  MISSING       {model.label}: {model.relative_path} (expected {model.expected_mb})")
    print(f"      -> {model.instructions}")
    print(f"      -> then re-run: python scripts/setup_models.py")
    return False


def main() -> int:
    print(f"Model directory: {BACKEND_DIR}")
    print(f"Python: {sys.executable}")
    print("Checking local model files (nothing is downloaded by the backend):\n")

    ready = [report(model) for model in MODELS]

    if all(ready):
        print("\nAll model files are installed. Start the backend with: python run.py")
        return 0

    print("\nThe backend will start and refuse frames with reason 'models_missing' until")
    print("the files above are installed. It will not download them for you.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
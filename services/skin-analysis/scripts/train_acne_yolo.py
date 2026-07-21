"""Train YOLOv8-nano on ACNE04-v2 for lesion detection and export to ONNX.

Usage (requires GPU recommended, CPU possible but slow):

    pip install ultralytics gdown
    python scripts/train_acne_yolo.py --epochs 100 --batch 16

The script:
1. Downloads ACNE04-v2 annotations from GitHub
2. Downloads ACNE04 images (Google Drive via gdown)
3. Converts COCO-style annotations to YOLO format
4. Trains YOLOv8-nano (single class: acne_lesion)
5. Exports best checkpoint to ONNX
6. Copies ONNX to models/ directory

License: ACNE04 images require author permission for non-academic use.
See MODEL-AND-DATA-REGISTER.md and THIRD_PARTY_MODELS.md.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"
DATASET_DIR = ROOT / "datasets" / "acne04v2"

ACNE04V2_ANNOTATIONS_URL = (
    "https://raw.githubusercontent.com/AIpourlapeau/acne04v2/main/Acne04-v2_annotations.json"
)
ACNE04_IMAGES_DRIVE_ID = None  # Set if you have a Google Drive link for ACNE04 images


def download_annotations(target: Path) -> dict:
    """Download ACNE04-v2 COCO-style annotations."""
    import urllib.request

    target.parent.mkdir(parents=True, exist_ok=True)
    if target.is_file():
        print(f"Annotations already exist: {target}")
    else:
        print("Downloading ACNE04-v2 annotations...")
        urllib.request.urlretrieve(ACNE04V2_ANNOTATIONS_URL, target)
        print(f"Saved to {target}")
    with open(target) as f:
        return json.load(f)


def coco_to_yolo(coco: dict, images_dir: Path, output_dir: Path, split_ratio: float = 0.85) -> Path:
    """Convert COCO annotations to YOLO format with train/val split."""
    import random

    random.seed(42)

    # ACNE04-v2 uses single category for lesions — map all to class 0
    image_map = {img["id"]: img for img in coco["images"]}

    # Group annotations by image
    ann_by_image: dict[int, list] = {}
    for ann in coco["annotations"]:
        ann_by_image.setdefault(ann["image_id"], []).append(ann)

    # Only include images that exist on disk
    available_ids = []
    for img_id, img_info in image_map.items():
        img_path = images_dir / img_info["file_name"]
        if img_path.is_file():
            available_ids.append(img_id)

    if not available_ids:
        raise FileNotFoundError(
            f"No ACNE04 images found in {images_dir}. "
            "Download the ACNE04 dataset images and place them there."
        )

    print(f"Found {len(available_ids)} images with annotations")

    random.shuffle(available_ids)
    split_idx = int(len(available_ids) * split_ratio)
    train_ids = set(available_ids[:split_idx])
    val_ids = set(available_ids[split_idx:])

    for split_name, ids in [("train", train_ids), ("val", val_ids)]:
        img_out = output_dir / split_name / "images"
        lbl_out = output_dir / split_name / "labels"
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)

        for img_id in ids:
            img_info = image_map[img_id]
            src_path = images_dir / img_info["file_name"]
            dst_path = img_out / img_info["file_name"]
            if not dst_path.is_file():
                shutil.copy2(src_path, dst_path)

            img_w = img_info["width"]
            img_h = img_info["height"]
            label_name = Path(img_info["file_name"]).stem + ".txt"
            label_path = lbl_out / label_name

            lines = []
            for ann in ann_by_image.get(img_id, []):
                if "bbox" in ann:
                    x, y, w, h = ann["bbox"]
                    cx = (x + w / 2) / img_w
                    cy = (y + h / 2) / img_h
                    nw = w / img_w
                    nh = h / img_h
                elif "coordinates" in ann:
                    px, py = ann["coordinates"]
                    r = ann.get("radius", 20)
                    cx = px / img_w
                    cy = py / img_h
                    nw = (2 * r) / img_w
                    nh = (2 * r) / img_h
                else:
                    continue
                # Clamp to [0, 1]
                cx = max(0, min(1, cx))
                cy = max(0, min(1, cy))
                nw = max(0, min(1, nw))
                nh = max(0, min(1, nh))
                lines.append(f"0 {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")

            label_path.write_text("\n".join(lines) + "\n" if lines else "")

    # Write dataset YAML
    yaml_path = output_dir / "acne04v2.yaml"
    yaml_path.write_text(
        f"path: {output_dir.resolve()}\n"
        f"train: train/images\n"
        f"val: val/images\n"
        f"nc: 1\n"
        f"names:\n"
        f"  0: acne_lesion\n"
    )
    print(f"Train: {len(train_ids)} images, Val: {len(val_ids)} images")
    print(f"Dataset YAML: {yaml_path}")
    return yaml_path


def train(yaml_path: Path, epochs: int, batch: int, imgsz: int) -> Path:
    """Train YOLOv8-nano and return path to best checkpoint."""
    from ultralytics import YOLO

    model = YOLO("yolov8n.pt")  # pretrained nano
    results = model.train(
        data=str(yaml_path),
        epochs=epochs,
        batch=batch,
        imgsz=imgsz,
        name="acne-yolov8n",
        project=str(ROOT / "runs"),
        exist_ok=True,
        patience=20,
        augment=True,
        mosaic=0.5,
        mixup=0.1,
        hsv_h=0.015,
        hsv_s=0.3,
        hsv_v=0.2,
        degrees=10,
        flipud=0.0,  # faces should not be flipped vertically
        fliplr=0.5,
    )
    best_path = Path(results.save_dir) / "weights" / "best.pt"
    if not best_path.is_file():
        raise FileNotFoundError(f"Training completed but best.pt not found at {best_path}")
    print(f"Best checkpoint: {best_path}")
    return best_path


def export_onnx(best_path: Path, imgsz: int) -> Path:
    """Export trained model to ONNX."""
    from ultralytics import YOLO

    model = YOLO(str(best_path))
    onnx_path = model.export(format="onnx", imgsz=imgsz, simplify=True, opset=17)
    onnx_path = Path(onnx_path)
    print(f"ONNX exported: {onnx_path} ({onnx_path.stat().st_size / 1024 / 1024:.1f} MB)")
    return onnx_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Train YOLOv8-nano acne detector on ACNE04-v2")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument(
        "--images-dir",
        type=Path,
        default=DATASET_DIR / "images",
        help="Path to ACNE04 images directory",
    )
    parser.add_argument("--skip-train", action="store_true", help="Skip training, just convert/export")
    parser.add_argument("--checkpoint", type=Path, help="Path to existing best.pt for export only")
    args = parser.parse_args()

    # Step 1: Download annotations
    ann_path = DATASET_DIR / "acne04v2_annotations.json"
    coco = download_annotations(ann_path)

    # Step 2: Convert to YOLO format
    yolo_dir = DATASET_DIR / "yolo"
    yaml_path = coco_to_yolo(coco, args.images_dir, yolo_dir)

    if args.skip_train and args.checkpoint:
        best_path = args.checkpoint
    elif args.skip_train:
        print("--skip-train requires --checkpoint")
        return 1
    else:
        # Step 3: Train
        best_path = train(yaml_path, args.epochs, args.batch, args.imgsz)

    # Step 4: Export to ONNX
    onnx_path = export_onnx(best_path, args.imgsz)

    # Step 5: Copy to models/
    target = MODEL_DIR / "acne-yolov8n.onnx"
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(onnx_path, target)
    print(f"Model copied to {target}")

    # Print SHA256 for MODEL-AND-DATA-REGISTER.md
    import hashlib

    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    print(f"SHA-256: {digest}")
    print(f"Size: {target.stat().st_size:,} bytes")
    print("\nAdd this to MODEL-AND-DATA-REGISTER.md and download_models.py")

    return 0


if __name__ == "__main__":
    sys.exit(main())

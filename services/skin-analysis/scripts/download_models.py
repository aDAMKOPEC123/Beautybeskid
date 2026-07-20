from __future__ import annotations

import argparse
import hashlib
import shutil
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

import gdown


ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"

MODELS = {
    "bisenet-resnet18.onnx": {
        "url": "https://github.com/yakhyo/face-parsing/releases/download/weights/resnet18.onnx",
        "sha256": "0d9bd318e46987c3bdbfacae9e2c0f461cae1c6ac6ea6d43bbe541a91727e33f",
    },
    "acne-lds-fold0.pth": {
        "google_drive_id": "1cfgwxh_NbCXkMShv2ITIK4939teu1UDJ",
        "sha256": "247af45e2348231e177481d6160af53abd6419f2e2ae0088f5b5c05fb8868601",
    },
    "ffhq-wrinkle-stage2-unet.pth": {
        "google_drive_zip_id": "19653Ikj54SKqeoOXImgJXh-s14NmF0yk",
        "archive_member": "stage2_wrinkle_finetune_unet/stage2_unet.pth",
        "sha256": "883034b3e0726dcdae946c312106dfde1d354ea5455fa21cba045a73058f4a25",
    },
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verified(path: Path, expected: str) -> bool:
    return path.is_file() and sha256(path) == expected


def download_url(url: str, target: Path) -> None:
    with urllib.request.urlopen(url) as response, target.open("wb") as output:
        shutil.copyfileobj(response, output)


def install_model(name: str, spec: dict[str, str], force: bool) -> None:
    target = MODEL_DIR / name
    if not force and verified(target, spec["sha256"]):
        print(f"OK {name} (already verified)")
        return

    with tempfile.TemporaryDirectory(prefix="cosmo-skin-model-") as temp_dir:
        temporary = Path(temp_dir)
        if "url" in spec:
            downloaded = temporary / name
            download_url(spec["url"], downloaded)
        elif "google_drive_id" in spec:
            downloaded = temporary / name
            result = gdown.download(id=spec["google_drive_id"], output=str(downloaded), quiet=False)
            if not result:
                raise RuntimeError(f"Google Drive download failed for {name}")
        else:
            archive = temporary / "checkpoints.zip"
            result = gdown.download(id=spec["google_drive_zip_id"], output=str(archive), quiet=False)
            if not result:
                raise RuntimeError(f"Google Drive download failed for {name}")
            with zipfile.ZipFile(archive) as package:
                with package.open(spec["archive_member"]) as source, (temporary / name).open("wb") as output:
                    shutil.copyfileobj(source, output)
            downloaded = temporary / name

        actual = sha256(downloaded)
        if actual != spec["sha256"]:
            raise RuntimeError(f"Checksum mismatch for {name}: expected {spec['sha256']}, got {actual}")
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(downloaded), target)
        print(f"OK {name} ({target.stat().st_size / 1024 / 1024:.1f} MB)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Download verified COSMO research skin-analysis checkpoints")
    parser.add_argument("--force", action="store_true", help="Download even when a verified file already exists")
    args = parser.parse_args()
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for name, spec in MODELS.items():
        install_model(name, spec, args.force)
    print("All research model checkpoints are installed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

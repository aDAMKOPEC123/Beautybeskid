from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    root: Path
    model_dir: Path
    face_parsing_model: Path
    acne_model: Path
    acne_detector_model: Path
    wrinkle_model: Path
    api_key: str | None
    device: str
    wrinkle_image_size: int


def get_settings() -> Settings:
    root = Path(__file__).resolve().parent
    model_dir = Path(os.getenv("SKIN_MODEL_DIR", root / "models")).resolve()
    configured_device = os.getenv("SKIN_MODEL_DEVICE", "auto").lower()
    if configured_device not in {"auto", "cpu", "cuda"}:
        raise ValueError("SKIN_MODEL_DEVICE must be one of: auto, cpu, cuda")

    image_size = int(os.getenv("SKIN_WRINKLE_IMAGE_SIZE", "512"))
    if image_size < 256 or image_size > 1024 or image_size % 16 != 0:
        raise ValueError("SKIN_WRINKLE_IMAGE_SIZE must be 256-1024 and divisible by 16")

    return Settings(
        root=root,
        model_dir=model_dir,
        face_parsing_model=model_dir / "bisenet-resnet18.onnx",
        acne_model=model_dir / "acne-lds-fold0.pth",
        acne_detector_model=model_dir / "acne-yolov8n.onnx",
        wrinkle_model=model_dir / "ffhq-wrinkle-stage2-unet.pth",
        api_key=os.getenv("SKIN_ANALYSIS_API_KEY") or None,
        device=configured_device,
        wrinkle_image_size=image_size,
    )

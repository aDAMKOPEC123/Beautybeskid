from __future__ import annotations

from collections import OrderedDict
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
import torch
from PIL import Image

from config import Settings
from model_architectures import AcneLdsResNet50, WrinkleUNet


def resolve_device(requested: str) -> torch.device:
    if requested == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("SKIN_MODEL_DEVICE=cuda, but CUDA is not available")
    if requested == "cuda" or (requested == "auto" and torch.cuda.is_available()):
        return torch.device("cuda")
    return torch.device("cpu")


def require_file(path: Path) -> None:
    if not path.is_file():
        raise FileNotFoundError(
            f"Missing model file: {path}. Run: python services/skin-analysis/scripts/download_models.py"
        )


class FaceParser:
    INPUT_SIZE = (512, 512)
    MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    def __init__(self, path: Path):
        require_file(path)
        self.session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        self.output_names = [output.name for output in self.session.get_outputs()]

    def predict(self, bgr: np.ndarray) -> np.ndarray:
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb, self.INPUT_SIZE, interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255.0
        normalized = (resized - self.MEAN) / self.STD
        tensor = np.transpose(normalized, (2, 0, 1))[None].astype(np.float32)
        output = self.session.run(self.output_names, {self.input_name: tensor})[0]
        mask = output.squeeze(0).argmax(0).astype(np.uint8)
        return cv2.resize(mask, (bgr.shape[1], bgr.shape[0]), interpolation=cv2.INTER_NEAREST)


class AcneModel:
    MEAN = np.array([0.45815152, 0.361242, 0.29348266], dtype=np.float32)
    STD = np.array([0.2814769, 0.226306, 0.20132513], dtype=np.float32)

    def __init__(self, path: Path, device: torch.device):
        require_file(path)
        self.device = device
        self.model = AcneLdsResNet50().to(device)
        checkpoint = torch.load(path, map_location=device, weights_only=False)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()

    def predict(self, bgr: np.ndarray) -> dict[str, object]:
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        rgb = cv2.resize(rgb, (224, 224), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
        normalized = (rgb - self.MEAN) / self.STD
        tensor = torch.from_numpy(np.transpose(normalized, (2, 0, 1))[None]).to(self.device)
        with torch.inference_mode():
            severity_13, count_probs, severity_from_count = self.model(tensor)
            severity_4 = torch.stack(
                (
                    severity_13[:, :1].sum(1),
                    severity_13[:, 1:4].sum(1),
                    severity_13[:, 4:10].sum(1),
                    severity_13[:, 10:].sum(1),
                ),
                dim=1,
            )
            combined = 0.5 * (severity_4 + severity_from_count)
        probabilities = combined[0].detach().cpu().numpy()
        count_probabilities = count_probs[0].detach().cpu().numpy()
        return {
            "probabilities": probabilities,
            "count": int(count_probabilities.argmax()) + 1,
        }


class WrinkleModel:
    def __init__(self, path: Path, device: torch.device, image_size: int):
        require_file(path)
        self.device = device
        self.image_size = image_size
        self.model = WrinkleUNet().to(device)
        checkpoint = torch.load(path, map_location=device, weights_only=False)
        raw_state = checkpoint["model"] if "model" in checkpoint else checkpoint
        state = OrderedDict((key.removeprefix("module."), value) for key, value in raw_state.items())
        self.model.load_state_dict(state)
        self.model.eval()

    def predict(self, bgr: np.ndarray, face_mask: np.ndarray) -> dict[str, object]:
        size = (self.image_size, self.image_size)
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        resized_rgb = cv2.resize(rgb, size, interpolation=cv2.INTER_AREA)
        resized_mask = cv2.resize(face_mask.astype(np.uint8), size, interpolation=cv2.INTER_NEAREST).astype(bool)
        masked_rgb = resized_rgb.copy()
        masked_rgb[~resized_mask] = 0

        gray = cv2.cvtColor(resized_rgb, cv2.COLOR_RGB2GRAY)
        blurred = cv2.GaussianBlur(gray, (21, 21), sigmaX=5, sigmaY=5)
        texture = cv2.subtract(gray, blurred)
        texture[~resized_mask] = 0

        rgb_input = masked_rgb.astype(np.float32) / 255.0 * 2.0 - 1.0
        texture_input = texture.astype(np.float32) / 255.0 * 2.0 - 1.0
        combined = np.concatenate((np.transpose(rgb_input, (2, 0, 1)), texture_input[None]), axis=0)
        tensor = torch.from_numpy(combined[None]).to(self.device)

        with torch.inference_mode():
            logits = self.model(tensor)
            probabilities = torch.softmax(logits, dim=1)
            wrinkle_probability = probabilities[0, 1].detach().cpu().numpy()
            prediction = probabilities.argmax(dim=1)[0].detach().cpu().numpy().astype(bool)

        prediction &= resized_mask
        skin_pixels = max(1, int(resized_mask.sum()))
        wrinkle_pixels = int(prediction.sum())
        confidence = float(wrinkle_probability[prediction].mean()) if wrinkle_pixels else None
        return {
            "coverage": wrinkle_pixels / skin_pixels * 100.0,
            "wrinkle_pixels": wrinkle_pixels,
            "skin_pixels": skin_pixels,
            "confidence": confidence,
            "wrinkle_mask": prediction,
        }


class ModelBundle:
    def __init__(self, settings: Settings):
        self.device = resolve_device(settings.device)
        self.face_parser = FaceParser(settings.face_parsing_model)
        self.acne = AcneModel(settings.acne_model, self.device)
        self.wrinkles = WrinkleModel(settings.wrinkle_model, self.device, settings.wrinkle_image_size)

    @property
    def versions(self) -> dict[str, str]:
        return {
            "faceParsing": "BiSeNet-ResNet18-CelebAMaskHQ-ONNX",
            "acne": "Acne-LDS-ACNE04-fold0",
            "wrinkles": "FFHQ-Wrinkle-stage2-U-Net",
            "colorIndices": "COSMO-relative-color-v1",
        }

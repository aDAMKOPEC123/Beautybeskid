from __future__ import annotations

import base64
from datetime import UTC, datetime
from statistics import median
from typing import Iterable

import cv2
import numpy as np

from models import ModelBundle


ANGLE_ORDER = ("FRONT", "LEFT", "RIGHT")


def metric(
    *,
    status: str,
    value: float | int | None,
    unit: str | None,
    confidence: float | None,
    model_version: str | None,
    message: str,
    details: dict[str, object] | None = None,
) -> dict[str, object]:
    result: dict[str, object] = {
        "status": status,
        "value": value,
        "unit": unit,
        "confidence": round(confidence, 4) if confidence is not None else None,
        "modelVersion": model_version,
        "message": message,
    }
    if details is not None:
        result["details"] = details
    return result


def unavailable(message: str, status: str = "MODEL_NOT_CONFIGURED") -> dict[str, object]:
    return metric(
        status=status,
        value=None,
        unit=None,
        confidence=None,
        model_version=None,
        message=message,
    )


def decode_image(content: bytes) -> np.ndarray:
    encoded = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    if image is None or image.ndim != 3:
        raise ValueError("Nie udało się odczytać przesłanego obrazu")
    if min(image.shape[:2]) < 256:
        raise ValueError("Obraz jest zbyt mały do analizy")
    return image


OVERLAY_COLORS = {
    "wrinkles": (147, 51, 234, 128),
    "pigmentation": (180, 120, 50, 128),
    "redness": (220, 38, 38, 128),
    "acne": (234, 179, 8, 200),
}


def encode_overlay(mask: np.ndarray, color: tuple[int, int, int, int], original_shape: tuple[int, int]) -> str:
    """Encode a boolean mask as a semi-transparent RGBA PNG, returned as base64."""
    h, w = original_shape
    if mask.shape[:2] != (h, w):
        mask_u8 = mask.astype(np.uint8) * 255
        mask_u8 = cv2.resize(mask_u8, (w, h), interpolation=cv2.INTER_NEAREST)
        mask = mask_u8 > 127

    overlay = np.zeros((h, w, 4), dtype=np.uint8)
    overlay[mask] = color

    ok, encoded = cv2.imencode(".png", overlay)
    if not ok:
        raise RuntimeError("Failed to encode overlay PNG")

    return base64.b64encode(encoded.tobytes()).decode("ascii")


def robust_threshold(values: np.ndarray, direction: str, minimum_delta: float, mad_scale: float) -> float:
    center = float(np.median(values))
    deviation = float(np.median(np.abs(values - center)))
    delta = max(minimum_delta, mad_scale * deviation)
    return center + delta if direction == "above" else center - delta


def color_indices(bgr: np.ndarray, skin_mask: np.ndarray) -> tuple[dict[str, float | int], np.ndarray, np.ndarray]:
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    pixels = lab[skin_mask]
    if len(pixels) < 5_000:
        raise ValueError("Za mało widocznej skóry do analizy koloru")

    lightness, green_red, blue_yellow = pixels[:, 0], pixels[:, 1], pixels[:, 2]
    dark_threshold = robust_threshold(lightness, "below", minimum_delta=9.0, mad_scale=1.4)
    brown_threshold = robust_threshold(blue_yellow, "above", minimum_delta=4.0, mad_scale=1.1)
    red_threshold = robust_threshold(green_red, "above", minimum_delta=5.0, mad_scale=1.25)
    pigmentation = (lightness < dark_threshold) & (blue_yellow > brown_threshold)
    redness = green_red > red_threshold

    stats = {
        "skinPixels": int(len(pixels)),
        "pigmentationCoverage": float(pigmentation.mean() * 100.0),
        "rednessCoverage": float(redness.mean() * 100.0),
    }

    pigmentation_full = np.zeros(skin_mask.shape, dtype=bool)
    redness_full = np.zeros(skin_mask.shape, dtype=bool)
    pigmentation_full[skin_mask] = pigmentation
    redness_full[skin_mask] = redness

    return stats, pigmentation_full, redness_full


def weighted_coverage(rows: Iterable[dict[str, float | int]], key: str) -> float:
    values = list(rows)
    total = sum(int(row["skinPixels"]) for row in values)
    if total == 0:
        return 0.0
    return sum(float(row[key]) * int(row["skinPixels"]) for row in values) / total


class SkinAnalyzer:
    def __init__(self, models: ModelBundle):
        self.models = models

    def analyze(self, images: dict[str, bytes]) -> dict[str, object]:
        missing = [angle for angle in ANGLE_ORDER if angle not in images]
        if missing:
            raise ValueError(f"Brakuje wymaganych ujęć: {', '.join(missing)}")

        decoded = {angle: decode_image(images[angle]) for angle in ANGLE_ORDER}
        parsed_masks = {angle: self.models.face_parser.predict(decoded[angle]) for angle in ANGLE_ORDER}
        face_masks = {angle: np.isin(parsed_masks[angle], (1, 10)) for angle in ANGLE_ORDER}
        skin_ratios = {
            angle: float(face_masks[angle].sum() / face_masks[angle].size)
            for angle in ANGLE_ORDER
        }
        usable_angles = [angle for angle in ANGLE_ORDER if skin_ratios[angle] >= 0.04]

        if not usable_angles:
            insufficient = unavailable(
                "Nie wykryto wystarczająco dużego obszaru twarzy. Powtórz zdjęcia bliżej aparatu, bez włosów na twarzy.",
                status="INSUFFICIENT_QUALITY",
            )
            return self._result(
                acne=insufficient,
                pigmentation=insufficient,
                redness=insufficient,
                wrinkles=insufficient,
                face_details={"skinRatioByAngle": skin_ratios, "usableAngles": []},
                overlays={},
            )

        color_rows: list[dict[str, float | int]] = []
        color_by_angle: dict[str, dict[str, float | int]] = {}
        pig_masks: dict[str, np.ndarray] = {}
        red_masks: dict[str, np.ndarray] = {}
        for angle in usable_angles:
            try:
                row, pig_mask, red_mask = color_indices(decoded[angle], face_masks[angle])
            except ValueError:
                continue
            color_rows.append(row)
            pig_masks[angle] = pig_mask
            red_masks[angle] = red_mask
            color_by_angle[angle] = {
                "pigmentationCoverage": round(float(row["pigmentationCoverage"]), 2),
                "rednessCoverage": round(float(row["rednessCoverage"]), 2),
            }

        acne_rows: list[dict[str, object]] = []
        for angle in usable_angles:
            prediction = self.models.acne.predict(decoded[angle])
            acne_rows.append({"angle": angle, **prediction})

        acne_probabilities = np.mean(
            np.stack([row["probabilities"] for row in acne_rows]),
            axis=0,
        )
        acne_grade = int(acne_probabilities.argmax()) + 1
        acne_confidence = float(acne_probabilities.max())
        acne_count = int(round(median(int(row["count"]) for row in acne_rows)))
        acne_by_angle = {
            str(row["angle"]): {
                "grade": int(np.asarray(row["probabilities"]).argmax()) + 1,
                "countEstimate": int(row["count"]),
            }
            for row in acne_rows
        }
        acne_metric = metric(
            status="AVAILABLE",
            value=acne_grade,
            unit="stopień 1-4",
            confidence=acne_confidence,
            model_version=self.models.versions["acne"],
            message=f"Model oszacował nasilenie zmian na stopień {acne_grade}/4 i około {acne_count} zmian w pojedynczym ujęciu.",
            details={
                "countEstimate": acne_count,
                "scale": "Hayashi",
                "probabilities": [round(float(value), 4) for value in acne_probabilities],
                "byAngle": acne_by_angle,
                "validation": "Model badawczy; wynik nie jest diagnozą.",
            },
        )

        wrinkle_angle = "FRONT" if "FRONT" in usable_angles else usable_angles[0]
        wrinkle = self.models.wrinkles.predict(decoded[wrinkle_angle], face_masks[wrinkle_angle])
        wrinkle_coverage = round(float(wrinkle["coverage"]), 2)
        wrinkle_metric = metric(
            status="AVAILABLE",
            value=wrinkle_coverage,
            unit="% obszaru skóry",
            confidence=wrinkle["confidence"],
            model_version=self.models.versions["wrinkles"],
            message=f"Model zaznaczył linie zmarszczek na {wrinkle_coverage}% analizowanego obszaru skóry.",
            details={
                "angle": wrinkle_angle,
                "wrinklePixels": wrinkle["wrinkle_pixels"],
                "skinPixels": wrinkle["skin_pixels"],
                "input": "RGB + maskowana mapa tekstury",
                "validation": "Model badawczy; porównuj tylko zdjęcia wykonane w podobnych warunkach.",
            },
        )

        if color_rows:
            pigmentation_coverage = round(weighted_coverage(color_rows, "pigmentationCoverage"), 2)
            redness_coverage = round(weighted_coverage(color_rows, "rednessCoverage"), 2)
            color_confidence = min(0.9, 0.55 + 0.1 * len(color_rows))
            pigmentation_metric = metric(
                status="AVAILABLE",
                value=pigmentation_coverage,
                unit="% obszaru skóry",
                confidence=color_confidence,
                model_version=self.models.versions["colorIndices"],
                message=f"Względnie ciemniejsze i bardziej brązowe obszary zajmują {pigmentation_coverage}% widocznej skóry.",
                details={"byAngle": color_by_angle, "method": "względny indeks koloru CIE Lab, nie klasyfikacja medyczna"},
            )
            redness_metric = metric(
                status="AVAILABLE",
                value=redness_coverage,
                unit="% obszaru skóry",
                confidence=color_confidence,
                model_version=self.models.versions["colorIndices"],
                message=f"Względnie bardziej czerwone obszary zajmują {redness_coverage}% widocznej skóry.",
                details={"byAngle": color_by_angle, "method": "względny indeks kanału a* CIE Lab, nie klasyfikacja medyczna"},
            )
        else:
            pigmentation_metric = unavailable("Za mało widocznej skóry do wyliczenia indeksu przebarwień.", "INSUFFICIENT_QUALITY")
            redness_metric = unavailable("Za mało widocznej skóry do wyliczenia indeksu zaczerwienienia.", "INSUFFICIENT_QUALITY")

        # --- Generate overlay images ---
        overlays: dict[str, dict[str, str]] = {}

        wrinkle_mask = wrinkle.get("wrinkle_mask")
        if wrinkle_mask is not None and wrinkle_coverage > 0:
            overlays["wrinkles"] = {
                wrinkle_angle: encode_overlay(
                    wrinkle_mask, OVERLAY_COLORS["wrinkles"], decoded[wrinkle_angle].shape[:2],
                ),
            }

        if color_rows:
            pig_overlays: dict[str, str] = {}
            red_overlays: dict[str, str] = {}
            for angle in pig_masks:
                shape = decoded[angle].shape[:2]
                if pig_masks[angle].any():
                    pig_overlays[angle] = encode_overlay(pig_masks[angle], OVERLAY_COLORS["pigmentation"], shape)
                if red_masks[angle].any():
                    red_overlays[angle] = encode_overlay(red_masks[angle], OVERLAY_COLORS["redness"], shape)
            if pig_overlays:
                overlays["pigmentation"] = pig_overlays
            if red_overlays:
                overlays["redness"] = red_overlays

        return self._result(
            acne=acne_metric,
            pigmentation=pigmentation_metric,
            redness=redness_metric,
            wrinkles=wrinkle_metric,
            face_details={"skinRatioByAngle": skin_ratios, "usableAngles": usable_angles},
            overlays=overlays,
        )

    def _result(
        self,
        *,
        acne: dict[str, object],
        pigmentation: dict[str, object],
        redness: dict[str, object],
        wrinkles: dict[str, object],
        face_details: dict[str, object],
        overlays: dict[str, dict[str, str]] | None = None,
    ) -> dict[str, object]:
        versions = {"captureQuality": "quality-v1", **self.models.versions}
        result: dict[str, object] = {
            "schemaVersion": "1.0",
            "mode": "COSMETOLOGY_RESEARCH",
            "generatedAt": datetime.now(UTC).isoformat(),
            "disclaimer": (
                "To jest badawcza ocena kosmetologiczna obrazu, a nie diagnoza medyczna. "
                "Wynik zależy od światła, aparatu, makijażu i ułożenia twarzy."
            ),
            "modelVersions": versions,
            "metrics": {
                "acne": acne,
                "pigmentation": pigmentation,
                "redness": redness,
                "wrinkles": wrinkles,
                "pores": unavailable("Model porów nie został jeszcze wytrenowany i zwalidowany."),
                "spfCoverage": unavailable(
                    "Pokrycia SPF nie można wiarygodnie zmierzyć zwykłą kamerą RGB. Wymagany jest tor UV.",
                    status="UNAVAILABLE_WITH_RGB",
                ),
            },
            "faceParsing": face_details,
        }
        if overlays:
            result["overlays"] = overlays
        return result

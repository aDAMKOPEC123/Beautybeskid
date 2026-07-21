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


def crop_face(bgr: np.ndarray, mask: np.ndarray, padding: float = 0.15, min_size: int = 640) -> tuple[np.ndarray, np.ndarray, tuple[int, int, int, int]]:
    """Crop image to face bounding box with padding, upscale if needed.

    Returns (cropped_bgr, cropped_mask, (y1, y2, x1, x2)) in original coords.
    """
    ys, xs = np.where(mask)
    if len(ys) == 0:
        return bgr, mask, (0, bgr.shape[0], 0, bgr.shape[1])

    h, w = bgr.shape[:2]
    y1, y2 = int(ys.min()), int(ys.max()) + 1
    x1, x2 = int(xs.min()), int(xs.max()) + 1

    pad_h = int((y2 - y1) * padding)
    pad_w = int((x2 - x1) * padding)
    y1 = max(0, y1 - pad_h)
    y2 = min(h, y2 + pad_h)
    x1 = max(0, x1 - pad_w)
    x2 = min(w, x2 + pad_w)

    cropped = bgr[y1:y2, x1:x2]
    cropped_mask = mask[y1:y2, x1:x2]

    crop_h, crop_w = cropped.shape[:2]
    if max(crop_h, crop_w) < min_size:
        scale = min_size / max(crop_h, crop_w)
        new_w, new_h = int(crop_w * scale), int(crop_h * scale)
        cropped = cv2.resize(cropped, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        cropped_mask = cv2.resize(cropped_mask.astype(np.uint8), (new_w, new_h), interpolation=cv2.INTER_NEAREST).astype(bool)

    return cropped, cropped_mask, (y1, y2, x1, x2)


# BiSeNet CelebAMask-HQ class IDs
_SKIN = 1
_L_BROW = 2
_R_BROW = 3
_L_EYE = 4
_R_EYE = 5
_NOSE = 10
_U_LIP = 11
_L_LIP = 13

# Zone definitions: map anatomical zones from face parsing mask
FACE_ZONES = {
    "forehead": "Czoło",
    "left_cheek": "Lewy policzek",
    "right_cheek": "Prawy policzek",
    "nose": "Nos",
    "chin": "Broda",
    "perioral": "Okolice ust",
}


def build_zone_masks(parsed: np.ndarray, skin_mask: np.ndarray) -> dict[str, np.ndarray]:
    """Split face into anatomical zones using the BiSeNet segmentation map.

    Uses spatial relationships between facial landmarks (brows, eyes, nose, lips)
    to define zones on the skin mask.
    """
    h, w = parsed.shape[:2]
    zones: dict[str, np.ndarray] = {}

    brow_mask = np.isin(parsed, (_L_BROW, _R_BROW))
    eye_mask = np.isin(parsed, (_L_EYE, _R_EYE))
    nose_mask = parsed == _NOSE
    lip_mask = np.isin(parsed, (_U_LIP, _L_LIP))

    # Find vertical reference lines from facial features
    brow_ys = np.where(brow_mask.any(axis=1))[0]
    eye_ys = np.where(eye_mask.any(axis=1))[0]
    nose_ys = np.where(nose_mask.any(axis=1))[0]
    lip_ys = np.where(lip_mask.any(axis=1))[0]

    # Default boundaries (fractions of face height if features not found)
    face_ys = np.where(skin_mask.any(axis=1))[0]
    if len(face_ys) == 0:
        return {}
    face_top, face_bot = int(face_ys.min()), int(face_ys.max())
    face_h = face_bot - face_top

    brow_top = int(brow_ys.min()) if len(brow_ys) else face_top + face_h // 5
    eye_bot = int(eye_ys.max()) if len(eye_ys) else face_top + face_h * 2 // 5
    nose_bot = int(nose_ys.max()) if len(nose_ys) else face_top + face_h * 3 // 5
    lip_top = int(lip_ys.min()) if len(lip_ys) else face_top + face_h * 3 // 4

    # Midline from nose center
    nose_xs = np.where(nose_mask.any(axis=0))[0]
    mid_x = int(nose_xs.mean()) if len(nose_xs) else w // 2

    # Forehead: skin above brows
    forehead = skin_mask.copy()
    forehead[brow_top:, :] = False
    zones["forehead"] = forehead

    # Cheeks: skin between eye bottom and nose bottom, left/right of nose
    cheek_region = skin_mask.copy()
    cheek_region[:eye_bot, :] = False
    cheek_region[nose_bot:, :] = False
    cheek_region &= ~nose_mask  # exclude nose itself

    left_cheek = cheek_region.copy()
    left_cheek[:, mid_x:] = False
    zones["left_cheek"] = left_cheek

    right_cheek = cheek_region.copy()
    right_cheek[:, :mid_x] = False
    zones["right_cheek"] = right_cheek

    # Nose: use parsed nose mask intersected with skin
    zones["nose"] = nose_mask & skin_mask

    # Perioral: skin around lips
    perioral = skin_mask.copy()
    perioral[:nose_bot, :] = False
    perioral[face_bot:, :] = False
    lip_xs = np.where(lip_mask.any(axis=0))[0]
    if len(lip_xs) >= 2:
        lip_left = max(0, int(lip_xs.min()) - face_h // 8)
        lip_right = min(w, int(lip_xs.max()) + face_h // 8)
        perioral[:, :lip_left] = False
        perioral[:, lip_right:] = False
    perioral &= ~lip_mask
    zones["perioral"] = perioral

    # Chin: skin below lips
    chin = skin_mask.copy()
    chin[:lip_top, :] = False
    chin &= ~lip_mask
    zones["chin"] = chin

    # Filter out zones with too few pixels
    min_pixels = 500
    return {name: mask for name, mask in zones.items() if mask.sum() >= min_pixels}


ZONE_COLORS_BGR = {
    "forehead": (237, 58, 124),    # purple
    "left_cheek": (235, 99, 37),   # blue
    "right_cheek": (178, 145, 8),  # teal
    "nose": (105, 150, 5),         # green
    "perioral": (6, 119, 217),     # orange
    "chin": (38, 38, 220),         # red
}


def render_zone_grid(bgr: np.ndarray, zone_masks: dict[str, np.ndarray], zone_labels: dict[str, str]) -> np.ndarray:
    """Draw a colored zone grid overlay on the face image as RGBA PNG."""
    h, w = bgr.shape[:2]
    overlay = np.zeros((h, w, 4), dtype=np.uint8)

    for zone_name, mask in zone_masks.items():
        if zone_name not in ZONE_COLORS_BGR:
            continue
        b, g, r = ZONE_COLORS_BGR[zone_name]

        # Semi-transparent fill
        overlay[mask] = (r, g, b, 45)

        # Draw contour border
        mask_u8 = mask.astype(np.uint8) * 255
        contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        thickness = max(2, min(h, w) // 250)
        for cnt in contours:
            pts = cnt.reshape(-1, 2)
            for i in range(len(pts)):
                p1 = tuple(pts[i])
                p2 = tuple(pts[(i + 1) % len(pts)])
                cv2.line(overlay, p1, p2, (r, g, b, 200), thickness)

        # Add zone label
        label = zone_labels.get(zone_name, zone_name)
        ys, xs = np.where(mask)
        if len(ys) > 0:
            cy, cx = int(ys.mean()), int(xs.mean())
            font_scale = max(0.4, min(h, w) / 1200)
            font_thickness = max(1, int(font_scale * 2))
            text_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness)[0]
            tx = cx - text_size[0] // 2
            ty = cy + text_size[1] // 2
            # Background for text
            pad = 4
            cv2.rectangle(overlay,
                          (tx - pad, ty - text_size[1] - pad),
                          (tx + text_size[0] + pad, ty + pad),
                          (0, 0, 0, 160), -1)
            cv2.putText(overlay, label, (tx, ty),
                        cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255, 255), font_thickness)

    return overlay


def extract_zone_closeup(bgr: np.ndarray, mask: np.ndarray, target_size: int = 256) -> str | None:
    """Crop the bounding box of a zone mask, resize to target, encode as base64 JPEG."""
    ys, xs = np.where(mask)
    if len(ys) < 100:
        return None
    y1, y2 = int(ys.min()), int(ys.max()) + 1
    x1, x2 = int(xs.min()), int(xs.max()) + 1
    # Add small padding
    h, w = bgr.shape[:2]
    pad = max(5, (y2 - y1) // 10)
    y1 = max(0, y1 - pad)
    y2 = min(h, y2 + pad)
    x1 = max(0, x1 - pad)
    x2 = min(w, x2 + pad)

    crop = bgr[y1:y2, x1:x2]
    # Resize keeping aspect ratio
    ch, cw = crop.shape[:2]
    scale = target_size / max(ch, cw)
    new_w, new_h = int(cw * scale), int(ch * scale)
    resized = cv2.resize(crop, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    ok, encoded = cv2.imencode(".jpg", resized, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ok:
        return None
    return base64.b64encode(encoded.tobytes()).decode("ascii")


def detect_color_anomalies(
    bgr: np.ndarray,
    skin_mask: np.ndarray,
    min_area: int = 30,
    max_detections: int = 30,
) -> list[dict[str, object]]:
    """Detect red/dark spots on skin using color analysis in LAB space.

    Returns list of detections with x, y, width, height, confidence, type.
    Works without ML — purely color-based on preprocessed images.
    """
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    l_ch, a_ch, b_ch = lab[:, :, 0], lab[:, :, 1], lab[:, :, 2]

    skin_pixels_l = l_ch[skin_mask]
    skin_pixels_a = a_ch[skin_mask]

    if len(skin_pixels_l) < 1000:
        return []

    # Red spots: high a* channel (red-green axis) relative to skin median
    a_median = float(np.median(skin_pixels_a))
    a_mad = float(np.median(np.abs(skin_pixels_a - a_median)))
    red_threshold = a_median + max(4.0, a_mad * 1.8)
    red_mask = (a_ch > red_threshold) & skin_mask

    # Dark spots: low L channel relative to skin median
    l_median = float(np.median(skin_pixels_l))
    l_mad = float(np.median(np.abs(skin_pixels_l - l_median)))
    dark_threshold = l_median - max(8.0, l_mad * 1.6)
    dark_mask = (l_ch < dark_threshold) & (b_ch > float(np.median(b_ch[skin_mask]))) & skin_mask

    detections: list[dict[str, object]] = []

    for anomaly_type, mask in [("redness", red_mask), ("dark_spot", dark_mask)]:
        mask_u8 = mask.astype(np.uint8) * 255
        # Morphological close to merge nearby spots
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask_u8 = cv2.morphologyEx(mask_u8, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < min_area:
                continue
            x, y, w, h = cv2.boundingRect(cnt)
            # Confidence based on color deviation intensity
            roi_mask = mask[y : y + h, x : x + w]
            if anomaly_type == "redness":
                roi_vals = a_ch[y : y + h, x : x + w][roi_mask]
                deviation = float(roi_vals.mean()) - a_median if len(roi_vals) else 0
                conf = min(0.95, 0.3 + deviation / 20.0)
            else:
                roi_vals = l_ch[y : y + h, x : x + w][roi_mask]
                deviation = l_median - float(roi_vals.mean()) if len(roi_vals) else 0
                conf = min(0.95, 0.3 + deviation / 30.0)
            conf = max(0.1, conf)
            detections.append({
                "x": int(x), "y": int(y), "width": int(w), "height": int(h),
                "confidence": round(conf, 3),
                "class": anomaly_type,
            })

    # Sort by confidence, limit count
    detections.sort(key=lambda d: float(d["confidence"]), reverse=True)
    return detections[:max_detections]


def render_anomaly_overlay(
    detections: list[dict[str, object]], shape: tuple[int, int],
) -> np.ndarray:
    """Draw colored circles/ellipses for detected color anomalies on RGBA."""
    h, w = shape
    overlay = np.zeros((h, w, 4), dtype=np.uint8)

    for det in detections:
        x, y, bw, bh = int(det["x"]), int(det["y"]), int(det["width"]), int(det["height"])
        cx, cy = x + bw // 2, y + bh // 2
        rx, ry = max(bw // 2, 3), max(bh // 2, 3)

        if det["class"] == "redness":
            color = (220, 60, 60, 140)
            border = (255, 80, 80, 220)
        else:
            color = (160, 100, 40, 120)
            border = (200, 130, 60, 200)

        # Semi-transparent fill ellipse
        cv2.ellipse(overlay, (cx, cy), (rx, ry), 0, 0, 360, color, -1)
        # Border
        thickness = max(1, min(h, w) // 300)
        cv2.ellipse(overlay, (cx, cy), (rx, ry), 0, 0, 360, border, thickness)

    return overlay


def preprocess_skin(bgr: np.ndarray, skin_mask: np.ndarray) -> np.ndarray:
    """Enhance skin details using CLAHE on L-channel and a* channel boost.

    Improves visibility of subtle redness, pigmentation and texture changes
    that are hard to see in raw selfie photos.
    Returns a preprocessed BGR image (same shape).
    """
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)

    # CLAHE on L-channel — adaptive contrast to reveal texture/pigmentation
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])

    # Boost a* channel (green-red axis) within skin region to amplify redness
    a_channel = lab[:, :, 1].astype(np.float32)
    skin_mean = float(a_channel[skin_mask].mean()) if skin_mask.any() else 128.0
    # Amplify deviation from mean by 1.4x — makes red spots stand out
    a_enhanced = skin_mean + (a_channel - skin_mean) * 1.4
    a_enhanced = np.clip(a_enhanced, 0, 255).astype(np.uint8)
    # Only apply enhancement within skin mask to avoid background artifacts
    lab[:, :, 1] = np.where(skin_mask, a_enhanced, lab[:, :, 1])

    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


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

        # Crop face regions for better detail in analysis
        cropped = {}
        cropped_masks = {}
        crop_boxes = {}
        for angle in usable_angles:
            c_img, c_mask, c_box = crop_face(decoded[angle], face_masks[angle])
            cropped[angle] = c_img
            cropped_masks[angle] = c_mask
            crop_boxes[angle] = c_box

        # Preprocess cropped images for better color change visibility
        preprocessed = {}
        for angle in usable_angles:
            preprocessed[angle] = preprocess_skin(cropped[angle], cropped_masks[angle])

        color_rows: list[dict[str, float | int]] = []
        color_by_angle: dict[str, dict[str, float | int]] = {}
        pig_masks: dict[str, np.ndarray] = {}
        red_masks: dict[str, np.ndarray] = {}
        for angle in usable_angles:
            try:
                row, pig_mask, red_mask = color_indices(preprocessed[angle], cropped_masks[angle])
            except ValueError:
                continue
            color_rows.append(row)
            # Map cropped masks back to original image size for overlay
            full_pig = np.zeros(face_masks[angle].shape, dtype=bool)
            full_red = np.zeros(face_masks[angle].shape, dtype=bool)
            y1, y2, x1, x2 = crop_boxes[angle]
            pig_resized = cv2.resize(pig_mask.astype(np.uint8), (x2 - x1, y2 - y1), interpolation=cv2.INTER_NEAREST).astype(bool)
            red_resized = cv2.resize(red_mask.astype(np.uint8), (x2 - x1, y2 - y1), interpolation=cv2.INTER_NEAREST).astype(bool)
            full_pig[y1:y2, x1:x2] = pig_resized
            full_red[y1:y2, x1:x2] = red_resized
            pig_masks[angle] = full_pig
            red_masks[angle] = full_red
            color_by_angle[angle] = {
                "pigmentationCoverage": round(float(row["pigmentationCoverage"]), 2),
                "rednessCoverage": round(float(row["rednessCoverage"]), 2),
            }

        acne_rows: list[dict[str, object]] = []
        for angle in usable_angles:
            prediction = self.models.acne.predict(preprocessed[angle])
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
        wrinkle = self.models.wrinkles.predict(cropped[wrinkle_angle], cropped_masks[wrinkle_angle])
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

        # --- Zone-based analysis (FRONT angle only) ---
        zone_results: dict[str, dict[str, object]] = {}
        front_angle = "FRONT" if "FRONT" in usable_angles else usable_angles[0]
        # Build zones on the cropped/preprocessed FRONT image
        # We need the parsed mask for the cropped region
        y1z, y2z, x1z, x2z = crop_boxes[front_angle]
        cropped_parsed = parsed_masks[front_angle][y1z:y2z, x1z:x2z]
        crop_h_z, crop_w_z = cropped[front_angle].shape[:2]
        orig_crop_h_z, orig_crop_w_z = y2z - y1z, x2z - x1z
        if (crop_h_z, crop_w_z) != (orig_crop_h_z, orig_crop_w_z):
            cropped_parsed = cv2.resize(cropped_parsed, (crop_w_z, crop_h_z), interpolation=cv2.INTER_NEAREST)

        zone_masks = build_zone_masks(cropped_parsed, cropped_masks[front_angle])
        for zone_name, zone_mask in zone_masks.items():
            try:
                zone_color, zone_pig, zone_red = color_indices(preprocessed[front_angle], zone_mask)
            except ValueError:
                continue
            # Generate closeup from preprocessed image
            closeup_b64 = extract_zone_closeup(preprocessed[front_angle], zone_mask)
            zone_entry: dict[str, object] = {
                "label": FACE_ZONES[zone_name],
                "skinPixels": zone_color["skinPixels"],
                "pigmentationCoverage": round(float(zone_color["pigmentationCoverage"]), 2),
                "rednessCoverage": round(float(zone_color["rednessCoverage"]), 2),
            }
            if closeup_b64:
                zone_entry["closeup"] = closeup_b64
            zone_results[zone_name] = zone_entry

        # Generate zone grid overlay for FRONT angle
        zone_grid_b64: str | None = None
        if zone_masks:
            # Map zone masks from cropped coords back to original image coords
            orig_shape = decoded[front_angle].shape[:2]
            full_zone_masks: dict[str, np.ndarray] = {}
            for zname, zmask in zone_masks.items():
                full_z = np.zeros(orig_shape, dtype=bool)
                z_resized = cv2.resize(zmask.astype(np.uint8), (x2z - x1z, y2z - y1z),
                                       interpolation=cv2.INTER_NEAREST).astype(bool)
                full_z[y1z:y2z, x1z:x2z] = z_resized
                full_zone_masks[zname] = full_z

            grid_overlay = render_zone_grid(decoded[front_angle], full_zone_masks, FACE_ZONES)
            ok, enc = cv2.imencode(".png", grid_overlay)
            if ok:
                zone_grid_b64 = base64.b64encode(enc.tobytes()).decode("ascii")

        # --- Acne lesion detection (YOLOv8-nano, optional) ---
        acne_detections_by_angle: dict[str, list[dict[str, object]]] = {}
        if self.models.acne_detector.available:
            for angle in usable_angles:
                dets = self.models.acne_detector.predict(preprocessed[angle])
                if dets:
                    # Map detection coords back to original image
                    y1, y2, x1, x2 = crop_boxes[angle]
                    crop_h, crop_w = cropped[angle].shape[:2]
                    orig_crop_w, orig_crop_h = x2 - x1, y2 - y1
                    sx = orig_crop_w / crop_w
                    sy = orig_crop_h / crop_h
                    for d in dets:
                        d["x"] = int(round(d["x"] * sx)) + x1
                        d["y"] = int(round(d["y"] * sy)) + y1
                        d["width"] = int(round(d["width"] * sx))
                        d["height"] = int(round(d["height"] * sy))
                    acne_detections_by_angle[angle] = dets
            if acne_detections_by_angle:
                total_dets = sum(len(d) for d in acne_detections_by_angle.values())
                acne_metric["details"]["detectedLesions"] = total_dets
                acne_metric["details"]["detectionsByAngle"] = {
                    angle: [
                        {"x": d["x"], "y": d["y"], "w": d["width"], "h": d["height"], "conf": d["confidence"]}
                        for d in dets
                    ]
                    for angle, dets in acne_detections_by_angle.items()
                }
                acne_metric["details"]["detectorVersion"] = self.models.versions.get("acneDetector", "unknown")

        # --- Color-based anomaly detection (fallback/supplement to YOLO) ---
        anomaly_detections_by_angle: dict[str, list[dict[str, object]]] = {}
        for angle in usable_angles:
            anomalies = detect_color_anomalies(preprocessed[angle], cropped_masks[angle])
            if anomalies:
                y1, y2, x1, x2 = crop_boxes[angle]
                crop_h, crop_w = cropped[angle].shape[:2]
                orig_crop_w, orig_crop_h = x2 - x1, y2 - y1
                sx = orig_crop_w / crop_w
                sy = orig_crop_h / crop_h
                for d in anomalies:
                    d["x"] = int(round(int(d["x"]) * sx)) + x1
                    d["y"] = int(round(int(d["y"]) * sy)) + y1
                    d["width"] = int(round(int(d["width"]) * sx))
                    d["height"] = int(round(int(d["height"]) * sy))
                anomaly_detections_by_angle[angle] = anomalies

        # --- Generate overlay images ---
        overlays: dict[str, dict[str, str]] = {}

        wrinkle_mask = wrinkle.get("wrinkle_mask")
        if wrinkle_mask is not None and wrinkle_coverage > 0:
            # Map wrinkle mask from cropped back to original image coords
            orig_shape = decoded[wrinkle_angle].shape[:2]
            full_wrinkle = np.zeros(orig_shape, dtype=bool)
            y1, y2, x1, x2 = crop_boxes[wrinkle_angle]
            wr_resized = cv2.resize(wrinkle_mask.astype(np.uint8), (x2 - x1, y2 - y1), interpolation=cv2.INTER_NEAREST).astype(bool)
            full_wrinkle[y1:y2, x1:x2] = wr_resized
            overlays["wrinkles"] = {
                wrinkle_angle: encode_overlay(
                    full_wrinkle, OVERLAY_COLORS["wrinkles"], orig_shape,
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

        # Acne detection overlay (bbox)
        if acne_detections_by_angle:
            acne_overlays: dict[str, str] = {}
            for angle, dets in acne_detections_by_angle.items():
                shape = decoded[angle].shape[:2]
                overlay_img = self.models.acne_detector.render_overlay(dets, shape)
                ok, encoded = cv2.imencode(".png", overlay_img)
                if ok:
                    acne_overlays[angle] = base64.b64encode(encoded.tobytes()).decode("ascii")
            if acne_overlays:
                overlays["acne"] = acne_overlays

        # Color anomaly overlay (supplements YOLO with color-based detection)
        if anomaly_detections_by_angle:
            anomaly_overlays: dict[str, str] = {}
            total_anomalies = 0
            for angle, dets in anomaly_detections_by_angle.items():
                shape = decoded[angle].shape[:2]
                overlay_img = render_anomaly_overlay(dets, shape)
                ok, encoded = cv2.imencode(".png", overlay_img)
                if ok:
                    anomaly_overlays[angle] = base64.b64encode(encoded.tobytes()).decode("ascii")
                total_anomalies += len(dets)
            if anomaly_overlays:
                overlays["skinChanges"] = anomaly_overlays
            # Add anomaly count to acne details
            acne_metric["details"]["colorAnomalies"] = total_anomalies
            acne_metric["details"]["anomaliesByAngle"] = {
                angle: len(dets) for angle, dets in anomaly_detections_by_angle.items()
            }

        # Zone grid overlay
        if zone_grid_b64:
            overlays["zoneGrid"] = {front_angle: zone_grid_b64}

        face_details: dict[str, object] = {
            "skinRatioByAngle": skin_ratios,
            "usableAngles": usable_angles,
        }
        if zone_results:
            face_details["zones"] = zone_results

        return self._result(
            acne=acne_metric,
            pigmentation=pigmentation_metric,
            redness=redness_metric,
            wrinkles=wrinkle_metric,
            face_details=face_details,
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

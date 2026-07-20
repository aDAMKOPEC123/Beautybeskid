from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np


SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

import base64

from analysis import color_indices, encode_overlay, robust_threshold, weighted_coverage  # noqa: E402


def test_robust_threshold_uses_minimum_delta_for_flat_values():
    values = np.full(100, 128, dtype=np.float32)
    assert robust_threshold(values, "above", 5, 1.25) == 133
    assert robust_threshold(values, "below", 9, 1.4) == 119


def test_color_indices_measure_only_the_face_mask():
    image = np.full((100, 100, 3), 160, dtype=np.uint8)
    image[20:30, 20:30] = (60, 60, 115)
    skin_mask = np.zeros((100, 100), dtype=bool)
    skin_mask[10:90, 10:90] = True
    stats, pig_mask, red_mask = color_indices(image, skin_mask)
    assert stats["skinPixels"] == 6_400
    assert 0 <= float(stats["pigmentationCoverage"]) <= 100
    assert 0 <= float(stats["rednessCoverage"]) <= 100
    assert pig_mask.dtype == bool
    assert red_mask.dtype == bool
    assert pig_mask.shape == (100, 100)


def test_weighted_coverage_accounts_for_skin_area():
    rows = [
        {"skinPixels": 100, "coverage": 10.0},
        {"skinPixels": 300, "coverage": 30.0},
    ]
    assert weighted_coverage(rows, "coverage") == 25.0


def test_encode_overlay_produces_valid_png_with_correct_dimensions():
    mask = np.zeros((64, 64), dtype=bool)
    mask[10:30, 10:30] = True
    color = (147, 51, 234, 128)
    original_shape = (480, 640)
    result = encode_overlay(mask, color, original_shape)
    decoded = base64.b64decode(result)
    assert decoded[:4] == b'\x89PNG'
    arr = np.frombuffer(decoded, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    assert img.shape == (480, 640, 4)
    assert img[0, 0, 3] == 0


def test_encode_overlay_empty_mask_produces_fully_transparent():
    mask = np.zeros((32, 32), dtype=bool)
    color = (220, 38, 38, 128)
    result = encode_overlay(mask, color, (100, 100))
    decoded = base64.b64decode(result)
    arr = np.frombuffer(decoded, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    assert img[:, :, 3].sum() == 0


def test_decode_compatible_jpeg_fixture():
    image = np.full((300, 300, 3), 127, dtype=np.uint8)
    ok, encoded = cv2.imencode(".jpg", image)
    assert ok
    assert len(encoded.tobytes()) > 0

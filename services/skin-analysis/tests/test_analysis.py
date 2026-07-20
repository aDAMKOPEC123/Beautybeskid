from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np


SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from analysis import color_indices, robust_threshold, weighted_coverage  # noqa: E402


def test_robust_threshold_uses_minimum_delta_for_flat_values():
    values = np.full(100, 128, dtype=np.float32)
    assert robust_threshold(values, "above", 5, 1.25) == 133
    assert robust_threshold(values, "below", 9, 1.4) == 119


def test_color_indices_measure_only_the_face_mask():
    image = np.full((100, 100, 3), 160, dtype=np.uint8)
    image[20:30, 20:30] = (60, 60, 115)
    skin_mask = np.zeros((100, 100), dtype=bool)
    skin_mask[10:90, 10:90] = True
    result = color_indices(image, skin_mask)
    assert result["skinPixels"] == 6_400
    assert 0 <= float(result["pigmentationCoverage"]) <= 100
    assert 0 <= float(result["rednessCoverage"]) <= 100


def test_weighted_coverage_accounts_for_skin_area():
    rows = [
        {"skinPixels": 100, "coverage": 10.0},
        {"skinPixels": 300, "coverage": 30.0},
    ]
    assert weighted_coverage(rows, "coverage") == 25.0


def test_decode_compatible_jpeg_fixture():
    image = np.full((300, 300, 3), 127, dtype=np.uint8)
    ok, encoded = cv2.imencode(".jpg", image)
    assert ok
    assert len(encoded.tobytes()) > 0

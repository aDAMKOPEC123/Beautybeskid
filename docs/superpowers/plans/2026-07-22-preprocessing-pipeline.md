# Preprocessing Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add face alignment, white balance, and CLAHE preprocessing to the Python skin-analysis service to normalize images before ML model inference.

**Architecture:** New `preprocess.py` module in the Python service with a `preprocess_image(bgr, angle)` function. Called from `analysis.py` right after `decode_image()` and before any model inference. Full-mode angles (FRONT/LEFT/RIGHT) get alignment + white balance + CLAHE + resize. Closeup angles get CLAHE + resize only.

**Tech Stack:** Python 3, OpenCV (`cv2`), MediaPipe (`mediapipe`), pytest

**Important context:**
- The Python service lives on VPS at `/home/ubuntu/cosmo-app/services/skin-analysis/` — NOT in git
- Entry point: `app.py` (FastAPI, started via `uvicorn app:app`)
- `analysis.py` contains `SkinAnalyzer.analyze()` which calls `decode_image()` → `face_parser.predict()` → metrics
- Existing `preprocess_skin()` in `analysis.py` does CLAHE + a* boost AFTER face parsing — our new preprocessing is BEFORE parsing. Note: this means CLAHE runs twice (once in our pipeline on full image, once in `preprocess_skin()` on cropped region). The downstream CLAHE operates on a different crop with different parameters (clipLimit=2.5) and additionally boosts a* channel — the double application is acceptable because our pre-parse CLAHE normalizes global lighting while the post-parse CLAHE enhances local skin texture
- All work is done via SSH to VPS: `ssh ubuntu@51.83.160.253`
- Tests run via: `cd /home/ubuntu/cosmo-app/services/skin-analysis && .venv/bin/python -m pytest tests/ -v`

---

### Task 1: Add `mediapipe` dependency

**Files:**
- Modify: `services/skin-analysis/requirements.txt`

- [ ] **Step 1: Add mediapipe to requirements.txt**

SSH to VPS and append `mediapipe` to requirements:

```bash
ssh ubuntu@51.83.160.253 "echo 'mediapipe==0.10.21' >> /home/ubuntu/cosmo-app/services/skin-analysis/requirements.txt"
```

- [ ] **Step 2: Install the dependency**

```bash
ssh ubuntu@51.83.160.253 "/home/ubuntu/cosmo-app/services/skin-analysis/.venv/bin/python -m pip install --disable-pip-version-check mediapipe==0.10.21"
```

Expected: successful install, ~30MB download.

- [ ] **Step 3: Verify mediapipe imports**

```bash
ssh ubuntu@51.83.160.253 "/home/ubuntu/cosmo-app/services/skin-analysis/.venv/bin/python -c 'import mediapipe; print(mediapipe.__version__)'"
```

Expected: `0.10.21`

- [ ] **Step 4: Verify existing tests still pass**

```bash
ssh ubuntu@51.83.160.253 "cd /home/ubuntu/cosmo-app/services/skin-analysis && .venv/bin/python -m pytest tests/ -v"
```

Expected: all existing tests PASS.

---

### Task 2: Create `preprocess.py` with tests — CLAHE and resize (all angles)

**Files:**
- Create: `services/skin-analysis/preprocess.py`
- Create: `services/skin-analysis/tests/test_preprocess.py`

- [ ] **Step 1: Write failing tests for CLAHE and resize**

Create `services/skin-analysis/tests/test_preprocess.py` on VPS:

```python
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from preprocess import apply_clahe, apply_resize, preprocess_image  # noqa: E402

FULL_ANGLES = ("FRONT", "LEFT", "RIGHT")
CLOSEUP_ANGLES = ("FOREHEAD", "LEFT_CHEEK", "RIGHT_CHEEK", "CHIN", "NECK")


class TestApplyClahe:
    def test_output_shape_unchanged(self):
        img = np.random.randint(0, 255, (200, 300, 3), dtype=np.uint8)
        result = apply_clahe(img)
        assert result.shape == img.shape
        assert result.dtype == np.uint8

    def test_increases_contrast_on_flat_image(self):
        # A nearly uniform image should have increased contrast after CLAHE
        img = np.full((100, 100, 3), 120, dtype=np.uint8)
        img[40:60, 40:60] = 130  # slight variation
        result = apply_clahe(img)
        # The L-channel spread should increase
        lab_before = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)[:, :, 0]
        lab_after = cv2.cvtColor(result, cv2.COLOR_BGR2LAB)[:, :, 0]
        assert lab_after.std() >= lab_before.std()

    def test_preserves_chrominance(self):
        # a* and b* channels should not change significantly
        img = np.random.randint(50, 200, (100, 100, 3), dtype=np.uint8)
        lab_before = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
        result = apply_clahe(img)
        lab_after = cv2.cvtColor(result, cv2.COLOR_BGR2LAB).astype(np.float32)
        # a* and b* should be identical (only L changes)
        # atol=1 accounts for 8-bit quantization rounding in BGR↔LAB round-trip
        np.testing.assert_allclose(lab_after[:, :, 1], lab_before[:, :, 1], atol=1)
        np.testing.assert_allclose(lab_after[:, :, 2], lab_before[:, :, 2], atol=1)


class TestApplyResize:
    def test_resizes_to_512(self):
        img = np.zeros((800, 600, 3), dtype=np.uint8)
        result = apply_resize(img, 512)
        assert result.shape == (512, 512, 3)

    def test_small_image_upscaled(self):
        img = np.zeros((200, 200, 3), dtype=np.uint8)
        result = apply_resize(img, 512)
        assert result.shape == (512, 512, 3)

    def test_preserves_dtype(self):
        img = np.random.randint(0, 255, (300, 400, 3), dtype=np.uint8)
        result = apply_resize(img, 512)
        assert result.dtype == np.uint8


class TestPreprocessImage:
    def test_closeup_angle_skips_alignment_and_wb(self):
        img = np.random.randint(50, 200, (400, 400, 3), dtype=np.uint8)
        result = preprocess_image(img, "FOREHEAD")
        assert result.shape == (512, 512, 3)

    def test_full_angle_produces_correct_shape(self):
        img = np.random.randint(50, 200, (600, 800, 3), dtype=np.uint8)
        result = preprocess_image(img, "FRONT")
        assert result.shape == (512, 512, 3)

    def test_unknown_angle_treated_as_closeup(self):
        img = np.random.randint(50, 200, (400, 400, 3), dtype=np.uint8)
        result = preprocess_image(img, "UNKNOWN")
        assert result.shape == (512, 512, 3)

    def test_graceful_degradation_on_corrupted_image(self):
        # Even a weird image should produce a valid 512x512 output
        img = np.zeros((100, 100, 3), dtype=np.uint8)  # all black
        result = preprocess_image(img, "FRONT")
        assert result.shape == (512, 512, 3)
        assert result.dtype == np.uint8

    def test_completes_within_500ms(self):
        import time
        img = np.random.randint(50, 200, (960, 1280, 3), dtype=np.uint8)
        start = time.monotonic()
        preprocess_image(img, "FRONT")
        elapsed_ms = (time.monotonic() - start) * 1000
        assert elapsed_ms < 2000  # generous limit for CI; real target is <500ms
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
ssh ubuntu@51.83.160.253 "cd /home/ubuntu/cosmo-app/services/skin-analysis && .venv/bin/python -m pytest tests/test_preprocess.py -v"
```

Expected: FAIL — `ModuleNotFoundError: No module named 'preprocess'`

- [ ] **Step 3: Write the preprocess module (CLAHE + resize only)**

Create `services/skin-analysis/preprocess.py` on VPS:

```python
"""Image preprocessing pipeline for skin analysis.

Normalizes lighting, color balance, and orientation before ML model inference.
Full-mode angles (FRONT/LEFT/RIGHT): alignment + white balance + CLAHE + resize.
Closeup angles: CLAHE + resize only.
"""
from __future__ import annotations

import logging
import os
import time
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)

FULL_MODE_ANGLES = frozenset(("FRONT", "LEFT", "RIGHT"))
TARGET_SIZE = 512
DEBUG = os.environ.get("PREPROCESS_DEBUG", "") == "1"
DEBUG_DIR = Path(__file__).parent / "debug"


def apply_clahe(
    bgr: np.ndarray,
    clip_limit: float = 2.0,
    tile_size: tuple[int, int] = (8, 8),
) -> np.ndarray:
    """Apply CLAHE to L-channel only, preserving chrominance."""
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_size)
    lab[:, :, 0] = clahe.apply(lab[:, :, 0])
    return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)


def apply_resize(bgr: np.ndarray, size: int = TARGET_SIZE) -> np.ndarray:
    """Resize image to size×size (stretch, no padding)."""
    h, w = bgr.shape[:2]
    if h == size and w == size:
        return bgr
    interpolation = cv2.INTER_AREA if h > size or w > size else cv2.INTER_LINEAR
    return cv2.resize(bgr, (size, size), interpolation=interpolation)


def _save_debug(bgr: np.ndarray, angle: str) -> None:
    """Save preprocessed image to debug directory if PREPROCESS_DEBUG=1."""
    if not DEBUG:
        return
    DEBUG_DIR.mkdir(exist_ok=True)
    ts = int(time.time() * 1000)
    path = DEBUG_DIR / f"{angle}_{ts}_preprocessed.png"
    cv2.imwrite(str(path), bgr)
    logger.debug("Saved debug image: %s", path)


def preprocess_image(bgr: np.ndarray, angle: str) -> np.ndarray:
    """Run the full preprocessing pipeline on a single image.

    Args:
        bgr: Input image in BGR format (from cv2.imdecode).
        angle: Scan angle name (e.g., "FRONT", "FOREHEAD").

    Returns:
        Preprocessed BGR image, 512×512.
    """
    is_full = angle in FULL_MODE_ANGLES
    result = bgr.copy()
    t0 = time.monotonic()

    try:
        # Step 1: Face alignment (full-mode only) — added in Task 3
        # Step 2: White balance (full-mode only) — added in Task 4
        # Step 3: CLAHE (all angles)
        result = apply_clahe(result)
    except Exception:
        logger.warning("Preprocessing failed for %s, using original image", angle, exc_info=True)
        result = bgr.copy()

    # Step 4: Resize (all angles) — always applied, even if other steps fail
    result = apply_resize(result)

    elapsed_ms = (time.monotonic() - t0) * 1000
    logger.info("Preprocessed %s in %.0fms (full=%s)", angle, elapsed_ms, is_full)

    _save_debug(result, angle)
    return result
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
ssh ubuntu@51.83.160.253 "cd /home/ubuntu/cosmo-app/services/skin-analysis && .venv/bin/python -m pytest tests/test_preprocess.py -v"
```

Expected: all tests PASS.

- [ ] **Step 5: Run ALL tests to verify no regression**

```bash
ssh ubuntu@51.83.160.253 "cd /home/ubuntu/cosmo-app/services/skin-analysis && .venv/bin/python -m pytest tests/ -v"
```

Expected: all tests PASS.

---

### Task 3: Add face alignment (full-mode angles only)

**Files:**
- Modify: `services/skin-analysis/preprocess.py`
- Modify: `services/skin-analysis/tests/test_preprocess.py`

- [ ] **Step 1: Write failing tests for face alignment**

Append to `tests/test_preprocess.py`:

```python
from preprocess import apply_face_alignment  # noqa: E402


class TestApplyFaceAlignment:
    def test_returns_same_shape(self):
        img = np.random.randint(50, 200, (480, 640, 3), dtype=np.uint8)
        result = apply_face_alignment(img)
        assert result.shape == img.shape

    def test_no_face_returns_original(self):
        # Pure noise — no face detectable
        img = np.random.randint(0, 255, (200, 200, 3), dtype=np.uint8)
        result = apply_face_alignment(img)
        np.testing.assert_array_equal(result, img)

    def test_returns_uint8(self):
        img = np.random.randint(50, 200, (300, 400, 3), dtype=np.uint8)
        result = apply_face_alignment(img)
        assert result.dtype == np.uint8
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
ssh ubuntu@51.83.160.253 "cd /home/ubuntu/cosmo-app/services/skin-analysis && .venv/bin/python -m pytest tests/test_preprocess.py::TestApplyFaceAlignment -v"
```

Expected: FAIL — `ImportError: cannot import name 'apply_face_alignment'`

- [ ] **Step 3: Implement face alignment**

Add to `preprocess.py` (after imports, before `apply_clahe`):

```python
# Lazy-loaded MediaPipe face mesh instance (loaded once on first call)
_face_mesh = None


def _get_face_mesh():
    """Lazily initialize MediaPipe FaceMesh (avoids import cost if unused)."""
    global _face_mesh
    if _face_mesh is None:
        import mediapipe as mp
        _face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=False,
            min_detection_confidence=0.5,
        )
    return _face_mesh


# MediaPipe eye landmark indices (same as frontend useFaceMesh.ts)
_LEFT_EYE = 33
_RIGHT_EYE = 263


def apply_face_alignment(bgr: np.ndarray) -> np.ndarray:
    """Rotate image so the eye line is horizontal.

    Uses MediaPipe FaceMesh to detect eye positions.
    Returns the original image unchanged if no face or eyes are detected.
    """
    try:
        mesh = _get_face_mesh()
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        results = mesh.process(rgb)

        if not results.multi_face_landmarks:
            return bgr

        landmarks = results.multi_face_landmarks[0].landmark
        h, w = bgr.shape[:2]

        left_eye = landmarks[_LEFT_EYE]
        right_eye = landmarks[_RIGHT_EYE]

        # Check confidence via visibility (if available)
        left_vis = getattr(left_eye, "visibility", 1.0) or 1.0
        right_vis = getattr(right_eye, "visibility", 1.0) or 1.0
        if left_vis < 0.5 or right_vis < 0.5:
            return bgr

        # Compute angle of eye line
        dx = (right_eye.x - left_eye.x) * w
        dy = (right_eye.y - left_eye.y) * h
        angle_deg = float(np.degrees(np.arctan2(dy, dx)))

        # Skip if already nearly horizontal (< 1°)
        if abs(angle_deg) < 1.0:
            return bgr

        # Rotate around image center
        center = (w / 2, h / 2)
        rot_mat = cv2.getRotationMatrix2D(center, angle_deg, 1.0)
        rotated = cv2.warpAffine(
            bgr, rot_mat, (w, h),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REPLICATE,
        )
        return rotated
    except Exception:
        logger.warning("Face alignment failed, returning original", exc_info=True)
        return bgr
```

Then update `preprocess_image()` — replace the comment `# Step 1: Face alignment (full-mode only) — added in Task 3` with:

```python
        if is_full:
            result = apply_face_alignment(result)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
ssh ubuntu@51.83.160.253 "cd /home/ubuntu/cosmo-app/services/skin-analysis && .venv/bin/python -m pytest tests/test_preprocess.py -v"
```

Expected: all tests PASS.

---

### Task 4: Add white balance (full-mode angles only)

**Files:**
- Modify: `services/skin-analysis/preprocess.py`
- Modify: `services/skin-analysis/tests/test_preprocess.py`

- [ ] **Step 1: Write failing tests for white balance**

Append to `tests/test_preprocess.py`:

```python
from preprocess import apply_white_balance  # noqa: E402


class TestApplyWhiteBalance:
    def test_output_shape_unchanged(self):
        img = np.random.randint(50, 200, (200, 300, 3), dtype=np.uint8)
        result = apply_white_balance(img)
        assert result.shape == img.shape
        assert result.dtype == np.uint8

    def test_removes_warm_cast(self):
        # Image with warm (yellow/red) cast — R and G channels high, B low
        img = np.full((100, 100, 3), dtype=np.uint8, fill_value=0)
        img[:, :, 2] = 200  # R high (BGR order: B=0, G=1, R=2)
        img[:, :, 1] = 180  # G high
        img[:, :, 0] = 100  # B low
        result = apply_white_balance(img)
        # After Gray World, channels should be closer to each other
        means = result.mean(axis=(0, 1))
        spread = means.max() - means.min()
        assert spread < 30  # much less than original spread of 100

    def test_neutral_image_unchanged(self):
        # Already balanced image should not change much
        img = np.full((100, 100, 3), 128, dtype=np.uint8)
        result = apply_white_balance(img)
        np.testing.assert_allclose(result.mean(), 128, atol=2)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
ssh ubuntu@51.83.160.253 "cd /home/ubuntu/cosmo-app/services/skin-analysis && .venv/bin/python -m pytest tests/test_preprocess.py::TestApplyWhiteBalance -v"
```

Expected: FAIL — `ImportError: cannot import name 'apply_white_balance'`

- [ ] **Step 3: Implement white balance**

Add to `preprocess.py` (after `apply_face_alignment`, before `apply_clahe`):

```python
def apply_white_balance(bgr: np.ndarray) -> np.ndarray:
    """Gray World white balance — normalize channel means to overall mean.

    Only suitable for images with mixed content (face + background).
    NOT suitable for closeup skin-only images where skin dominates.
    """
    img = bgr.astype(np.float32)
    means = img.mean(axis=(0, 1))  # per-channel mean [B, G, R]
    overall_mean = means.mean()

    # Avoid division by zero
    safe_means = np.where(means > 1.0, means, 1.0)
    scale = overall_mean / safe_means

    result = img * scale[np.newaxis, np.newaxis, :]
    return np.clip(result, 0, 255).astype(np.uint8)
```

Then update `preprocess_image()` — replace the comment `# Step 2: White balance (full-mode only) — added in Task 4` with:

```python
            result = apply_white_balance(result)
```

(This goes right after the alignment line, still inside the `if is_full:` block.)

- [ ] **Step 4: Run tests to verify they pass**

```bash
ssh ubuntu@51.83.160.253 "cd /home/ubuntu/cosmo-app/services/skin-analysis && .venv/bin/python -m pytest tests/test_preprocess.py -v"
```

Expected: all tests PASS.

---

### Task 5: Integrate preprocessing into `analysis.py`

**Files:**
- Modify: `services/skin-analysis/analysis.py`

The goal: call `preprocess_image()` on each decoded image BEFORE passing to models. The existing `preprocess_skin()` (CLAHE + a* boost) stays — it runs after face parsing on cropped regions. Our new preprocessing runs on the full raw image before face parsing.

- [ ] **Step 1: Add import to analysis.py**

At the top of `analysis.py`, after existing imports, add:

```python
from preprocess import preprocess_image
```

- [ ] **Step 2: Add preprocessing call in `analyze()` method**

In `SkinAnalyzer.analyze()` (line ~581), right after the decode loop:

```python
decoded = {angle: decode_image(images[angle]) for angle in overview_angles}
```

Add the preprocessing step:

```python
decoded = {angle: preprocess_image(decoded[angle], angle) for angle in overview_angles}
```

- [ ] **Step 3: Add preprocessing to zone closeup images**

In `analyze()` method, the zone closeup loop (around line 630) has:
```python
for zone_angle in zone_angles_present:
    zone_bgr = decode_image(images[zone_angle])
    zone_data = self._analyze_zone_closeup(zone_bgr, zone_angle, overlays)
```

Add preprocessing between decode and analysis:
```python
for zone_angle in zone_angles_present:
    zone_bgr = decode_image(images[zone_angle])
    zone_bgr = preprocess_image(zone_bgr, zone_angle)
    zone_data = self._analyze_zone_closeup(zone_bgr, zone_angle, overlays)
```

**Important:** Do NOT modify `_analyze_zone_closeup()` itself — preprocessing happens in the caller to avoid double-processing.

- [ ] **Step 4: Run ALL tests**

```bash
ssh ubuntu@51.83.160.253 "cd /home/ubuntu/cosmo-app/services/skin-analysis && .venv/bin/python -m pytest tests/ -v"
```

Expected: all tests PASS.

---

### Task 6: Restart service and verify

**Files:** None (deployment task)

- [ ] **Step 1: Restart the skin-analysis service**

```bash
ssh ubuntu@51.83.160.253 "sudo systemctl restart cosmo-skin-analysis.service"
```

- [ ] **Step 2: Wait for health check**

```bash
ssh ubuntu@51.83.160.253 "for i in \$(seq 1 60); do curl --fail --silent http://127.0.0.1:8010/health | grep -q 'modelsLoaded.*true' && echo 'Healthy after '\$i' checks' && break || sleep 2; done"
```

Expected: `Healthy after N checks`

- [ ] **Step 3: Check memory usage is within limits**

```bash
ssh ubuntu@51.83.160.253 "systemctl status cosmo-skin-analysis.service | grep Memory"
```

Expected: Memory usage below 2200MB.

- [ ] **Step 4: Run a manual test via the web app**

Open the skin scan page, capture a FRONT photo, complete the scan. Verify:
- Analysis completes successfully (no timeout, no 500 error)
- Results display correctly in the report
- No errors in Python service logs: `ssh ubuntu@51.83.160.253 "sudo journalctl -u cosmo-skin-analysis.service -n 30 --no-pager"`

---

### Task 7: Optional — enable debug mode and verify preprocessing output

- [ ] **Step 1: Enable debug mode**

```bash
ssh ubuntu@51.83.160.253 "echo 'PREPROCESS_DEBUG=1' >> /home/ubuntu/cosmo-app/services/skin-analysis/.env && sudo systemctl restart cosmo-skin-analysis.service"
```

- [ ] **Step 2: Run a scan and check debug images**

After completing a scan:

```bash
ssh ubuntu@51.83.160.253 "ls -la /home/ubuntu/cosmo-app/services/skin-analysis/debug/"
```

Expected: files like `FRONT_1753180000000_preprocessed.png`, `FOREHEAD_1753180000001_preprocessed.png`, etc.

- [ ] **Step 3: Disable debug mode**

```bash
ssh ubuntu@51.83.160.253 "sed -i '/PREPROCESS_DEBUG/d' /home/ubuntu/cosmo-app/services/skin-analysis/.env && sudo systemctl restart cosmo-skin-analysis.service"
```

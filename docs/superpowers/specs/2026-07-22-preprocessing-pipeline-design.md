# Preprocessing Pipeline — Design Spec

## Goal

Add an image preprocessing pipeline to the Python skin-analysis service that normalizes lighting, color balance, and face orientation before ML models run. This improves consistency of results across varying capture conditions.

## Context

Current flow: Node backend uploads WebP images → Python FastAPI service at `POST /v1/analyze` → BiSeNet face parsing, acne grading, wrinkle segmentation, algorithmic pigmentation/redness → JSON response.

**Problem:** Images arrive with inconsistent lighting (warm/cool casts, uneven brightness), varied face rotation angles, and no standardized input size. This causes:
- Pigmentation/redness metrics (CIE Lab based) fluctuate with lighting color temperature
- BiSeNet segmentation quality varies with face angle
- Acne/wrinkle models receive inconsistent input dimensions

## Architecture

Preprocessing runs **inside the Python FastAPI service** as a new pipeline stage between "receive images" and "run ML models." No changes to the Node backend or frontend.

```
Node backend (WebP files via FormData)
  → POST /v1/analyze
  → Python service:
      1. Decode uploaded images (existing)
      2. **PREPROCESS PIPELINE (new)**
         a) Face alignment
         b) White balance
         c) CLAHE
         d) Resize to 512×512
      3. Run ML models on preprocessed images (existing)
      4. Return JSON response (existing, unchanged)
```

Original uploaded bytes are never modified on disk. Preprocessing operates on in-memory copies only.

## Pipeline Steps

### Step 1: Face Alignment

- Detect eye landmarks using dlib's 68-point shape predictor (already available in many skin-analysis setups) or MediaPipe face mesh
- Compute the angle of the line connecting left and right eye centers
- Rotate the image around its center by the negative of that angle so eyes become horizontal
- Use `cv2.warpAffine` with border mode `BORDER_REPLICATE` to avoid black edges
- If no face/eyes detected (e.g., closeup angles like FOREHEAD, CHIN, NECK): skip alignment, pass image through unchanged

**Why not crop:** BiSeNet needs full-frame context (forehead hairline, jaw line, neck) for accurate face parsing. Cropping risks cutting important segmentation regions.

### Step 2: White Balance (Gray World Algorithm)

- Compute mean of each RGB channel across the image
- Compute overall mean: `mean_all = (mean_R + mean_G + mean_B) / 3`
- Scale each channel: `R *= mean_all / mean_R`, same for G and B
- Clip to [0, 255]

**Why Gray World:** Simple, no reference needed, effective for single-dominant-light scenes (typical selfie conditions). Removes warm/cool color casts that distort CIE Lab pigmentation and redness measurements.

### Step 3: CLAHE (Contrast Limited Adaptive Histogram Equalization)

- Convert image from BGR to CIE Lab color space
- Apply CLAHE to the L (lightness) channel only: `clipLimit=2.0`, `tileGridSize=(8, 8)`
- Convert back to BGR

**Why L-channel only:** Preserves chrominance (a*, b* channels) critical for pigmentation and redness analysis. Only normalizes local brightness/contrast variations (shadows on one cheek, bright forehead).

### Step 4: Resize to Standard Input

- Resize to 512×512 using `cv2.resize` with `INTER_AREA` (for downscaling) or `INTER_LINEAR` (for upscaling)
- Maintain aspect ratio: fit inside 512×512 with padding (replicate border, not black) to avoid introducing artificial edges
- 512×512 matches BiSeNet's expected input and provides sufficient detail for acne/wrinkle models

## Error Handling

- If any preprocessing step fails (e.g., dlib can't load shape predictor, OpenCV error), log a warning and pass the original unprocessed image to models
- Pipeline must never cause the `/v1/analyze` endpoint to return an error that wouldn't have occurred without preprocessing
- Each step is independent: if alignment fails but white balance and CLAHE succeed, apply those two

## Debug Mode

When env var `PREPROCESS_DEBUG=1` is set:
- Save preprocessed images to a `debug/` subdirectory alongside the service
- Filename format: `{session_id}_{angle}_preprocessed.png`
- Disabled by default in production

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `services/skin-analysis/preprocess.py` | Create | Pipeline: `preprocess_image(img, angle) → img` |
| `services/skin-analysis/analyze.py` (or equivalent entry point) | Modify | Call `preprocess_image()` before passing to models |
| `deploy/skin-analysis/install.sh` | Modify | Ensure dlib/shape predictor model is downloaded |

## Dependencies

- `opencv-python` (likely already present)
- `dlib` + `shape_predictor_68_face_landmarks.dat` (~99MB, downloaded once during install)
- No new Python packages if MediaPipe is used instead of dlib (MediaPipe may already be available)

## What Does NOT Change

- **Node backend:** Same FormData upload, same response schema parsing
- **Frontend:** Zero changes
- **API contract:** Request and response format between Node and Python unchanged
- **Stored files:** Original WebP files in `uploads/skin-scans/` untouched
- **Overlay generation:** Overlays still generated from model output as before

## Success Criteria

- Same photo taken under warm vs cool lighting produces <10% variation in pigmentation/redness scores (vs current ~25%+)
- Tilted head photos (within guided capture tolerance of ±10-12°) produce same segmentation quality as perfectly aligned photos
- No regression in analysis speed (preprocessing adds <500ms per image)
- Graceful degradation: if preprocessing fails, analysis still completes with original images

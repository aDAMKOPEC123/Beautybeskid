# Preprocessing Pipeline — Design Spec

## Goal

Add an image preprocessing pipeline to the Python skin-analysis service that normalizes lighting, color balance, and face orientation before ML models run. This improves consistency of results across varying capture conditions.

## Context

Current flow: Node backend uploads WebP images → Python FastAPI service at `POST /v1/analyze` → BiSeNet face parsing, acne grading, wrinkle segmentation, algorithmic pigmentation/redness → JSON response.

The Python service lives on the VPS at `/home/ubuntu/cosmo-app/services/skin-analysis/`, started by systemd (`cosmo-skin-analysis.service`) via `uvicorn app:app`. It is NOT checked into git (model weights are too large). The service has memory limits: `MemoryHigh=2200M`, `MemoryMax=2800M`, `CPUQuota=180%`.

**Problem:** Images arrive with inconsistent lighting (warm/cool casts, uneven brightness), varied face rotation angles, and no standardized input size. This causes:
- Pigmentation/redness metrics (CIE Lab based) fluctuate with lighting color temperature
- BiSeNet segmentation quality varies with face angle
- Acne/wrinkle models receive inconsistent input dimensions

## Architecture

Preprocessing runs **inside the Python FastAPI service** as a new pipeline stage between "receive images" and "run ML models." No changes to the Node backend or frontend.

```
Node backend (WebP files via FormData)
  → POST /v1/analyze
  → Python service (app.py):
      1. Decode uploaded images (existing)
      2. **PREPROCESS PIPELINE (new)**
         a) Face alignment (full-mode angles only)
         b) White balance (full-mode angles only)
         c) CLAHE
         d) Resize to 512×512
      3. Run ML models on preprocessed images (existing)
      4. Return JSON response (existing, unchanged)
```

Original uploaded bytes are never modified on disk. Preprocessing operates on in-memory copies only.

### Angle-aware processing

Scan angles are split into two categories (matching guided capture modes):

- **Full-mode angles** (FRONT, LEFT, RIGHT): full face visible → apply all 4 steps
- **Closeup angles** (FOREHEAD, LEFT_CHEEK, RIGHT_CHEEK, CHIN, NECK): zoomed in on skin region, no reliable eye detection → skip alignment and white balance, apply only CLAHE + resize

## Pipeline Steps

### Step 1: Face Alignment (full-mode angles only)

- Use **MediaPipe Face Mesh** (Python `mediapipe` package) to detect eye landmarks
  - MediaPipe is pip-installable (~30MB), no C++ compilation needed (unlike dlib which requires cmake + build-essential and 15-30 min compile time on VPS)
  - Memory overhead: ~50MB resident (fits within existing 2800MB cap alongside current models)
- Compute the angle of the line connecting left and right eye centers (landmarks 33, 263 — same indices as frontend)
- Rotate the image around its center by the negative of that angle so eyes become horizontal
- Use `cv2.warpAffine` with border mode `BORDER_REPLICATE` to avoid black edges
- **Partial detection:** If only one eye is detected or confidence is low (<0.5), skip alignment for that image

**Why not crop:** BiSeNet needs full-frame context (forehead hairline, jaw line, neck) for accurate face parsing.

### Step 2: White Balance (full-mode angles only)

Gray World algorithm applied **only to FRONT, LEFT, RIGHT** angles where the image contains mixed skin + background, satisfying the algorithm's assumption that average scene color approximates gray.

**Skipped for closeup angles** because close-up skin images are dominated by a single hue (skin tone), which violates the Gray World assumption and would aggressively shift skin colors toward gray, worsening pigmentation/redness accuracy.

- Compute mean of each RGB channel across the image
- Compute overall mean: `mean_all = (mean_R + mean_G + mean_B) / 3`
- Scale each channel: `R *= mean_all / mean_R`, same for G and B
- Clip to [0, 255]

### Step 3: CLAHE (all angles)

- Convert image from BGR to CIE Lab color space
- Apply CLAHE to the L (lightness) channel only: `clipLimit=2.0`, `tileGridSize=(8, 8)`
- Convert back to BGR

**Why L-channel only:** Preserves chrominance (a*, b* channels) critical for pigmentation and redness analysis. Only normalizes local brightness/contrast variations.

**Note:** `clipLimit=2.0` is a starting value. If end-to-end testing shows subtle pigmentation spots being washed out, reduce to 1.5 or 1.0. This is the most tunable parameter in the pipeline.

### Step 4: Resize to Standard Input (all angles)

- Resize to 512×512 using `cv2.resize` with `INTER_AREA` (for downscaling) or `INTER_LINEAR` (for upscaling)
- **No padding** — resize directly to 512×512 (stretch to square). BiSeNet and other models in the service already handle square input, and the aspect ratio of selfie captures (4:3) is close enough that mild distortion is preferable to introducing synthetic border regions that could confuse face parsing
- 512×512 matches BiSeNet's expected input size

## Error Handling

- If any preprocessing step fails (e.g., MediaPipe can't detect landmarks, OpenCV error), log a warning and pass the original unprocessed image to models
- Pipeline must never cause the `/v1/analyze` endpoint to return an error that wouldn't have occurred without preprocessing
- Each step is independent: if alignment fails but CLAHE succeeds, apply CLAHE only

## Debug Mode

When env var `PREPROCESS_DEBUG=1` is set:
- Save preprocessed images to a `debug/` subdirectory alongside the service
- Filename format: `{angle}_{timestamp}_preprocessed.png` (no session_id — Node backend doesn't send it to Python service)
- Log which preprocessing steps were applied vs skipped per image
- Disabled by default in production

## Files to Create/Modify

All files live on VPS at `/home/ubuntu/cosmo-app/services/skin-analysis/`. The deploy script copies updated files.

| File | Action | Purpose |
|------|--------|---------|
| `services/skin-analysis/preprocess.py` | Create | Pipeline: `preprocess_image(img, angle) → img` |
| `services/skin-analysis/app.py` | Modify | Call `preprocess_image()` after decoding, before models |
| `services/skin-analysis/requirements.txt` | Modify | Add `mediapipe` |
| `deploy/skin-analysis/install.sh` | Modify | Run `pip install -r requirements.txt` (already does this) |

## Dependencies

- `opencv-python` — already present in requirements.txt
- `mediapipe` — ~30MB pip install, no compilation, includes face mesh model
- No shape predictor download needed (MediaPipe bundles its models)

### Memory budget

Current service memory (approximate):
- Python + FastAPI + uvicorn: ~150MB
- BiSeNet ONNX: ~100MB
- Acne model (PyTorch): ~200MB
- Wrinkle model (PyTorch): ~400MB
- Image processing buffers: ~200MB
- **Total: ~1050MB**

Adding MediaPipe face mesh: +~50MB → ~1100MB. Well within the 2200MB soft / 2800MB hard limit.

## What Does NOT Change

- **Node backend:** Same FormData upload, same response schema parsing
- **Frontend:** Zero changes
- **API contract:** Request and response format between Node and Python unchanged
- **Stored files:** Original WebP files in `uploads/skin-scans/` untouched
- **Overlay generation:** Overlays still generated from model output as before

## Success Criteria

- Tilted head photos (within guided capture tolerance of ±10-12°) produce consistent segmentation regardless of tilt direction
- Preprocessing adds <500ms total per image (all 4 steps combined)
- Graceful degradation: if preprocessing fails, analysis still completes with original images
- No OOM kills after deployment (memory stays below 2200MB under load)

## Risks and Tuning Notes

- **CLAHE clipLimit** may need tuning per-metric. Start with 2.0, reduce if subtle features wash out
- **White balance on FRONT** images with colored backgrounds (green plants, red curtains) may introduce mild color shift — acceptable tradeoff vs. lighting-caused measurement variance
- **MediaPipe face mesh** in Python may differ slightly from JavaScript version used in frontend — eye landmark indices should be verified during implementation

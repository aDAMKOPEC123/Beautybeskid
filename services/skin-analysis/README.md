# COSMO skin-analysis service

Private Python inference service used by the Node API. It receives the three scan images over an internal multipart request and returns image-derived cosmetic metrics.

## What is actually connected

- BiSeNet ResNet18 ONNX: skin/face parsing.
- Acne-LDS checkpoint trained on ACNE04: acne severity (Hayashi 1-4) and count estimate.
- FFHQ-Wrinkle stage 2 U-Net: wrinkle segmentation from masked RGB + Gaussian texture map.
- CIE Lab relative indices inside the BiSeNet mask: pigmentation and redness trend indicators.

ACNE04-v2 is an annotation set, not a deployable model. It is registered as the next dataset for training a lesion-localization detector. The current acne result comes from the published Acne-LDS/ACNE04 weights.

## Local setup

```bash
cd services/skin-analysis
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python scripts/download_models.py
python -m uvicorn app:app --host 127.0.0.1 --port 8010
```

Configure `apps/server/.env`:

```dotenv
SKIN_ANALYSIS_URL=http://127.0.0.1:8010
SKIN_ANALYSIS_API_KEY=replace-with-a-long-random-secret
SKIN_ANALYSIS_TIMEOUT_MS=90000
```

Set the same `SKIN_ANALYSIS_API_KEY` for this service. A single worker is intentional: each worker loads another copy of the models into RAM.

## Checks

```bash
python -m pytest tests
curl http://127.0.0.1:8010/health
```

The model downloader verifies SHA-256 checksums and keeps the large checkpoints under ignored `models/`. The U-Net archive is downloaded temporarily and only the stage-2 U-Net checkpoint is retained.

## Operational notes

- Recommended minimum: 4 CPU cores and 4 GB free RAM; GPU is optional.
- Default wrinkle inference is 512×512 for practical CPU latency. Use `SKIN_WRINKLE_IMAGE_SIZE=1024` for the paper's native size only after measuring RAM and latency.
- Never expose port 8010 publicly. Bind to loopback or a private container network.
- Do not log request bodies or persist copies inside this service.
- Review [THIRD_PARTY_MODELS.md](./THIRD_PARTY_MODELS.md) before production use.

## Container

The image intentionally excludes checkpoints and local virtual environments. Download the models on the host and mount them read-only:

```bash
docker build -t cosmo-skin-analysis .
docker run --rm -p 127.0.0.1:8010:8010 \
  -e SKIN_ANALYSIS_API_KEY=replace-with-a-long-random-secret \
  -v "$(pwd)/models:/models:ro" cosmo-skin-analysis
```

## VPS service

Production infrastructure runs the research integration as a single, loopback-only systemd service. The installer creates a dedicated virtual environment, downloads checksum-verified weights, synchronizes a random API key with the Node backend, enables a 2 GB swap safety net and waits for model readiness:

```bash
sudo apt-get install -y python3-venv
bash deploy/skin-analysis/install.sh
```

The unit file is `deploy/systemd/cosmo-skin-analysis.service`. The main `deploy.sh` invokes this installer before restarting the Node backend.

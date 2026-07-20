from __future__ import annotations

import hmac
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from analysis import SkinAnalyzer
from config import get_settings
from models import ModelBundle


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.analyzer = await run_in_threadpool(lambda: SkinAnalyzer(ModelBundle(settings)))
    yield


app = FastAPI(
    title="COSMO Skin Analysis",
    version="1.0.0-research",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


def authorize(api_key: str | None) -> None:
    if settings.api_key and (not api_key or not hmac.compare_digest(settings.api_key, api_key)):
        raise HTTPException(status_code=401, detail="Invalid API key")


async def read_image(upload: UploadFile) -> bytes:
    allowed = {"image/jpeg", "image/png", "image/webp"}
    if upload.content_type not in allowed:
        raise HTTPException(status_code=415, detail=f"Unsupported image type: {upload.content_type}")
    content = await upload.read()
    if not content or len(content) > 12 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be between 1 byte and 12 MB")
    return content


@app.get("/health")
async def health() -> dict[str, object]:
    analyzer: SkinAnalyzer | None = getattr(app.state, "analyzer", None)
    return {
        "status": "ok" if analyzer else "starting",
        "modelsLoaded": analyzer is not None,
        "mode": "research",
        "versions": analyzer.models.versions if analyzer else {},
    }


@app.post("/v1/analyze")
async def analyze(
    front: UploadFile = File(...),
    left: UploadFile = File(...),
    right: UploadFile = File(...),
    x_api_key: str | None = Header(default=None),
) -> dict[str, object]:
    authorize(x_api_key)
    try:
        images = {
            "FRONT": await read_image(front),
            "LEFT": await read_image(left),
            "RIGHT": await read_image(right),
        }
        analyzer: SkinAnalyzer = app.state.analyzer
        return await run_in_threadpool(analyzer.analyze, images)
    except HTTPException:
        raise
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Model inference failed") from error

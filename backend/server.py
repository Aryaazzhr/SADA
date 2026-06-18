from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from model import load_model, predict
from auth import auth_router, init_auth_db, get_current_user


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ['DB_NAME']]

# Model path – default looks two directories up (project root)
MODEL_PATH = os.environ.get(
    'MODEL_PATH',
    str(ROOT_DIR / 'best_deepfake_model_tensor.pt'),
)


# ---------- Lifespan (load model once) ----------
@asynccontextmanager
async def lifespan(application: FastAPI):
    """Load the ML model at startup, clean up at shutdown."""
    # Share DB with auth module
    init_auth_db(db)

    logger.info("Loading deepfake detection model …")
    model, feature_extractor = load_model(MODEL_PATH, device="cpu")
    application.state.model = model
    application.state.feature_extractor = feature_extractor
    logger.info("Model ready.")
    yield
    mongo_client.close()
    logger.info("Shutdown complete.")


app = FastAPI(title="SADA API", lifespan=lifespan)
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class DetectionRequest(BaseModel):
    filename: str
    duration_seconds: float = 0.0
    source: str = "upload"  # "upload" | "record"
    size_bytes: int = 0
    mime_type: Optional[str] = None


class DetectionResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    filename: str
    duration_seconds: float = 0.0
    source: str = "upload"
    size_bytes: int = 0
    mime_type: Optional[str] = None
    label: str  # "ai" | "human"
    confidence: float  # 0..100
    breakdown: dict  # {"ai": float, "human": float, "noise": float}
    model_used: str = "SADA-Mock-v1"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatsResponse(BaseModel):
    total: int
    ai_count: int
    human_count: int
    ai_ratio: float
    human_ratio: float
    avg_confidence: float
    last_7_days: List[dict]


# ---------- Helpers ----------
def _serialize(doc: dict) -> dict:
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    return doc


def _deserialize(doc: dict) -> dict:
    if isinstance(doc.get("created_at"), str):
        try:
            doc["created_at"] = datetime.fromisoformat(doc["created_at"])
        except Exception:
            pass
    return doc


# (_mock_detect removed – using real model inference)


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"service": "SADA", "status": "ok"}


@api_router.post("/detect", response_model=DetectionResult)
async def detect_audio(
    file: UploadFile = File(...),
    duration_seconds: float = Form(0.0),
    source: str = Form("upload"),
    current_user: dict = Depends(get_current_user),
):
    # Read uploaded audio bytes
    audio_bytes = await file.read()
    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Run real inference in a thread pool to avoid blocking the event loop
    try:
        result = await asyncio.to_thread(
            predict,
            audio_bytes,
            app.state.model,
            app.state.feature_extractor,
            "cpu",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Inference failed")
        raise HTTPException(status_code=500, detail="Inference error")

    obj = DetectionResult(
        user_id=current_user["id"],
        filename=file.filename or "unknown",
        duration_seconds=result.get("duration_seconds", duration_seconds),
        source=source,
        size_bytes=len(audio_bytes),
        mime_type=file.content_type,
        label=result["label"],
        confidence=result["confidence"],
        breakdown=result["breakdown"],
        model_used="SADA-Wav2Vec2-v1",
    )
    doc = obj.model_dump()
    doc = _serialize(doc)
    await db.detections.insert_one(doc)
    return obj


@api_router.get("/history", response_model=List[DetectionResult])
async def get_history(
    limit: int = 50,
    label: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    query = {"user_id": current_user["id"]}
    if label in {"ai", "human"}:
        query["label"] = label
    cursor = db.detections.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    return [DetectionResult(**_deserialize(item)) for item in items]


@api_router.get("/history/{detection_id}", response_model=DetectionResult)
async def get_detection(
    detection_id: str,
    current_user: dict = Depends(get_current_user),
):
    item = await db.detections.find_one(
        {"id": detection_id, "user_id": current_user["id"]}, {"_id": 0}
    )
    if not item:
        raise HTTPException(status_code=404, detail="Detection not found")
    return DetectionResult(**_deserialize(item))


@api_router.delete("/history/{detection_id}")
async def delete_detection(
    detection_id: str,
    current_user: dict = Depends(get_current_user),
):
    result = await db.detections.delete_one(
        {"id": detection_id, "user_id": current_user["id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Detection not found")
    return {"deleted": True, "id": detection_id}


@api_router.delete("/history")
async def clear_history(current_user: dict = Depends(get_current_user)):
    result = await db.detections.delete_many({"user_id": current_user["id"]})
    return {"deleted": result.deleted_count}


@api_router.get("/stats", response_model=StatsResponse)
async def get_stats(current_user: dict = Depends(get_current_user)):
    items = await db.detections.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).to_list(length=10000)
    total = len(items)
    ai_count = sum(1 for i in items if i.get("label") == "ai")
    human_count = sum(1 for i in items if i.get("label") == "human")
    avg_conf = (sum(float(i.get("confidence", 0)) for i in items) / total) if total else 0.0

    # Last 7 days bucket
    from collections import defaultdict
    buckets = defaultdict(lambda: {"ai": 0, "human": 0})
    today = datetime.now(timezone.utc).date()
    for i in items:
        ts = i.get("created_at")
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts)
            except Exception:
                continue
        if not isinstance(ts, datetime):
            continue
        d = ts.date()
        delta = (today - d).days
        if 0 <= delta <= 6:
            key = d.isoformat()
            buckets[key][i.get("label", "human")] += 1

    last_7 = []
    for n in range(6, -1, -1):
        from datetime import timedelta
        d = (today - timedelta(days=n)).isoformat()
        b = buckets.get(d, {"ai": 0, "human": 0})
        last_7.append({"date": d, "ai": b["ai"], "human": b["human"]})

    return StatsResponse(
        total=total,
        ai_count=ai_count,
        human_count=human_count,
        ai_ratio=round((ai_count / total) * 100, 2) if total else 0.0,
        human_ratio=round((human_count / total) * 100, 2) if total else 0.0,
        avg_confidence=round(avg_conf, 2),
        last_7_days=last_7,
    )


app.include_router(api_router)
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


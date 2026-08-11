"""Truck Loading Document Archive - FastAPI backend."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Request, Response, Query
from fastapi.responses import Response as FastResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from auth import hash_password, verify_password, create_access_token, decode_token, extract_token
from storage import init_storage, put_object, get_object

# --- Setup ---
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

APP_NAME = os.environ.get("APP_NAME", "truck-archive")
RETENTION_YEARS = 2

# Categories & completeness rule
CATEGORIES = ["surat_jalan", "foto_kendaraan", "pengecekan", "segel", "muatan", "lainnya"]
REQUIRED_CATEGORIES = ["surat_jalan", "foto_kendaraan"]

app = FastAPI(title="Arsip Pemuatan Truk")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# --- Helpers ---
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


async def get_current_user(request: Request) -> dict:
    token = extract_token(request)
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# --- Models ---
class LoginReq(BaseModel):
    username: str
    password: str


class UserCreateReq(BaseModel):
    username: str
    password: str
    name: str
    role: str  # admin | operator


class QueueCreateReq(BaseModel):
    nopol: str
    no_container: Optional[str] = ""
    tujuan: str
    jenis_pemuatan: str  # EKSPOR | LOKAL


class TruckCreateReq(BaseModel):
    nopol: str
    tanggal_pemuatan: str  # YYYY-MM-DD
    no_do: Optional[str] = ""
    no_container: Optional[str] = ""
    nama_supir: str
    tujuan: str
    jenis_pemuatan: str  # EKSPOR | LOKAL
    queue_id: Optional[str] = None


class TruckUpdateReq(BaseModel):
    no_do: Optional[str] = None
    nama_supir: Optional[str] = None
    tujuan: Optional[str] = None
    jenis_pemuatan: Optional[str] = None
    tanggal_pemuatan: Optional[str] = None


# --- Startup: seed + indexes ---
@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

    await db.users.create_index("username", unique=True)
    await db.trucks.create_index("nopol")
    await db.trucks.create_index("tanggal_pemuatan")
    await db.photos.create_index("truck_id")
    await db.queue.create_index("nopol")

    for env_user, env_pass, role, name in [
        (os.environ.get("ADMIN_EMAIL", "admin"), os.environ.get("ADMIN_PASSWORD", "admin123"), "admin", "Admin"),
        (os.environ.get("OPERATOR_EMAIL", "operator"), os.environ.get("OPERATOR_PASSWORD", "operator123"), "operator", "Operator"),
    ]:
        existing = await db.users.find_one({"username": env_user})
        if not existing:
            await db.users.insert_one({
                "id": new_id(),
                "username": env_user,
                "password_hash": hash_password(env_pass),
                "name": name,
                "role": role,
                "created_at": now_iso(),
            })

    # Seed demo queue if empty
    q_count = await db.queue.count_documents({})
    if q_count == 0:
        demo_queue = [
            {"id": new_id(), "nopol": "B1234ABC", "no_container": "TCLU1234567", "tujuan": "PT MAJU JAYA - JAKARTA", "jenis_pemuatan": "LOKAL", "status": "menunggu", "created_at": now_iso()},
            {"id": new_id(), "nopol": "D5678XYZ", "no_container": "MSCU9876543", "tujuan": "SINGAPORE PORT", "jenis_pemuatan": "EKSPOR", "status": "menunggu", "created_at": now_iso()},
            {"id": new_id(), "nopol": "L9012DEF", "no_container": "", "tujuan": "CV BERKAH - SURABAYA", "jenis_pemuatan": "LOKAL", "status": "menunggu", "created_at": now_iso()},
        ]
        await db.queue.insert_many(demo_queue)


# --- Auth Endpoints ---
@api.post("/auth/login")
async def login(body: LoginReq, response: Response):
    user = await db.users.find_one({"username": body.username.strip().lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Username atau password salah")
    token = create_access_token(user["id"], user["username"], user["role"])
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=60 * 60 * 12, path="/",
    )
    return {"token": token, "user": {"id": user["id"], "username": user["username"], "name": user["name"], "role": user["role"]}}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# --- User Management (Admin) ---
@api.get("/users")
async def list_users(user: dict = Depends(require_admin)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)


@api.post("/users")
async def create_user(body: UserCreateReq, user: dict = Depends(require_admin)):
    uname = body.username.strip().lower()
    if await db.users.find_one({"username": uname}):
        raise HTTPException(400, "Username sudah ada")
    if body.role not in ("admin", "operator"):
        raise HTTPException(400, "Role tidak valid")
    doc = {
        "id": new_id(), "username": uname, "password_hash": hash_password(body.password),
        "name": body.name, "role": body.role, "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    return doc


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_admin)):
    if user_id == user["id"]:
        raise HTTPException(400, "Tidak bisa menghapus akun sendiri")
    await db.users.delete_one({"id": user_id})
    return {"ok": True}


# --- Queue ---
@api.get("/queue")
async def list_queue(user: dict = Depends(get_current_user), status: Optional[str] = None):
    q = {}
    if status:
        q["status"] = status
    return await db.queue.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.get("/queue/lookup/{nopol}")
async def lookup_queue(nopol: str, user: dict = Depends(get_current_user)):
    nopol_clean = nopol.strip().upper().replace(" ", "")
    q = await db.queue.find_one({"nopol": nopol_clean, "status": "menunggu"}, {"_id": 0})
    return q or {}


@api.post("/queue")
async def create_queue(body: QueueCreateReq, user: dict = Depends(get_current_user)):
    doc = {
        "id": new_id(),
        "nopol": body.nopol.strip().upper().replace(" ", ""),
        "no_container": body.no_container.strip().upper() if body.no_container else "",
        "tujuan": body.tujuan.strip(),
        "jenis_pemuatan": body.jenis_pemuatan.upper(),
        "status": "menunggu",
        "created_at": now_iso(),
    }
    await db.queue.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/queue/{queue_id}")
async def delete_queue(queue_id: str, user: dict = Depends(require_admin)):
    await db.queue.delete_one({"id": queue_id})
    return {"ok": True}


# --- Trucks ---
def compute_completeness(counts: dict) -> str:
    for c in REQUIRED_CATEGORIES:
        if counts.get(c, 0) < 1:
            return "belum_lengkap"
    return "lengkap"


async def photo_counts_for(truck_id: str) -> dict:
    pipeline = [
        {"$match": {"truck_id": truck_id}},
        {"$group": {"_id": "$kategori", "count": {"$sum": 1}}},
    ]
    counts = {c: 0 for c in CATEGORIES}
    async for row in db.photos.aggregate(pipeline):
        counts[row["_id"]] = row["count"]
    return counts


async def refresh_truck_stats(truck_id: str):
    counts = await photo_counts_for(truck_id)
    status = compute_completeness(counts)
    await db.trucks.update_one(
        {"id": truck_id},
        {"$set": {"photo_counts": counts, "status_kelengkapan": status, "total_photos": sum(counts.values())}},
    )


@api.post("/trucks")
async def create_truck(body: TruckCreateReq, user: dict = Depends(get_current_user)):
    tanggal = body.tanggal_pemuatan  # YYYY-MM-DD
    try:
        d = datetime.strptime(tanggal, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "Format tanggal harus YYYY-MM-DD")
    retention = (d + timedelta(days=365 * RETENTION_YEARS)).strftime("%Y-%m-%d")
    doc = {
        "id": new_id(),
        "nopol": body.nopol.strip().upper().replace(" ", ""),
        "tanggal_pemuatan": tanggal,
        "no_do": (body.no_do or "").strip().upper(),
        "no_container": (body.no_container or "").strip().upper(),
        "nama_supir": body.nama_supir.strip(),
        "tujuan": body.tujuan.strip(),
        "jenis_pemuatan": body.jenis_pemuatan.upper(),
        "queue_id": body.queue_id,
        "status_kelengkapan": "belum_lengkap",
        "photo_counts": {c: 0 for c in CATEGORIES},
        "total_photos": 0,
        "retention_date": retention,
        "created_by": user["username"],
        "created_at": now_iso(),
    }
    await db.trucks.insert_one(doc)
    if body.queue_id:
        await db.queue.update_one({"id": body.queue_id}, {"$set": {"status": "diproses", "truck_id": doc["id"]}})
    doc.pop("_id", None)
    return doc


@api.get("/trucks")
async def list_trucks(
    user: dict = Depends(get_current_user),
    nopol: Optional[str] = None,
    no_do: Optional[str] = None,
    tujuan: Optional[str] = None,
    jenis_pemuatan: Optional[str] = None,
    status_kelengkapan: Optional[str] = None,
    tanggal_from: Optional[str] = None,
    tanggal_to: Optional[str] = None,
    ready_to_destroy: Optional[bool] = None,
    limit: int = 200,
):
    q = {}
    if nopol:
        q["nopol"] = {"$regex": nopol.upper().replace(" ", ""), "$options": "i"}
    if no_do:
        q["no_do"] = {"$regex": no_do.upper(), "$options": "i"}
    if tujuan:
        q["tujuan"] = {"$regex": tujuan, "$options": "i"}
    if jenis_pemuatan:
        q["jenis_pemuatan"] = jenis_pemuatan.upper()
    if status_kelengkapan:
        q["status_kelengkapan"] = status_kelengkapan
    if tanggal_from or tanggal_to:
        q["tanggal_pemuatan"] = {}
        if tanggal_from:
            q["tanggal_pemuatan"]["$gte"] = tanggal_from
        if tanggal_to:
            q["tanggal_pemuatan"]["$lte"] = tanggal_to
    if ready_to_destroy:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        q["retention_date"] = {"$lte": today}
    return await db.trucks.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)


@api.get("/trucks/{truck_id}")
async def get_truck(truck_id: str, user: dict = Depends(get_current_user)):
    truck = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    if not truck:
        raise HTTPException(404, "Truk tidak ditemukan")
    photos = await db.photos.find({"truck_id": truck_id}, {"_id": 0}).sort("uploaded_at", 1).to_list(500)
    return {"truck": truck, "photos": photos}


@api.patch("/trucks/{truck_id}")
async def update_truck(truck_id: str, body: TruckUpdateReq, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates.get("no_do"):
        updates["no_do"] = updates["no_do"].strip().upper()
    if updates.get("jenis_pemuatan"):
        updates["jenis_pemuatan"] = updates["jenis_pemuatan"].upper()
    if updates:
        await db.trucks.update_one({"id": truck_id}, {"$set": updates})
    truck = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    return truck


@api.delete("/trucks/{truck_id}")
async def delete_truck(truck_id: str, user: dict = Depends(require_admin)):
    photos = await db.photos.find({"truck_id": truck_id}).to_list(1000)
    # mark photos deleted (storage has no delete)
    await db.photos.update_many({"truck_id": truck_id}, {"$set": {"is_deleted": True}})
    await db.trucks.delete_one({"id": truck_id})
    return {"ok": True, "photos_removed": len(photos)}


# --- Photos ---
@api.post("/trucks/{truck_id}/photos")
async def upload_photo(
    truck_id: str,
    kategori: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    if kategori not in CATEGORIES:
        raise HTTPException(400, "Kategori tidak valid")
    truck = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    if not truck:
        raise HTTPException(404, "Truk tidak ditemukan")

    # Determine urutan for this category
    urut = await db.photos.count_documents({"truck_id": truck_id, "kategori": kategori}) + 1
    ext = "jpg"
    filename = f"{truck['nopol']}_{truck['tanggal_pemuatan']}_{kategori}_{urut:02d}.{ext}"
    photo_id = new_id()
    year, month, day = truck["tanggal_pemuatan"].split("-")
    storage_path = f"{APP_NAME}/{year}/{month}/{day}/{truck['nopol']}/{photo_id}.{ext}"

    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(400, "File terlalu besar (max 15MB)")

    put_object(storage_path, data, "image/jpeg")

    doc = {
        "id": photo_id,
        "truck_id": truck_id,
        "kategori": kategori,
        "filename": filename,
        "storage_path": storage_path,
        "size": len(data),
        "urutan": urut,
        "uploaded_by": user["username"],
        "uploaded_at": now_iso(),
        "is_deleted": False,
    }
    await db.photos.insert_one(doc)
    await refresh_truck_stats(truck_id)
    doc.pop("_id", None)
    return doc


@api.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str, user: dict = Depends(get_current_user)):
    photo = await db.photos.find_one({"id": photo_id})
    if not photo:
        raise HTTPException(404, "Foto tidak ditemukan")
    # operator can only delete their own uploads
    if user["role"] != "admin" and photo.get("uploaded_by") != user["username"]:
        raise HTTPException(403, "Tidak diizinkan")
    await db.photos.delete_one({"id": photo_id})
    await refresh_truck_stats(photo["truck_id"])
    return {"ok": True}


@api.get("/photos/{photo_id}/file")
async def download_photo(photo_id: str, request: Request, auth: Optional[str] = Query(None)):
    # Support ?auth=token for <img src>
    token = None
    if auth:
        token = auth
    else:
        token = request.cookies.get("access_token")
        if not token:
            h = request.headers.get("Authorization", "")
            if h.startswith("Bearer "):
                token = h[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(401, "Invalid token")

    photo = await db.photos.find_one({"id": photo_id, "is_deleted": False})
    if not photo:
        raise HTTPException(404, "Foto tidak ditemukan")
    data, ctype = get_object(photo["storage_path"])
    return FastResponse(content=data, media_type="image/jpeg")


# --- Dashboard ---
@api.get("/dashboard/summary")
async def dashboard_summary(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")

    trucks_today = await db.trucks.count_documents({"tanggal_pemuatan": today})
    trucks_yesterday = await db.trucks.count_documents({"tanggal_pemuatan": yesterday})
    trucks_week = await db.trucks.count_documents({"tanggal_pemuatan": {"$gte": week_ago}})
    complete_today = await db.trucks.count_documents({"tanggal_pemuatan": today, "status_kelengkapan": "lengkap"})
    incomplete_today = await db.trucks.count_documents({"tanggal_pemuatan": today, "status_kelengkapan": "belum_lengkap"})
    ekspor_today = await db.trucks.count_documents({"tanggal_pemuatan": today, "jenis_pemuatan": "EKSPOR"})
    lokal_today = await db.trucks.count_documents({"tanggal_pemuatan": today, "jenis_pemuatan": "LOKAL"})

    needs_attention = await db.trucks.find(
        {"status_kelengkapan": "belum_lengkap"}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)

    ready_destroy = await db.trucks.count_documents({"retention_date": {"$lte": today}})

    total_trucks = await db.trucks.count_documents({})

    return {
        "trucks_today": trucks_today,
        "trucks_yesterday": trucks_yesterday,
        "trucks_week": trucks_week,
        "total_trucks": total_trucks,
        "complete_today": complete_today,
        "incomplete_today": incomplete_today,
        "ekspor_today": ekspor_today,
        "lokal_today": lokal_today,
        "needs_attention": needs_attention,
        "ready_destroy": ready_destroy,
    }


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()

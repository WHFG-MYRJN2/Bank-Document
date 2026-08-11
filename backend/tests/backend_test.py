"""Backend integration tests for Truck Archive MVP."""
import os
import io
import struct
import zlib
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # fallback: read frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break

API = f"{BASE_URL}/api"


def _tiny_jpeg() -> bytes:
    # Minimal valid JPEG (1x1)
    return bytes.fromhex(
        "ffd8ffe000104a46494600010100000100010000"
        "ffdb0043000806060706050806070707090908"
        "0a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432"
        "ffc00011080001000103012200021101031101"
        "ffc4001f0000010501010101010100000000000000000102030405060708090a0b"
        "ffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9fa"
        "ffc4001f0100030101010101010101010000000000000102030405060708090a0b"
        "ffc400b5110002010204040304070504040001027700010203110405213106124151076171132232810814429191a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9fa"
        "ffda000c03010002110311003f00fbd0"
        "ffd9"
    )


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"}, timeout=30)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def operator_token():
    r = requests.post(f"{API}/auth/login", json={"username": "operator", "password": "operator123"}, timeout=30)
    assert r.status_code == 200, f"Operator login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "operator"
    return data["token"]


def h(token):
    return {"Authorization": f"Bearer {token}"}


# --- Auth ---
class TestAuth:
    def test_admin_login_sets_cookie(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"}, timeout=30)
        assert r.status_code == 200
        assert "access_token" in r.cookies or any("access_token" in c for c in r.headers.get("set-cookie", ""))
        d = r.json()
        assert d["user"]["username"] == "admin"
        assert d["user"]["role"] == "admin"
        assert isinstance(d["token"], str) and len(d["token"]) > 10

    def test_operator_login(self, operator_token):
        assert operator_token

    def test_me_with_bearer(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=h(admin_token), timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["username"] == "admin"
        assert d["role"] == "admin"
        assert "password_hash" not in d

    def test_me_no_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401

    def test_invalid_login(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "wrong"}, timeout=30)
        assert r.status_code == 401


# --- Queue ---
class TestQueue:
    def test_list_queue_has_seed(self, admin_token):
        r = requests.get(f"{API}/queue", headers=h(admin_token), timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 3, f"Expected >=3 seeded items, got {len(data)}"
        nopols = {q["nopol"] for q in data}
        assert "B1234ABC" in nopols

    def test_lookup_queue(self, admin_token):
        r = requests.get(f"{API}/queue/lookup/B1234ABC", headers=h(admin_token), timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get("nopol") == "B1234ABC"

    def test_create_queue(self, operator_token):
        r = requests.post(f"{API}/queue", headers=h(operator_token), json={
            "nopol": "TEST9999AA", "no_container": "TEST1234567", "tujuan": "TEST DEST", "jenis_pemuatan": "LOKAL"
        }, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["nopol"] == "TEST9999AA"
        assert d["status"] == "menunggu"


# --- Trucks + Photos ---
class TestTrucksAndPhotos:
    def test_full_truck_flow(self, admin_token, operator_token):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        # create truck
        r = requests.post(f"{API}/trucks", headers=h(admin_token), json={
            "nopol": "TESTB1111CC",
            "tanggal_pemuatan": today,
            "no_do": "DO/TEST/001",
            "no_container": "TESTCONT001",
            "nama_supir": "Test Driver",
            "tujuan": "Test Warehouse",
            "jenis_pemuatan": "LOKAL",
        }, timeout=30)
        assert r.status_code == 200, r.text
        truck = r.json()
        assert truck["status_kelengkapan"] == "belum_lengkap"
        # retention should be 2 years from tanggal_pemuatan
        expected_ret = (datetime.strptime(today, "%Y-%m-%d") + timedelta(days=365 * 2)).strftime("%Y-%m-%d")
        assert truck["retention_date"] == expected_ret
        assert truck["photo_counts"]["surat_jalan"] == 0

        truck_id = truck["id"]
        pytest.truck_id = truck_id  # stash

        # invalid category
        r = requests.post(
            f"{API}/trucks/{truck_id}/photos",
            headers=h(operator_token),
            data={"kategori": "invalid_cat"},
            files={"file": ("t.jpg", _tiny_jpeg(), "image/jpeg")},
            timeout=60,
        )
        assert r.status_code == 400

        # upload surat_jalan
        r = requests.post(
            f"{API}/trucks/{truck_id}/photos",
            headers=h(operator_token),
            data={"kategori": "surat_jalan"},
            files={"file": ("sj.jpg", _tiny_jpeg(), "image/jpeg")},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        p1 = r.json()
        assert "TESTB1111CC" in p1["filename"] and "surat_jalan" in p1["filename"]
        assert p1["filename"].endswith("_01.jpg")
        pytest.photo_id_admin_upload = None

        # upload foto_kendaraan (as admin so we can test cross-user delete)
        r = requests.post(
            f"{API}/trucks/{truck_id}/photos",
            headers=h(admin_token),
            data={"kategori": "foto_kendaraan"},
            files={"file": ("fk.jpg", _tiny_jpeg(), "image/jpeg")},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        p2 = r.json()
        pytest.photo_id_admin_upload = p2["id"]

        # truck now lengkap
        r = requests.get(f"{API}/trucks/{truck_id}", headers=h(admin_token), timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["truck"]["status_kelengkapan"] == "lengkap"
        assert d["truck"]["photo_counts"]["surat_jalan"] == 1
        assert d["truck"]["photo_counts"]["foto_kendaraan"] == 1
        assert len(d["photos"]) == 2

    def test_photo_download(self, admin_token, operator_token):
        # find a photo id
        truck_id = getattr(pytest, "truck_id", None)
        assert truck_id
        r = requests.get(f"{API}/trucks/{truck_id}", headers=h(admin_token), timeout=30)
        photos = r.json()["photos"]
        assert photos
        pid = photos[0]["id"]
        # with query auth
        r = requests.get(f"{API}/photos/{pid}/file?auth={admin_token}", timeout=60)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/jpeg")
        assert len(r.content) > 0

    def test_operator_cannot_delete_admin_photo(self, operator_token):
        pid = getattr(pytest, "photo_id_admin_upload", None)
        assert pid
        r = requests.delete(f"{API}/photos/{pid}", headers=h(operator_token), timeout=30)
        assert r.status_code == 403

    def test_filter_trucks(self, admin_token):
        r = requests.get(f"{API}/trucks", headers=h(admin_token), params={
            "nopol": "TESTB1111",
            "jenis_pemuatan": "LOKAL",
            "status_kelengkapan": "lengkap",
        }, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert any(t["nopol"] == "TESTB1111CC" for t in data)

    def test_ready_to_destroy_empty(self, admin_token):
        r = requests.get(f"{API}/trucks?ready_to_destroy=true", headers=h(admin_token), timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        # fresh data - all created today, retention 2y away - should be empty
        assert len(r.json()) == 0

    def test_operator_cannot_delete_truck(self, operator_token):
        truck_id = getattr(pytest, "truck_id", None)
        assert truck_id
        r = requests.delete(f"{API}/trucks/{truck_id}", headers=h(operator_token), timeout=30)
        assert r.status_code == 403

    def test_admin_can_delete_truck(self, admin_token):
        truck_id = getattr(pytest, "truck_id", None)
        assert truck_id
        r = requests.delete(f"{API}/trucks/{truck_id}", headers=h(admin_token), timeout=30)
        assert r.status_code == 200
        # confirm gone
        r = requests.get(f"{API}/trucks/{truck_id}", headers=h(admin_token), timeout=30)
        assert r.status_code == 404


# --- Dashboard ---
class TestDashboard:
    def test_summary(self, admin_token):
        r = requests.get(f"{API}/dashboard/summary", headers=h(admin_token), timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["trucks_today", "total_trucks", "complete_today", "incomplete_today",
                  "ekspor_today", "lokal_today", "needs_attention", "ready_destroy"]:
            assert k in d, f"missing {k}"
        assert isinstance(d["needs_attention"], list)


# --- Users ---
class TestUsers:
    def test_operator_cannot_create_user(self, operator_token):
        r = requests.post(f"{API}/users", headers=h(operator_token), json={
            "username": "TEST_denied", "password": "x", "name": "no", "role": "operator"
        }, timeout=30)
        assert r.status_code == 403

    def test_admin_creates_operator(self, admin_token):
        uname = f"test_op_{int(datetime.now().timestamp())}"
        r = requests.post(f"{API}/users", headers=h(admin_token), json={
            "username": uname, "password": "pass1234", "name": "Test Op", "role": "operator"
        }, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["username"] == uname
        assert d["role"] == "operator"
        assert "password_hash" not in d
        pytest.created_user_id = d["id"]

    def test_admin_cannot_delete_self(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=h(admin_token), timeout=30)
        my_id = r.json()["id"]
        r = requests.delete(f"{API}/users/{my_id}", headers=h(admin_token), timeout=30)
        assert r.status_code == 400

    def test_cleanup_created_user(self, admin_token):
        uid = getattr(pytest, "created_user_id", None)
        if uid:
            r = requests.delete(f"{API}/users/{uid}", headers=h(admin_token), timeout=30)
            assert r.status_code == 200

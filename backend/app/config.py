import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BACKEND_DIR / "storage" / "known_faces"
DB_PATH = BACKEND_DIR / "data.db"

# Repo root (parent of backend/)
REPO_ROOT = BACKEND_DIR.parent
SEED_IMAGES_DIR = REPO_ROOT / "images"

FACE_TOLERANCE = float(os.environ.get("FACE_TOLERANCE", "0.5"))
RECOGNITION_SCALE = float(os.environ.get("RECOGNITION_SCALE", "0.25"))

# Allowed image extensions for known faces
KNOWN_FACE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

import re
import shutil
import uuid
from pathlib import Path

import cv2
import face_recognition
import numpy as np

from .config import KNOWN_FACE_EXTENSIONS, SEED_IMAGES_DIR, STORAGE_DIR


def _sanitize_name(name: str) -> str:
    name = name.strip()
    if not name:
        raise ValueError("name is required")
    # Allow letters, numbers, spaces, hyphens; collapse unsafe chars
    cleaned = re.sub(r"[^\w\s\-]", "", name, flags=re.UNICODE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        raise ValueError("invalid name")
    if len(cleaned) > 80:
        cleaned = cleaned[:80]
    return cleaned


def _safe_filename_stem(name: str) -> str:
    stem = re.sub(r"[^\w\-]", "_", name, flags=re.UNICODE)
    if not stem:
        stem = "unknown"
    return stem[:80]


def _list_image_files(directory: Path) -> list[Path]:
    if not directory.is_dir():
        return []
    out: list[Path] = []
    for p in sorted(directory.iterdir()):
        if p.is_file() and p.suffix.lower() in KNOWN_FACE_EXTENSIONS:
            out.append(p)
    return out


def _encode_image_bgr(img_bgr: np.ndarray) -> np.ndarray:
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    encs = face_recognition.face_encodings(rgb)
    if not encs:
        raise ValueError("no face found in image")
    if len(encs) > 1:
        raise ValueError("multiple faces found; use an image with exactly one face")
    return encs[0]


class FaceDB:
    """In-memory encodings keyed by display name (image filename stem)."""

    def __init__(self) -> None:
        self._names: list[str] = []
        self._encodings: list[np.ndarray] = []
        self._path_by_name: dict[str, Path] = {}

    def _reload_from_disk(self) -> None:
        self._path_by_name.clear()
        self._names.clear()
        self._encodings.clear()
        for p in _list_image_files(STORAGE_DIR):
            stem = p.stem
            # Use stem as display name; if duplicate stems exist, first wins
            if stem in self._path_by_name:
                continue
            img = cv2.imread(str(p))
            if img is None:
                continue
            try:
                enc = _encode_image_bgr(img)
            except ValueError:
                continue
            self._path_by_name[stem] = p
            self._names.append(stem)
            self._encodings.append(enc)

    def seed_from_repo_images_if_empty(self) -> None:
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        existing = _list_image_files(STORAGE_DIR)
        if existing:
            return
        seed_files = _list_image_files(SEED_IMAGES_DIR)
        for src in seed_files:
            dst_stem = _safe_filename_stem(src.stem)
            dst = STORAGE_DIR / f"{dst_stem}{src.suffix.lower()}"
            # Avoid overwrite
            if dst.exists():
                dst = STORAGE_DIR / f"{dst_stem}_{uuid.uuid4().hex[:8]}{src.suffix.lower()}"
            shutil.copy2(src, dst)

    def load_all(self) -> None:
        self.seed_from_repo_images_if_empty()
        self._reload_from_disk()

    def list_faces(self) -> list[str]:
        return sorted(self._path_by_name.keys())

    def get_image_path(self, name: str) -> Path | None:
        return self._path_by_name.get(name)

    def get_known_encodings(self) -> tuple[list[np.ndarray], list[str]]:
        return self._encodings, list(self._names)

    def add_face(self, name: str, data: bytes, original_suffix: str) -> str:
        name = _sanitize_name(name)
        stem = _safe_filename_stem(name)
        suffix = original_suffix.lower() if original_suffix else ".jpg"
        if suffix not in KNOWN_FACE_EXTENSIONS:
            suffix = ".jpg"
        path = STORAGE_DIR / f"{stem}{suffix}"
        if path.exists() or stem in self._path_by_name:
            stem = f"{stem}_{uuid.uuid4().hex[:8]}"
            path = STORAGE_DIR / f"{stem}{suffix}"

        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

        img = cv2.imread(str(path))
        if img is None:
            path.unlink(missing_ok=True)
            raise ValueError("could not decode image")

        try:
            enc = _encode_image_bgr(img)
        except ValueError as e:
            path.unlink(missing_ok=True)
            raise ValueError(str(e)) from e

        self._path_by_name[stem] = path
        self._names.append(stem)
        self._encodings.append(enc)
        return stem

    def delete_face(self, name: str) -> bool:
        p = self._path_by_name.get(name)
        if p is None:
            return False
        try:
            p.unlink(missing_ok=True)
        except OSError:
            pass
        self._reload_from_disk()
        return True


known_faces = FaceDB()

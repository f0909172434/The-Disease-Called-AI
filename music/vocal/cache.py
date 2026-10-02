"""Content-addressed render cache in music/build/cache/.

A cache key hashes the inputs of a stage *and* the source code of the modules it depends
on, so editing the engine invalidates exactly the renders it affects."""
from __future__ import annotations

import hashlib
import json
import os
import pickle
import re

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.normpath(os.path.join(HERE, "..", "build", "cache"))
ENABLED = True


def _src_hash(files: list[str]) -> str:
    h = hashlib.sha1()
    for f in files:
        with open(os.path.join(HERE, f), "rb") as fh:
            h.update(fh.read())
    return h.hexdigest()


def key(stage: str, *parts, sources: list[str] = ()) -> str:
    h = hashlib.sha1(stage.encode())
    for p in parts:
        h.update(json.dumps(p, sort_keys=True, ensure_ascii=False, default=str).encode())
    h.update(_src_hash(list(sources)).encode())
    return h.hexdigest()[:16]


def _path(stage: str, name: str, k: str) -> str:
    return os.path.join(CACHE_DIR, f"{stage}_{name}_{k}.pkl")


def load(stage: str, name: str, k: str):
    if not ENABLED:
        return None
    p = _path(stage, name, k)
    if os.path.exists(p):
        try:
            with open(p, "rb") as fh:
                return pickle.load(fh)
        except Exception:
            return None
    return None


def save(stage: str, name: str, k: str, obj) -> None:
    if not ENABLED:
        return
    os.makedirs(CACHE_DIR, exist_ok=True)
    # one entry per (stage, line): drop stale versions (exact name match: "C1_1" must not
    # touch "C1_1_dbl")
    stale = re.compile(re.escape(f"{stage}_{name}_") + r"[0-9a-f]{16}\.pkl$")
    for f in os.listdir(CACHE_DIR):
        if stale.match(f) and k not in f:
            try:
                os.remove(os.path.join(CACHE_DIR, f))
            except OSError:
                pass
    tmp = _path(stage, name, k) + ".tmp"
    with open(tmp, "wb") as fh:
        pickle.dump(obj, fh, protocol=pickle.HIGHEST_PROTOCOL)
    os.replace(tmp, _path(stage, name, k))

"""Python side of ourender: run it on a .ustx and read back the per-part WAV + JSON."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import time
from functools import lru_cache

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
BIN = os.environ.get("OURENDER", os.path.join(HERE, "bin", "ourender"))
DATA = os.environ.get("OURENDER_DATA", os.path.join(HERE, "oudata"))
SR = 44100


class OurenderError(RuntimeError):
    pass


def available() -> bool:
    return os.path.exists(BIN) and os.access(BIN, os.X_OK)


@lru_cache(maxsize=None)
def build_id() -> str:
    """Identifies the renderer build (for caches): hash of ourender.dll + OpenUtau.Core.dll."""
    h = hashlib.sha1()
    for f in ("ourender.dll", "OpenUtau.Core.dll", "libonnxruntime.so"):
        p = os.path.join(os.path.dirname(BIN), f)
        if os.path.exists(p):
            st = os.stat(p)
            h.update(f"{f}:{st.st_size}".encode())
            with open(p, "rb") as fh:                  # first MB is enough to tell builds apart
                h.update(fh.read(1 << 20))
    return h.hexdigest()[:12]


def run(command: str, project: str, out_dir: str, *, pitch: str = "ustx", steps: int | None = None,
        depth: float | None = None, voicebanks: str | None = None, data: str | None = None,
        save_ustx: str | None = None, timeout_min: float = 60, log=print) -> dict:
    """`ourender phonemize|render`; returns its JSON summary (raises on failure)."""
    if not available():
        raise OurenderError(f"{BIN} not built: run music/diffsinger/setup.sh")
    cmd = [BIN, command, "--project", project, "--out", out_dir, "--data", data or DATA,
           "--timeout", str(timeout_min)]
    if voicebanks:
        cmd += ["--voicebanks", voicebanks]
    if command == "render":
        cmd += ["--pitch", pitch]
        if steps:
            cmd += ["--steps", str(steps)]
        if depth is not None:
            cmd += ["--depth", str(depth)]
    if save_ustx:
        cmd += ["--save-ustx", save_ustx]
    t = time.time()
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_min * 60 + 120)
    last = [l for l in p.stdout.splitlines() if l.startswith("{")]
    try:
        res = json.loads(last[-1]) if last else {}
    except json.JSONDecodeError:
        res = {}
    if p.returncode != 0 or not res.get("ok"):
        raise OurenderError(f"ourender {command} failed ({p.returncode}): "
                            f"{res.get('errors') or p.stderr[-2000:]}")
    res["wall_seconds"] = round(time.time() - t, 2)
    if log:
        msg = f"ourender {command}: {len(res.get('parts', []))} parts in {res['wall_seconds']} s"
        if command == "render":
            msg += f" ({res.get('audio_seconds')} s audio, RTF {res.get('realtime_factor')})"
        log(msg)
    return res


def load_part(out_dir: str, name: str, audio: bool = True) -> dict:
    """The JSON ourender wrote for a part (+ "audio": float32 @ 44.1 kHz when rendered)."""
    with open(os.path.join(out_dir, safe_name(name) + ".json"), encoding="utf-8") as fh:
        info = json.load(fh)
    if audio and info.get("wav"):
        import soundfile as sf
        x, sr = sf.read(os.path.join(out_dir, info["wav"]), dtype="float32")
        assert sr == SR, sr
        info["audio"] = x
    return info


def f0_curve(info: dict) -> tuple[np.ndarray, np.ndarray]:
    """The pitch the acoustic model was given: (song seconds, MIDI), phrases concatenated."""
    t = np.concatenate([np.asarray(c["t_ms"], float) for c in info.get("f0", [])] or [np.zeros(0)])
    m = np.concatenate([np.asarray(c["midi"], float) for c in info.get("f0", [])] or [np.zeros(0)])
    order = np.argsort(t, kind="stable")
    return t[order] / 1000.0, m[order]


def safe_name(s: str) -> str:
    bad = set('/\0 ')
    return "".join("_" if c in bad else c for c in s)

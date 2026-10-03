#!/usr/bin/env python3
"""
Check that DiffSinger renders are reproducible: render some lines twice from scratch and
compare the samples.

    python3 music/diffsinger/check_determinism.py                      # C1_2, PO_1, B_L1
    python3 music/diffsinger/check_determinism.py --lines C1_5,F_1_ai

Each run is a separate process with an empty render cache and an empty OpenUtau data dir
(no tensor cache), going through the whole backend (pass 1 timing, pass 2/3 renders, styling)
with the takes / diction of the committed files. Raw DiffSinger audio of every bank and the
finished line must be bit-identical. The defaults cover TIGER (C1_2, human), Hanami (PO_1,
AI) and a her->him blend rendered by both banks (B_L1). Exit status 1 on any difference.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
VOCAL = os.path.normpath(os.path.join(HERE, "..", "vocal"))
VOCALS_JSON = os.path.normpath(os.path.join(HERE, "..", "build", "vocals.json"))


def render(lines: list[str], out: str, work: str) -> None:
    """One clean render (child process): raw renders + finished lines -> `out` (.npz)."""
    os.environ["OURENDER_DATA"] = os.path.join(work, "oudata")
    for p in (HERE, VOCAL):
        if p not in sys.path:
            sys.path.insert(0, p)
    import cache
    cache.CACHE_DIR = os.path.join(work, "cache")
    import numpy as np
    import diffsinger_backend as dsb
    with open(VOCALS_JSON) as fh:
        v = json.load(fh)
    L = {l["id"]: l for l in v["lines"]}
    sel = [L[i] for i in lines]
    dsb.prepare(sel, v["voices"], log=lambda *_: None)
    arr = {}
    for l in sel:
        e = cache.load("ds", l["id"], dsb.ds_key(l, v["voices"], dsb.config()))
        for k, r in enumerate(e["renders"]):
            arr[f"{l['id']} raw {r['bank']}"] = r["audio"]
        arr[f"{l['id']} finished"] = dsb.render_sung(l, v["voices"]).audio
    np.savez(out, **arr)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--lines", default="C1_2,PO_1,B_L1")
    ap.add_argument("--child", help=argparse.SUPPRESS)
    a = ap.parse_args(argv)
    lines = a.lines.split(",")
    if a.child:
        render(lines, a.child, os.path.dirname(a.child))
        return 0
    import numpy as np
    with tempfile.TemporaryDirectory(prefix="ds_determinism_") as d:
        outs = []
        for run in ("a", "b"):
            os.makedirs(os.path.join(d, run))
            out = os.path.join(d, run, "audio.npz")
            subprocess.run([sys.executable, os.path.abspath(__file__), "--lines", a.lines, "--child", out],
                           check=True)
            outs.append(np.load(out))
        bad = 0
        for k in outs[0].files:
            x, y = outs[0][k], outs[1][k]
            same = x.shape == y.shape and np.array_equal(x, y)
            bad += not same
            print(f"{k:28s} {len(x) / (44100 if ' raw ' in k else 48000):6.2f} s  "
                  f"{'bit-identical' if same else 'DIFFERENT'}")
    print("reproducible" if not bad else f"{bad} differ")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())

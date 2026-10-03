#!/usr/bin/env python3
"""
Make DiffSinger renders reproducible: turn every random op of a bank's ONNX models into an
input that ourender fills with seeded noise.

    music/diffsinger/.venv/bin/python music/diffsinger/seed_models.py            # all banks
    music/diffsinger/.venv/bin/python music/diffsinger/seed_models.py --check    # report only

DiffSinger samples inside the ONNX graphs: the acoustic and pitch/variance models draw the
diffusion / rectified-flow start noise (RandomNormalLike), the NSF-HiFiGAN vocoders draw the
harmonics' start phases (RandomUniform) and the source noise (RandomNormalLike). None has a
seed, and ONNX Runtime's C# API has no global seed, so two renders of the same input differ.
Here each such node becomes

    RandomNormalLike(x)      ->  Reshape(Slice(ourender_normal_<k>__t<n>, 0, Size(x)), Shape(x))
    RandomUniform(shape=S)   ->  low + (high-low) * Reshape(Slice(ourender_uniform_<k>__f<|S|>), S)

and OpenUtau (patched by ourender/openutau-seeded-noise.patch, DiffSingerNoise.cs) feeds
those inputs: n values per frame ("t") or a fixed count ("f") from xoshiro256** seeded by
XXH64(line/part key | take | phrase | model | input). Same key -> bit-identical audio on any
machine with the same build; a new take number -> a new performance.

The models are rewritten in place (atomically) and marked (metadata "ourender_seeded"); the
original zips restore them (fetch_voicebanks.sh). The rewritten banks need ourender: stock
OpenUtau would report the extra inputs as missing.
"""
from __future__ import annotations

import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
MARK = "ourender_seeded"

# noise values per frame for "like" ops, by model kind (frames = the largest dim 1 of the
# model's other inputs: mel / f0 frames). Generous: a too-small bank makes Reshape fail loudly.
PER_FRAME = {"acoustic": 1024, "pitch": 256, "variance": 1024}


def models_of(bank_dir: str, deps_dir: str) -> list[tuple[str, str, int]]:
    """[(path, kind, per-frame count)] of a bank's ONNX models that may sample."""
    import yaml

    def cfg(p):
        try:
            with open(p, encoding="utf-8-sig") as fh:
                return yaml.safe_load(fh) or {}
        except OSError:
            return None
    out = []
    root = cfg(os.path.join(bank_dir, "dsconfig.yaml")) or {}
    if root.get("acoustic"):
        out.append((os.path.join(bank_dir, root["acoustic"]), "acoustic", PER_FRAME["acoustic"]))
    for sub, key in (("dspitch", "pitch"), ("dsvariance", "variance")):
        c = cfg(os.path.join(bank_dir, sub, "dsconfig.yaml"))
        if c and c.get(key):
            out.append((os.path.join(bank_dir, sub, c[key]), key, PER_FRAME[key]))
    # vocoder: the bank's own dsvocoder/ wins (as in OpenUtau), else the named dependency
    voc_dirs = [os.path.join(bank_dir, "dsvocoder")]
    if root.get("vocoder"):
        voc_dirs.append(os.path.join(deps_dir, str(root["vocoder"])))
    for d in voc_dirs:
        c = cfg(os.path.join(d, "vocoder.yaml"))
        if c:
            hop = int(c.get("hop_size", 512))
            out.append((os.path.join(d, c.get("model", "model.onnx")), "vocoder", hop))
            break
    return [o for o in out if os.path.exists(o[0])]


def seed_model(path: str, kind: str, per_frame: int, check: bool = False) -> str:
    import onnx
    from onnx import TensorProto, helper
    m = onnx.load(path)
    if any(p.key == MARK for p in m.metadata_props):
        return "already seeded"
    g = m.graph
    rnd = [n for n in g.node if n.op_type in ("RandomNormalLike", "RandomUniformLike", "RandomNormal", "RandomUniform")]
    if not rnd:
        return "no random ops"
    if check:
        return f"{len(rnd)} random op(s): " + ", ".join(n.op_type for n in rnd)
    # vocoders: per-frame normal noise = hop x number of harmonics (from the phase draw)
    harm = max([helper.get_attribute_value(a)[-1] for n in rnd if n.op_type == "RandomUniform"
                for a in n.attribute if a.name == "shape"] or [16])
    new_nodes, k = [], 0
    for node in g.node:
        if node not in rnd:
            new_nodes.append(node)
            continue
        at = {a.name: helper.get_attribute_value(a) for a in node.attribute}
        normal = node.op_type in ("RandomNormalLike", "RandomNormal")
        like = node.op_type.endswith("Like")
        if like:
            n = per_frame * (harm + 1) if kind == "vocoder" else per_frame
            name = f"ourender_{'normal' if normal else 'uniform'}_{k}__t{n}"
        else:
            shape = list(at["shape"])
            count = 1
            for s in shape:
                count *= int(s)
            name = f"ourender_{'normal' if normal else 'uniform'}_{k}__f{count}"
        g.input.append(helper.make_tensor_value_info(name, TensorProto.FLOAT, [f"{name}_len"]))
        p = f"/ourender/{k}/"
        out = node.output[0]
        raw = p + "raw"
        c0 = p + "zero"
        c1 = p + "axis"
        new_nodes += [helper.make_node("Constant", [], [c0], value=helper.make_tensor(c0, TensorProto.INT64, [1], [0])),
                      helper.make_node("Constant", [], [c1], value=helper.make_tensor(c1, TensorProto.INT64, [1], [0]))]
        if like:
            x = node.input[0]
            new_nodes += [
                helper.make_node("Size", [x], [p + "size"]),
                helper.make_node("Unsqueeze", [p + "size", c1], [p + "end"]),
                helper.make_node("Slice", [name, c0, p + "end", c1], [p + "flat"]),
                helper.make_node("Shape", [x], [p + "shape"]),
                helper.make_node("Reshape", [p + "flat", p + "shape"], [raw]),
            ]
        else:
            shp = p + "shapec"
            endc = p + "endc"
            new_nodes += [
                helper.make_node("Constant", [], [shp], value=helper.make_tensor(shp, TensorProto.INT64, [len(shape)], shape)),
                helper.make_node("Constant", [], [endc], value=helper.make_tensor(endc, TensorProto.INT64, [1], [count])),
                helper.make_node("Slice", [name, c0, endc, c1], [p + "flat"]),
                helper.make_node("Reshape", [p + "flat", shp], [raw]),
            ]
        if normal:
            mean, scale = float(at.get("mean", 0.0)), float(at.get("scale", 1.0))
        else:
            mean, scale = float(at.get("low", 0.0)), float(at.get("high", 1.0)) - float(at.get("low", 0.0))
        if mean == 0.0 and scale == 1.0:
            new_nodes.append(helper.make_node("Identity", [raw], [out]))
        else:
            sc, mc = p + "scale", p + "mean"
            new_nodes += [helper.make_node("Constant", [], [sc], value=helper.make_tensor(sc, TensorProto.FLOAT, [], [scale])),
                          helper.make_node("Constant", [], [mc], value=helper.make_tensor(mc, TensorProto.FLOAT, [], [mean])),
                          helper.make_node("Mul", [raw, sc], [p + "scaled"]),
                          helper.make_node("Add", [p + "scaled", mc], [out])]
        k += 1
    del g.node[:]
    g.node.extend(new_nodes)
    m.metadata_props.append(onnx.StringStringEntryProto(key=MARK, value="1"))
    tmp = path + ".seeding.tmp"
    onnx.save(m, tmp)
    import onnxruntime as ort                    # must load before it replaces the original
    ins = [i.name for i in ort.InferenceSession(tmp, providers=["CPUExecutionProvider"]).get_inputs()]
    assert any(i.startswith("ourender_") for i in ins), ins
    os.replace(tmp, path)
    return f"seeded {k} random op(s)"


def main(argv=None):
    import banks as bk
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--voicebanks", default=bk.VOICEBANKS)
    ap.add_argument("--check", action="store_true", help="only report")
    a = ap.parse_args(argv)
    deps = os.path.join(a.voicebanks, "Dependencies")
    found = bk.scan(a.voicebanks)
    if not found:
        print(f"no DiffSinger banks in {a.voicebanks}")
    for b in found:
        for path, kind, n in models_of(b["folder"], deps):
            print(f"{b['name']}: {kind:8s} {os.path.relpath(path, a.voicebanks)}: "
                  f"{seed_model(path, kind, n, a.check)}")


if __name__ == "__main__":
    main()

"""Mux the rendered picture with the master and encode the deliverables.

    python3 tools/assemble.py --video output/video.mp4 [--audio music/build/master.wav]

Writes
    output/病名為AI_The_Disease_Called_AI.mp4      two-pass H.264 sized to stay under GitHub's 100 MB limit
    output/病名為AI_The_Disease_Called_AI_HQ.mp4   CRF 16 archive copy (not committed if too large)
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
NAME = "病名為AI_The_Disease_Called_AI"


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=codec_name,width,height,r_frame_rate",
                          "-of", "json", path], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def run(cmd):
    print("$", " ".join(cmd))
    subprocess.run(cmd, check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", default=os.path.join(ROOT, "output", "video.mp4"))
    ap.add_argument("--audio", default=os.path.join(ROOT, "music", "build", "master.wav"))
    ap.add_argument("--duration", type=float, default=215.0)
    ap.add_argument("--max-mb", type=float, default=95.0)
    ap.add_argument("--audio-kbps", type=int, default=192)
    ap.add_argument("--skip-hq", action="store_true")
    args = ap.parse_args()

    out_dir = os.path.join(ROOT, "output")
    os.makedirs(out_dir, exist_ok=True)
    common_in = ["-i", args.video, "-i", args.audio, "-map", "0:v:0", "-map", "1:a:0", "-t", f"{args.duration:.3f}"]
    x264 = ["-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-pix_fmt", "yuv420p",
            "-x264-params", "keyint=60:min-keyint=30:aq-mode=3:deblock=-1,-1"]

    # 1) GitHub-sized copy: two-pass ABR with a hard size budget
    audio_bits = args.audio_kbps * 1000 * args.duration
    budget_bits = args.max_mb * 1e6 * 8 * 0.985 - audio_bits      # 1.5 % container overhead
    vkbps = int(budget_bits / args.duration / 1000)
    final = os.path.join(out_dir, f"{NAME}.mp4")
    with tempfile.TemporaryDirectory() as tmp:
        log = os.path.join(tmp, "x264pass")
        run(["ffmpeg", "-y", "-i", args.video, "-t", f"{args.duration:.3f}", *x264, "-b:v", f"{vkbps}k",
             "-pass", "1", "-passlogfile", log, "-an", "-f", "mp4", os.devnull])
        run(["ffmpeg", "-y", *common_in, *x264, "-b:v", f"{vkbps}k", "-maxrate", f"{int(vkbps * 2.2)}k",
             "-bufsize", f"{int(vkbps * 4)}k", "-pass", "2", "-passlogfile", log,
             "-c:a", "aac", "-b:a", f"{args.audio_kbps}k", "-ar", "48000",
             "-movflags", "+faststart", "-metadata", "title=病名為AI / The Disease Called AI", final])

    # 2) archive copy
    if not args.skip_hq:
        hq = os.path.join(out_dir, f"{NAME}_HQ.mp4")
        run(["ffmpeg", "-y", *common_in, *x264[:-2], "-crf", "16", "-c:a", "aac", "-b:a", "320k",
             "-movflags", "+faststart", hq])

    info = probe(final)
    size_mb = int(info["format"]["size"]) / 1e6
    print(json.dumps({"file": final, "size_mb": round(size_mb, 2), "video_kbps": vkbps,
                      "duration": float(info["format"]["duration"]), "streams": info["streams"]}, ensure_ascii=False, indent=1))
    if size_mb >= 100:
        raise SystemExit("final MP4 exceeds GitHub's 100 MB limit")


if __name__ == "__main__":
    main()

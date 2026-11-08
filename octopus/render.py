"""Render the film.

  python3 render.py --stills 10,40,90          # preview PNGs into build/stills/
  python3 render.py --workers 4                # full render -> build/video_noaudio.mp4
"""
import argparse, json, os, subprocess, sys
from multiprocessing import Process
import skia
from draw import W, H
from scenes import X, render_frame

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")


def load():
    tl = json.load(open(os.path.join(BUILD, "timeline.json")))
    xs = [X(s) for s in tl["scenes"]]
    return tl, xs


def stills(times):
    tl, xs = load()
    os.makedirs(os.path.join(BUILD, "stills"), exist_ok=True)
    surf = skia.Surface(W, H)
    c = surf.getCanvas()
    for t in times:
        render_frame(c, t, tl, xs)
        p = os.path.join(BUILD, "stills", f"t{t:07.2f}.png")
        surf.makeImageSnapshot().save(p, skia.kPNG)
        print(p)


def worker(idx, f0, f1, fps):
    tl, xs = load()
    out = os.path.join(BUILD, f"seg_{idx:02d}.mp4")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}", "-r", str(fps),
           "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-tune", "animation", out]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    surf = skia.Surface(W, H)
    c = surf.getCanvas()
    for f in range(f0, f1):
        render_frame(c, f / fps, tl, xs)
        ff.stdin.write(surf.makeImageSnapshot().tobytes())
        if (f - f0) % 300 == 0:
            print(f"[w{idx}] {f - f0}/{f1 - f0}", flush=True)
    ff.stdin.close()
    ff.wait()


def full(workers, fps):
    tl, _ = load()
    n = int(round(tl["duration"] * fps))
    bounds = [n * i // workers for i in range(workers + 1)]
    ps = [Process(target=worker, args=(i, bounds[i], bounds[i + 1], fps)) for i in range(workers)]
    for p in ps:
        p.start()
    for p in ps:
        p.join()
        if p.exitcode != 0:
            sys.exit("worker failed")
    lst = os.path.join(BUILD, "segments.txt")
    with open(lst, "w") as f:
        for i in range(workers):
            f.write(f"file 'seg_{i:02d}.mp4'\n")
    subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy",
                           os.path.join(BUILD, "video_noaudio.mp4")])
    print("done", n, "frames")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--stills")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--fps", type=int, default=30)
    a = ap.parse_args()
    if a.stills:
        stills([float(v) for v in a.stills.split(",")])
    else:
        full(a.workers, a.fps)

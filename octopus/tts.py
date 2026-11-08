"""Generate voice lines with Kokoro (local neural TTS) and build timeline.json.

Usage: python3 tts.py --model kokoro.onnx --voices voices.bin
Outputs build/voice/*.wav and build/timeline.json
"""
import argparse, json, os
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from script import SCENES, VOICES

SR = 24000
FPS = 30
HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")


def trim(x, thr=0.004):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(0.03 * SR))
    b = min(len(x), idx[-1] + int(0.08 * SR))
    return x[a:b]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--voices", required=True)
    args = ap.parse_args()
    os.makedirs(os.path.join(BUILD, "voice"), exist_ok=True)
    k = Kokoro(args.model, args.voices)
    t = 0.0
    timeline = {"fps": FPS, "scenes": []}
    for si, (name, lead, lines) in enumerate(SCENES):
        scene = {"name": name, "start": t, "lines": []}
        t += lead
        for li, line in enumerate(lines):
            spk, text = line[0], line[1]
            pause = line[2] if len(line) > 2 else 0.5
            voice, speed = VOICES[spk]
            path = os.path.join(BUILD, "voice", f"{si:02d}_{li:02d}_{spk.lower()}.wav")
            if os.path.exists(path):
                audio, _ = sf.read(path)
            else:
                audio, sr = k.create(text, voice=voice, speed=speed, lang="en-us")
                assert sr == SR
                audio = trim(np.asarray(audio, dtype=np.float32))
                sf.write(path, audio, SR)
            dur = len(audio) / SR
            # per-frame loudness envelope for mouth animation
            hop = SR // FPS
            n = int(np.ceil(len(audio) / hop))
            env = [float(np.sqrt(np.mean(audio[i * hop:(i + 1) * hop] ** 2) + 1e-12)) for i in range(n)]
            peak = max(env) or 1.0
            env = [round(min(1.0, e / (0.6 * peak)), 3) for e in env]
            scene["lines"].append({"speaker": spk, "text": text, "start": round(t, 3),
                                   "end": round(t + dur, 3), "wav": os.path.relpath(path, HERE), "env": env})
            print(f"{t:7.2f}s  {spk:9s} {dur:5.2f}s  {text[:60]}")
            t += dur + pause
        scene["end"] = t
        timeline["scenes"].append(scene)
    timeline["duration"] = t
    with open(os.path.join(BUILD, "timeline.json"), "w") as f:
        json.dump(timeline, f)
    print(f"TOTAL {t:.1f}s = {t/60:.2f} min")


if __name__ == "__main__":
    main()

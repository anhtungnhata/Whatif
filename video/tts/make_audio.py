"""Generate voices (Kokoro TTS), a synthesized music bed, and the final mix.
Outputs: public/audio/mix.wav and src/data/timing.json"""
import json, os, subprocess, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 24000
SHOT = 10.0
VOICES = {  # who: (voice, lang, base speed, pitch semitones)
    "N": ("am_onyx", "en-us", 0.98, 0),
    "P": ("bm_george", "en-gb", 1.05, 0),
    "M": ("am_puck", "en-us", 1.12, 4.0),
    "L": ("af_heart", "en-us", 1.08, 2.0),
}
script = json.load(open(f"{ROOT}/src/data/script.json"))
k = Kokoro(f"{ROOT}/tts/kokoro-v1.0.int8.onnx", f"{ROOT}/tts/voices-v1.0.bin")
tmp = f"{ROOT}/tts/cache"; os.makedirs(tmp, exist_ok=True)

def synth(who, text, speed):
    voice, lang, base, pitch = VOICES[who]
    s, sr = k.create(text, voice=voice, speed=base * speed, lang=lang)
    assert sr == SR
    if pitch:
        a, b = f"{tmp}/in.wav", f"{tmp}/out.wav"
        sf.write(a, s, SR)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a, "-af",
                        f"rubberband=pitch={2 ** (pitch / 12):.4f}:formant=preserved", b], check=True)
        s, _ = sf.read(b)
    # trim silence
    idx = np.where(np.abs(s) > 0.01)[0]
    s = s[max(0, idx[0] - 240): idx[-1] + 480]
    return s.astype(np.float32)

def layout(shot, clips):
    t, out = 0.45, []
    for line, c in zip(shot["lines"], clips):
        t = max(t, line.get("at", 0))
        out.append(t); t += len(c) / SR + 0.32
    return out, t

total = int(SHOT * 36 * SR)
voice = np.zeros(total, np.float32)
timing = []
for shot in script:
    speed = 1.0
    while True:
        clips = [synth(l["who"], l["text"], speed) for l in shot["lines"]]
        starts, end = layout(shot, clips)
        if end - 0.32 <= 9.7 or speed > 1.4: break
        speed += 0.06
    base = (shot["n"] - 1) * SHOT
    for l, c, st in zip(shot["lines"], clips, starts):
        i = int((base + st) * SR)
        voice[i:i + len(c)] += c[: total - i]
        timing.append({"shot": shot["n"], "who": l["who"], "text": l["text"],
                       "start": round(base + st, 3), "end": round(base + st + len(c) / SR, 3)})
    print(shot["n"], f"speed={speed:.2f}", f"end={end - 0.32:.2f}s")

# ---------- music bed (synthesized) ----------
t = np.arange(total) / SR
def note(f): return 440 * 2 ** ((f - 69) / 12)
# chord per shot (MIDI roots) - mood map
mood = {}
for n in range(1, 37):
    if n <= 2: mood[n] = ("dark", [38, 45, 50])
    elif n <= 8: mood[n] = ("bright", [48, 55, 64, 67] if n % 2 else [53, 60, 65, 69])
    elif n <= 12: mood[n] = ("epic", [43, 50, 59, 62] if n % 2 else [45, 52, 60, 64])
    elif n <= 25: mood[n] = ("bright", [[48, 55, 64], [53, 57, 65], [55, 62, 67], [45, 52, 60]][n % 4])
    elif n <= 28: mood[n] = ("dark", [38, 45, 50, 53])
    elif n <= 34: mood[n] = ("soft", [[45, 52, 60, 64], [41, 48, 57, 60], [48, 55, 64, 67], [43, 50, 59, 62]][n % 4])
    else: mood[n] = ("dark", [40, 47, 52, 55])
music = np.zeros(total, np.float32)
fade = int(0.8 * SR)
for n in range(1, 37):
    kind, chord = mood[n]
    a, b = int((n - 1) * SHOT * SR), int(n * SHOT * SR)
    a0 = max(0, a - fade); b0 = min(total, b + fade)
    tt = t[a0:b0]
    seg = np.zeros(b0 - a0, np.float32)
    for m in chord:
        f = note(m)
        seg += (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.003 * tt) + 0.15 * np.sin(2 * np.pi * f * 0.5 * tt)).astype(np.float32)
    seg *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.15 * tt)  # slow swell
    if kind == "dark":
        seg *= 0.7; seg += 0.6 * np.sin(2 * np.pi * note(chord[0] - 12) * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * 2 * tt))
    if kind in ("bright", "epic"):  # gentle plucked arpeggio
        step = 0.5 if kind == "bright" else 0.75
        for j, st in enumerate(np.arange(0, SHOT, step)):
            i = int(st * SR) + (a - a0); L = int(0.45 * SR)
            if i + L > len(seg): break
            f = note(chord[j % len(chord)] + 12)
            env = np.exp(-np.arange(L) / SR * 7)
            seg[i:i + L] += 0.9 * np.sin(2 * np.pi * f * np.arange(L) / SR) * env
    w = np.ones(b0 - a0, np.float32)
    r = np.linspace(0, 1, a - a0 + 1)[1:] if a > a0 else []
    if len(r): w[: len(r)] = r
    rr = b0 - b
    if rr > 0: w[-rr:] = np.linspace(1, 0, rr)
    music[a0:b0] += seg * w
music /= np.abs(music).max()
# title hit at 00:15 and end sting at 05:58
def hit(sec, root, amp=1.0, dur=3.0):
    i = int(sec * SR); L = int(dur * SR); tt = np.arange(L) / SR
    s = sum(np.sin(2 * np.pi * note(m) * tt) for m in (root, root + 7, root + 12, root + 16))
    s += 0.8 * np.random.default_rng(1).normal(size=L) * np.exp(-tt * 18)
    music[i:i + L] += (amp * 0.5 * s * np.exp(-tt * 1.2)).astype(np.float32)[: total - i]
hit(15.0, 50); hit(50.0 + 3.0, 55, 0.6); hit(357.5, 52, 0.9, 2.5)
# wind noise for storm shots
rng = np.random.default_rng(7)
noise = rng.normal(size=total).astype(np.float32)
from numpy.fft import rfft, irfft
spec = rfft(noise); freqs = np.fft.rfftfreq(total, 1 / SR); spec[freqs > 700] *= 0.05; wind = irfft(spec, total).astype(np.float32)
wind /= np.abs(wind).max()
wenv = np.zeros(total, np.float32)
for a, b in [(0, 20), (250, 280)]:
    wenv[int(a * SR):int(b * SR)] = 1
wenv = np.convolve(wenv, np.ones(SR) / SR, mode="same")
mix = 0.95 * voice + 0.16 * music * (1 - 0.45 * (np.convolve(np.abs(voice) > 0.02, np.ones(SR // 2) / (SR // 2), mode="same"))) + 0.18 * wind * wenv * (0.6 + 0.4 * np.sin(t * 1.3))
mix /= max(1.0, np.abs(mix).max() / 0.95)
os.makedirs(f"{ROOT}/public/audio", exist_ok=True)
sf.write(f"{ROOT}/public/audio/mix.wav", np.stack([mix, mix], 1), SR)
json.dump(timing, open(f"{ROOT}/src/data/timing.json", "w"), indent=1)
print("done", len(timing), "lines")

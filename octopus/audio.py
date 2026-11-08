"""Mix voices + procedural underwater music + SFX into build/soundtrack.wav (48 kHz stereo)."""
import json, os
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
SR = 48000
rng = np.random.default_rng(7)


def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    na, nr = min(na, n // 2), min(nr, n // 2)
    e[:na] = np.linspace(0, 1, na)
    e[n - nr:] = np.linspace(1, 0, nr)
    return e


def pad_chord(midis, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for m in midis:
        f = note(m)
        for det in (-0.12, 0.0, 0.12):
            ff = f * 2 ** (det / 12)
            out += np.sin(2 * np.pi * ff * t + rng.uniform(0, 6.28)) * 0.33
            out += 0.12 * np.sin(2 * np.pi * 2 * ff * t)
    trem = 1 + 0.08 * np.sin(2 * np.pi * 0.25 * t)
    return out * trem * env_adsr(n, 1.5, 1.5) / len(midis)


def pluck(midi, dur=0.9, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = note(midi)
    sig = np.sin(2 * np.pi * f * t) + 0.35 * bright * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 18)
    return sig * np.exp(-t * 5.5) * np.minimum(1, t * 400)


def bubble(dur=0.12):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f0 = rng.uniform(500, 1100)
    f = f0 * (1 + 2.5 * t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 30) * 0.5


def whoosh(dur=1.2):
    n = int(dur * SR)
    noise = rng.normal(0, 1, n)
    # crude band-pass via moving averages
    k = 40
    lp = np.convolve(noise, np.ones(k) / k, mode="same")
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    return lp * e * 1.2


def sparkle(dur=1.0):
    out = np.zeros(int(dur * SR))
    for i in range(7):
        p = pluck(84 + [0, 4, 7, 11, 12, 16, 19][i], 0.6, 1.5) * 0.4
        s = int(i * 0.07 * SR)
        out[s:s + len(p)] += p[:len(out) - s]
    return out


def add(buf, sig, t, gain=1.0):
    s = int(t * SR)
    if s >= len(buf):
        return
    e = min(len(buf), s + len(sig))
    buf[s:e] += sig[:e - s] * gain


def main():
    tl = json.load(open(os.path.join(BUILD, "timeline.json")))
    total = tl["duration"]
    N = int((total + 0.5) * SR)
    music = np.zeros(N)
    voice = np.zeros(N)
    sfx = np.zeros(N)
    sc = {s["name"]: s for s in tl["scenes"]}

    # --- voices
    for s in tl["scenes"]:
        for ln in s["lines"]:
            a, sr = sf.read(os.path.join(HERE, ln["wav"]))
            idx = np.linspace(0, len(a) - 1, int(len(a) * SR / sr))
            a = np.interp(idx, np.arange(len(a)), a)
            add(voice, a, ln["start"], 0.95)

    # --- music: progression in C major, 4s per chord
    prog = [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59]]
    arp = [[60, 64, 67, 71, 72, 71, 67, 64], [57, 60, 64, 67, 69, 67, 64, 60],
           [53, 57, 60, 64, 65, 64, 60, 57], [55, 59, 62, 67, 71, 67, 62, 59]]
    shark_a = sc["shark"]["start"] + 0.5
    shark_b = sc["shark"]["lines"][6]["end"] + 1.0  # "swims away"
    playful = {"meet", "practice", "feelings", "recap"}
    t = 0.0
    ci = 0
    while t < total:
        mid = t + 2
        in_shark = shark_a <= mid <= shark_b
        if in_shark:
            ch = [[38, 45, 50, 53], [38, 44, 50, 53]][ci % 2]  # D minor / tension
        else:
            ch = prog[ci % 4]
        add(music, pad_chord(ch, 5.0), t, 0.55)
        scene = next((s["name"] for s in tl["scenes"] if s["start"] <= mid < s["end"]), "recap")
        if scene in playful and not in_shark:
            for j, m in enumerate(arp[ci % 4]):
                add(music, pluck(m), t + j * 0.5, 0.16)
        elif scene == "science":
            for j, m in enumerate(arp[ci % 4][::2]):
                add(music, pluck(m + 12, 1.2, 0.5), t + j * 1.0, 0.09)
        t += 4.0
        ci += 1
    # shark pulse
    tt = shark_a
    while tt < shark_b - 0.5:
        n = int(0.35 * SR)
        x = np.arange(n) / SR
        thump = np.sin(2 * np.pi * 55 * x) * np.exp(-x * 9)
        add(music, thump, tt, 0.9)
        add(music, thump, tt + 0.3, 0.6)
        tt += 1.3
    # fade in/out of music
    fade = np.ones(N)
    fi = int(3 * SR)
    fade[:fi] = np.linspace(0, 1, fi)
    fo = int(6 * SR)
    fade[-fo:] = np.linspace(1, 0, fo)
    music *= fade

    # --- sfx
    t = 0.3
    while t < total - 1:
        add(sfx, bubble(), t, rng.uniform(0.05, 0.12))
        t += rng.uniform(0.6, 3.0)
    add(sfx, whoosh(1.6), sc["intro"]["lines"][2]["start"] + 3.2, 0.25)  # title reveal
    pr = sc["practice"]["lines"]
    add(sfx, sparkle(), pr[1]["start"] + 0.2, 0.35)  # turns blue
    for k in range(4):
        add(sfx, sparkle(0.8), pr[4]["start"] + 0.2 + k * 2.1, 0.22)
    add(sfx, sparkle(), pr[9]["start"], 0.4)  # Boo
    add(sfx, whoosh(2.5), sc["shark"]["start"] + 1.5, 0.35)
    fe = sc["feelings"]["lines"]
    add(sfx, sparkle(), fe[6]["start"] + 0.5, 0.3)

    # --- ducking: lower music under voice
    win = int(0.25 * SR)
    venv = np.convolve(np.abs(voice), np.ones(win) / win, mode="same")
    duck = 1.0 - 0.55 * np.clip(venv / 0.03, 0, 1)
    music *= duck

    mix = voice + 0.22 * music + sfx
    peak = np.max(np.abs(mix))
    mix = mix / peak * 0.89
    # gentle stereo: music/sfx widened slightly
    left = mix + 0.03 * np.roll(music, 300)
    right = mix + 0.03 * np.roll(music, -300)
    st = np.stack([left, right], 1)
    st /= max(1.0, np.max(np.abs(st)) / 0.95)
    sf.write(os.path.join(BUILD, "soundtrack.wav"), st.astype(np.float32), SR)
    print("wrote soundtrack", N / SR, "s")


if __name__ == "__main__":
    main()

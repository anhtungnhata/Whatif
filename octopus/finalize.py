"""Write English subtitles and mux the final MP4 (video + loudness-normalised soundtrack).

  python3 finalize.py   ->  build/What_If_Octopus_Color.mp4 (+ .srt, + _captioned.mp4)
"""
import json, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
NAME = "What_If_Octopus_Color"


def ts(t):
    h, r = divmod(t, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s - int(s)) * 1000)) % 1000:03d}"


def chunks(text, maxlen=72):
    parts = re.split(r"(?<=[.!?:])\s+", text)
    out = []
    for p in parts:
        while len(p) > maxlen:
            cut = p.rfind(", ", 0, maxlen)
            cut = cut + 1 if cut > 20 else p.rfind(" ", 0, maxlen)
            out.append(p[:cut].strip())
            p = p[cut:].strip()
        if p:
            out.append(p)
    return out


def write_srt():
    tl = json.load(open(os.path.join(BUILD, "timeline.json")))
    cues = []
    for s in tl["scenes"]:
        for ln in s["lines"]:
            parts = chunks(ln["text"])
            total = sum(len(p) for p in parts)
            t = ln["start"]
            dur = ln["end"] - ln["start"]
            for p in parts:
                d = dur * len(p) / total
                who = "" if ln["speaker"] == "NARRATOR" else ln["speaker"].title() + ": "
                cues.append((t, t + d, who + p))
                t += d
    path = os.path.join(BUILD, NAME + ".srt")
    with open(path, "w") as f:
        for i, (a, b, s) in enumerate(cues, 1):
            f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{s}\n\n")
    return path


def main():
    srt = write_srt()
    out = os.path.join(BUILD, NAME + ".mp4")
    subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(BUILD, "video_noaudio.mp4"),
                           "-i", os.path.join(BUILD, "soundtrack.wav"),
                           "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                           "-ar", "48000", "-shortest", "-movflags", "+faststart", out])
    cap = os.path.join(BUILD, NAME + "_captioned.mp4")
    style = "FontName=Nunito,Bold=1,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00402010,BorderStyle=1,Outline=2,Shadow=0,MarginV=28"
    subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-i", out,
                           "-vf", f"subtitles={srt}:fontsdir={os.path.join(HERE, 'assets', 'fonts')}:force_style='{style}'",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-tune", "animation", "-pix_fmt", "yuv420p",
                           "-c:a", "copy", "-movflags", "+faststart", cap])
    print(out, cap, srt)


if __name__ == "__main__":
    main()

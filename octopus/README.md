# What If You Could Change Color Like an Octopus?

A 6-minute animated adventure in English, 16:9 (1920×1080, 30 fps).

**Characters:** Ollie, a curious young octopus who is orange by default. His color and skin texture change during the story, but his eyes, face and proportions stay the same. Pip, a small yellow reef fish. A reef shark.

## Story beats
| Time | Scene | Content |
|---|---|---|
| 0:00 | Intro | We swim down into the reef and see the "Any color, any pattern, any texture" lens, then the title card |
| 0:35 | Meet | Ollie and Pip introduce themselves; Ollie wishes he could be a different color |
| 1:02 | Science | Inside octopus skin: chromatophores (pigment sacs pulled by muscles and controlled by nerves), iridophores and leucophores |
| 2:06 | Practice | Ollie turns blue, green and purple, then shows stripes, spots and a light show; papillae change his skin from smooth to bumpy to spiky; a game of hide-and-seek on a mossy rock ends with "Boo!" |
| 3:03 | Shark | A reef shark arrives. Ollie flattens and camouflages on the sand, and Pip hides in a crack in the coral |
| 4:09 | Feelings | Calm octopuses look pale, angry ones look red, and some show "passing clouds"; then: what if YOU could change color? |
| 5:05 | Recap | Four things we learned, a bonus fact (octopuses are probably color-blind) and the outro |

## Pipeline (all local, reproducible)
1. `script.py`: the screenplay, with speakers, lines and pauses.
2. `tts.py`: neural voices from Kokoro TTS (narrator `bm_george`, Ollie `am_puck`, Pip `af_sky`, shark `am_onyx`). It writes `build/timeline.json` with per-frame loudness for lip-sync.
3. `audio.py`: procedural underwater music (pads, marimba arpeggios, a pulse during the shark scene) plus bubbles and sparkle SFX, with the music ducked under the voices.
4. `draw.py` + `scenes.py` + `render.py`: vector animation drawn with Skia. Every visual cue is tied to the time of a word in the voice track.
5. `finalize.py`: muxes the video and audio (normalized to −16 LUFS) and writes English `.srt` subtitles plus a captioned version.

```bash
pip install kokoro-onnx soundfile skia-python numpy
python3 tts.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin
python3 audio.py
python3 render.py --workers 4
python3 finalize.py
```
The final MP4 is uploaded to Adobe Creative Cloud.

# LEGO What If? — Episode 2 video (Remotion + Three.js)

Renders **"What If LEGO Humans Had to Live on Mars?"** as a 6:00, 1920×1080, 24 fps, 16:9 3D animated episode, directly from the production script in `../episodes/ep02-mars/`.

- **36 shots × 10 s.** Each shot has its own camera keyframes, blocking and props (`src/shots.tsx`).
- **3D LEGO world.** Procedural minifigs for Professor Brick, Max and Luna (`src/lego/Minifig.tsx`); the Brick Lab, BRICKSTAR, Mars surface and habitat (`src/lego/envs.tsx`); the base, lander, rover and holograms (`src/lego/props.tsx`).
- **Voices.** Offline Kokoro TTS: Narrator (am_onyx), Professor Brick (bm_george), Max (am_puck, pitched up), Luna (af_heart, pitched up). The music bed, title hits and storm wind are synthesized in `tts/make_audio.py`.
- **On-screen text.** Science lower-thirds (dialogue subtitles are off by default; set the `showSubtitles` prop to true to burn them in), the title slam at 00:15, and the Episode 3 end card (`src/Episode.tsx`).

The rendered episode is `out/LEGO_What_If_EP02_Mars.mp4`.

## Rebuild

```bash
npm i
# 1) voices + music (needs: pip install kokoro-onnx soundfile; model files in tts/)
curl -L -o tts/kokoro-v1.0.int8.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx
curl -L -o tts/voices-v1.0.bin      https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
python3 tts/make_audio.py           # -> public/audio/mix.wav + src/data/timing.json
# 2) preview / render
npx remotion studio
npx remotion render Episode2Mars out/master.mp4 --crf=18
```

Dialogue lives in `src/data/script.json`. Edit it, re-run `make_audio.py`, and the subtitle and mouth timing follow automatically.

Preview stills: `node scripts/stills.mjs <dir> <seconds...>` and `python3 scripts/sheet.py <dir>`.

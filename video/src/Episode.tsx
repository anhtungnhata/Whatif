import React from "react";
import { AbsoluteFill, Composition, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import script from "./data/script.json";
import { SHOT_SCENES, Cam } from "./shots";
import { ClockCtx, LINES } from "./lego/util";

export const FPS = 24;
export const SHOT_FRAMES = 10 * FPS;
export const SHOTS = 36;
const W = 1920;
const H = 1080;

const CameraRig: React.FC<{ c: Cam }> = ({ c }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...c.pos);
  camera.fov = c.fov ?? 35;
  camera.near = 0.1;
  camera.far = 2000;
  camera.up.set(Math.sin(c.roll ?? 0), Math.cos(c.roll ?? 0), 0);
  camera.lookAt(...c.look);
  camera.updateProjectionMatrix();
  return null;
};

const SPEAKER: Record<string, { name: string; color: string }> = {
  N: { name: "NARRATOR", color: "#cfd6de" },
  P: { name: "PROFESSOR BRICK", color: "#3fd6db" },
  M: { name: "MAX", color: "#ff5a4f" },
  L: { name: "LUNA", color: "#b88cff" },
};

const font = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";

const Subtitle: React.FC<{ g: number }> = ({ g }) => {
  const l = LINES.find((x) => g >= x.start - 0.05 && g <= x.end + 0.35);
  if (!l) return null;
  const s = SPEAKER[l.who];
  const op = interpolate(g, [l.start - 0.05, l.start + 0.12, l.end + 0.2, l.end + 0.35], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 70,
        display: "flex",
        justifyContent: "center",
        opacity: op,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          background: "rgba(10,12,16,0.62)",
          borderRadius: 14,
          padding: "14px 30px 18px",
          textAlign: "center",
        }}
      >
        <div style={{ fontFamily: font, fontSize: 22, letterSpacing: 3, color: s.color, marginBottom: 4 }}>
          {s.name}
        </div>
        <div
          style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontWeight: 700,
            fontSize: 42,
            lineHeight: 1.25,
            color: "#fff",
            fontStyle: l.who === "N" ? "italic" : "normal",
          }}
        >
          {l.text}
        </div>
      </div>
    </div>
  );
};

const Fact: React.FC<{ text: string; t: number }> = ({ text, t }) => {
  if (!text) return null;
  const k = interpolate(t, [0.6, 1.1, 9.1, 9.6], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 110,
        top: 92,
        opacity: k,
        translate: `${(1 - k) * -40}px 0px`,
        display: "flex",
        alignItems: "stretch",
      }}
    >
      <div style={{ width: 14, background: "#ff7a1a", borderRadius: "6px 0 0 6px" }} />
      <div
        style={{
          background: "rgba(12,14,18,0.72)",
          color: "#fff",
          fontFamily: font,
          fontSize: 28,
          letterSpacing: 1,
          padding: "12px 24px",
          borderRadius: "0 6px 6px 0",
          maxWidth: 1250,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const Bug: React.FC = () => (
  <div
    style={{
      position: "absolute",
      right: 96,
      top: 60,
      fontFamily: font,
      fontSize: 22,
      color: "rgba(255,255,255,0.75)",
      letterSpacing: 2,
    }}
  >
    LEGO WHAT IF? · EP 2
  </div>
);

const BrickTitle: React.FC<{ top: string; sub: string; tag: string; k: number }> = ({ top, sub, tag, k }) => (
  <AbsoluteFill
    style={{
      justifyContent: "center",
      alignItems: "center",
      background: `radial-gradient(ellipse at 50% 60%, rgba(120,40,15,${0.85 * k}), rgba(25,8,4,${0.95 * k}))`,
    }}
  >
    <div style={{ scale: `${0.8 + 0.2 * k}`, opacity: k, textAlign: "center" }}>
      <div
        style={{
          fontFamily: font,
          fontSize: 150,
          color: "#ffd23f",
          textShadow: "0 8px 0 #b8860b, 0 14px 0 #7a5a08, 0 24px 40px rgba(0,0,0,0.6)",
          letterSpacing: 4,
        }}
      >
        {top}
      </div>
      <div style={{ fontFamily: font, fontSize: 30, color: "#ff7a1a", letterSpacing: 8, marginTop: 30 }}>{tag}</div>
      <div style={{ fontFamily: font, fontSize: 56, color: "#fff", marginTop: 14 }}>{sub}</div>
    </div>
  </AbsoluteFill>
);

const ShotOverlays: React.FC<{ n: number; t: number }> = ({ n, t }) => {
  const fade = (a: number, b: number, c: number, d: number) =>
    interpolate(t, [a, b, c, d], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (n === 1) {
    return <AbsoluteFill style={{ background: "#000", opacity: interpolate(t, [0, 0.8], [1, 0], { extrapolateRight: "clamp" }) }} />;
  }
  if (n === 2) {
    return (
      <>
        {t > 5 ? (
          <BrickTitle
            top="LEGO WHAT IF?"
            tag="EPISODE 2"
            sub="What If LEGO Humans Had to Live on Mars?"
            k={fade(5, 5.35, 7.8, 8.2)}
          />
        ) : null}
        {t > 8 ? (
          <AbsoluteFill style={{ background: "#000", justifyContent: "center", alignItems: "center" }}>
            <div style={{ fontFamily: font, fontSize: 64, color: "#fff", letterSpacing: 10, opacity: fade(8.1, 8.4, 9.6, 10) }}>
              8 MONTHS EARLIER…
            </div>
          </AbsoluteFill>
        ) : null}
      </>
    );
  }
  if (n === 6) {
    return <AbsoluteFill style={{ background: "#e8ffff", opacity: fade(5.7, 6.15, 6.25, 7.0) }} />;
  }
  if (n === 25 && t > 2 && t < 9.6) {
    return (
      <div
        style={{
          position: "absolute",
          right: 140,
          top: 200,
          fontFamily: "monospace",
          fontSize: 40,
          color: "#7ff8ff",
          background: "rgba(0,20,30,0.7)",
          padding: "14px 24px",
          borderRadius: 8,
          border: "2px solid #38f2ff",
        }}
      >
        SIGNAL TO EARTH… 00:{String(Math.floor(t - 2)).padStart(2, "0")} / 12:40
      </div>
    );
  }
  if (n === 36 && t > 8.1) {
    return (
      <BrickTitle
        top="LEGO WHAT IF?"
        tag="NEXT TIME · EPISODE 3"
        sub="What If the Moon Disappeared?"
        k={interpolate(t, [8.1, 8.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
    );
  }
  return null;
};

export const Episode: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const idx = Math.min(SHOTS - 1, Math.floor(frame / SHOT_FRAMES));
  const n = idx + 1;
  const t = (frame - idx * SHOT_FRAMES) / fps;
  const g = frame / fps;
  const out = SHOT_SCENES[n](t);
  const meta = (script as { n: number; fact: string }[])[idx];
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <ThreeCanvas
        width={W}
        height={H}
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, preserveDrawingBuffer: true }}
        camera={{ fov: 35, position: [0, 4, 10] }}
      >
        <ClockCtx.Provider value={{ shot: n, t, g }}>
          <CameraRig c={out.cam} />
          <group key={n}>{out.scene}</group>
        </ClockCtx.Provider>
      </ThreeCanvas>
      {/* cinematic vignette */}
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.38) 100%)" }}
      />
      {n > 2 && n < 36 ? <Bug /> : null}
      <Fact text={meta.fact} t={t} />
      <Subtitle g={g} />
      <ShotOverlays n={n} t={t} />
      <Audio src={staticFile("audio/mix.wav")} />
    </AbsoluteFill>
  );
};

export const EpisodeComposition: React.FC = () => (
  <>
    <Composition id="Episode2Mars" component={Episode} durationInFrames={SHOTS * SHOT_FRAMES} fps={FPS} width={W} height={H} />
  </>
);

import React from "react";
import * as THREE from "three";
import { cheer, idle, Minifig, point, Pose, walk, Who } from "./lego/Minifig";
import {
  Cockpit,
  Dust,
  Engine,
  Glow,
  GreenhouseInterior,
  HabInterior,
  HoloTable,
  Lab,
  MarsGlobe,
  MarsSurface,
  ShipInterior,
  Space,
  Stars,
} from "./lego/envs";
import {
  Base,
  BASE,
  Brickstar,
  HoloOrbits,
  HoloPie,
  HoloShield,
  Lander,
  LANDER_POS,
  O2Unit,
  Phobos,
  Rover,
  holoMat,
} from "./lego/props";
import { lerp, lerp3, prog, rng, tex, V3 } from "./lego/util";

export type Cam = { pos: V3; look: V3; fov?: number; roll?: number };
export type ShotOut = { cam: Cam; scene: React.ReactNode };

/** camera keyframes: [time, pos, look, fov] */
type Key = [number, V3, V3, number?];
const cam = (t: number, keys: Key[], roll = 0): Cam => {
  if (t <= keys[0][0]) return { pos: keys[0][1], look: keys[0][2], fov: keys[0][3] ?? 35, roll };
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, pa, la, fa] = keys[i];
    const [tb, pb, lb, fb] = keys[i + 1];
    if (t <= tb) {
      const k = prog(t, ta, tb);
      return { pos: lerp3(pa, pb, k), look: lerp3(la, lb, k), fov: lerp(fa ?? 35, fb ?? 35, k), roll };
    }
  }
  const l = keys[keys.length - 1];
  return { pos: l[1], look: l[2], fov: l[3] ?? 35, roll };
};
const shake = (c: Cam, t: number, amt: number): Cam => ({
  ...c,
  pos: [
    c.pos[0] + Math.sin(t * 31) * amt + Math.sin(t * 17) * amt * 0.5,
    c.pos[1] + Math.cos(t * 27) * amt,
    c.pos[2],
  ],
});
const face = (from: V3, to: V3) => Math.atan2(to[0] - from[0], to[2] - from[2]);

const F: React.FC<{
  who: Who;
  at: V3;
  ry?: number;
  pose?: Pose;
  outfit?: "lab" | "suit";
  helmet?: "on" | "hip" | "none";
  patch?: boolean;
  crack?: number;
  rx?: number;
  rz?: number;
  mouth?: number;
  holo?: boolean;
  scale?: number;
}> = (p) => <Minifig {...p} />;

/* ---- small props used by shots ---- */
const ToyRocket: React.FC<{ at: V3; rz?: number }> = ({ at, rz = 0 }) => (
  <group position={at} rotation={[0, 0, rz]}>
    <mesh>
      <cylinderGeometry args={[0.13, 0.13, 0.6, 12]} />
      <meshStandardMaterial color="#d01712" />
    </mesh>
    <mesh position={[0, 0.42, 0]}>
      <coneGeometry args={[0.13, 0.25, 12]} />
      <meshStandardMaterial color="#f2f2f0" />
    </mesh>
  </group>
);

const labelTex = (s: string, fg = "#7ff8ff", bg = "rgba(0,0,0,0)") =>
  tex(`lbl-${s}-${fg}-${bg}`, 512, 160, (c, w, h) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.fillStyle = fg;
    c.font = "bold 92px Arial";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(s, w / 2, h / 2);
  });
const Label: React.FC<{ at: V3; text: string; w?: number; fg?: string; bg?: string; ry?: number }> = ({
  at,
  text,
  w = 2,
  fg,
  bg,
  ry = 0,
}) => (
  <mesh position={at} rotation={[0, ry, 0]}>
    <planeGeometry args={[w, w * 0.3125]} />
    <meshBasicMaterial map={labelTex(text, fg, bg)} transparent toneMapped={false} />
  </mesh>
);

const Bricks: React.FC<{ k: number; targets: V3[] }> = ({ k, targets }) => {
  const r = rng(99);
  const cols = ["#f2f2f0", "#13a3a8", "#d01712", "#7b3fbf", "#f2f2f0"];
  return (
    <group>
      {Array.from({ length: 90 }).map((_, i) => {
        const tg = targets[i % targets.length];
        const start: V3 = [tg[0] + (r() - 0.5) * 22, 1 + r() * 9, tg[2] + (r() - 0.5) * 14];
        const end: V3 = [tg[0] + (r() - 0.5) * 1.2, 0.5 + r() * 3.4, tg[2] + (r() - 0.5) * 0.8];
        const p = lerp3(start, end, k);
        return (
          <mesh key={i} position={p} rotation={[r() * 6 * (1 - k), r() * 6 * (1 - k), 0]} scale={1 - k * 0.6}>
            <boxGeometry args={[0.5, 0.3, 0.25]} />
            <meshStandardMaterial color={cols[i % 5]} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
};

const WindowSky: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  // objects placed just in front of the hab's west window (center 0,5.2,-13.6, r=4)
  <group position={[0, 5.2, -13.5]}>{children}</group>
);

const Clock: React.FC<{ at: V3; text: string; ry?: number }> = ({ at, text, ry = 0 }) => (
  <group position={at} rotation={[0, ry, 0]}>
    <mesh>
      <boxGeometry args={[3.4, 1.4, 0.2]} />
      <meshStandardMaterial color="#f2f2f0" />
    </mesh>
    <Label at={[0, 0, 0.12]} text={text} w={3.1} fg="#ff7a1a" bg="#1b1b1b" />
  </group>
);

/* ===================================================================== */
export const SHOT_SCENES: Record<number, (t: number) => ShotOut> = {
  /* 01 — The Crack (HOOK) */
  1: (t) => {
    const M: V3 = [-18, 0, -3];
    return {
      cam: shake(cam(t, [[0, [-18, 3.45, 0.4], [-18, 3.35, -3], 30], [10, [-18, 3.4, -0.5], [-18, 3.35, -3], 27]]), t, 0.03),
      scene: (
        <>
          <MarsSurface sky="storm" fogNear={2} fogFar={70} studCenter={[-18, -3]} />
          <Base progress={1} dust={0.6} />
          <Dust t={t} center={[-18, 0, -2]} density={1} />
          <F who="M" at={M} pose={{ ...idle(t), head: 0, headTilt: prog(t, 5, 6) * -0.15 }} crack={prog(t, 2.2, 4.5)} mouth={prog(t, 5, 6) * 0.6} />
          <F who="L" at={[lerp(-14.5, -16.3, prog(t, 8, 9.6)), 0, -2.3]} ry={-0.9} pose={{ armR: [2.0, 0.2] }} />
          {t > 5 ? <pointLight position={[-18, 2.9, -2.4]} color="#ff2020" intensity={0.8 + 0.6 * Math.sin(t * 12)} distance={1.6} /> : null}
        </>
      ),
    };
  },
  /* 02 — The Patch + title */
  2: (tt) => {
    const t = Math.min(tt, 5);
    return {
      cam: shake(cam(t, [[0, [-17.3, 3.0, 5.5], [-17.3, 3.1, -3], 32], [5, [-17.3, 3.0, 4.8], [-17.3, 3.1, -3], 32]]), t, 0.02),
      scene: (
        <>
          <MarsSurface sky="storm" fogNear={2} fogFar={70} studCenter={[-18, -3]} />
          <Base progress={1} dust={0.6} />
          <Dust t={tt} center={[-18, 0, -2]} />
          <F who="M" at={[-18.4, 0, -3]} ry={0.35 + prog(t, 2, 3.5) * 0.4} crack={1} patch={t > 0.6} pose={{ ...idle(t), armL: [0.1, 0.1] }} />
          <F who="L" at={[-16.3, 0, -2.6]} ry={-0.8} pose={{ armR: [prog(t, 0, 0.5) * 1.9 - prog(t, 1.5, 2.5) * 1.6, 0.2], armL: [0.1, 0] }} />
        </>
      ),
    };
  },
  /* 03 — Welcome to the Brick Lab */
  3: (t) => ({
    cam: cam(t, [[0, [0, 13, 16], [0, 5, -6], 45], [6, [0, 5, 14], [0, 3.5, -2], 40], [10, [0, 4.6, 12], [0, 3.2, -1], 38]]),
    scene: (
      <>
        <Lab power={0.35} spin={t * 0.8} />
        <F who="P" outfit="lab" at={[-3.4, 0, -3]} ry={lerp(Math.PI, 0.2, prog(t, 3, 5))} pose={{ armL: [prog(t, 4, 5.5) * 1.6, 0.6 * prog(t, 4, 5.5)], armR: [prog(t, 4, 5.5) * 1.6, 0.6 * prog(t, 4, 5.5)] }} />
        <F who="M" outfit="lab" at={[lerp(-15, -0.3, prog(t, 6, 8)), 0, 1.5]} ry={lerp(Math.PI / 2, 0, prog(t, 7.5, 8.6))} pose={t < 8 ? { legL: 0.4, legR: -0.4, armL: [0.6, 0.6], armR: [-0.3, 0.6], lean: 0.15 } : idle(t, 1)} />
        <F who="L" outfit="lab" at={[3.4, 0, 0.6]} ry={lerp(-1.4, -0.3, prog(t, 8, 9))} pose={{ armR: [1.1, 0], armL: [0.3, 0], headTilt: lerp(0.3, -0.05, prog(t, 8, 9)) }} />
      </>
    ),
  }),
  /* 04 — Mars! Easy. */
  4: (t) => {
    const holo = prog(t, 5.8, 7);
    return {
      cam: cam(t, [[0, [0.2, 3.4, 9.5], [0.2, 3.1, 1], 32], [10, [2.4, 3.6, 9.5], [2.4, 3.4, 1], 32]]),
      scene: (
        <>
          <Lab power={0.35} spin={(t + 10) * 0.8} />
          <F who="P" outfit="lab" at={[-3.4, 0, -3]} ry={0.2} pose={idle(t, 3)} />
          <F who="M" outfit="lab" at={[-0.3, 0, 1.5]} ry={0.3} pose={t < 4 ? cheer(t) : { armL: [1.3, 0.2], armR: [0.1, 0.1] }} />
          <ToyRocket at={t < 4 ? [0.55, 5.1 + Math.sin(t * 12) * 0.2, 1.9] : [0.4, 3.0, 2.6]} rz={t < 4 ? 0 : -0.4} />
          <F who="L" outfit="lab" at={[3.4, 0, 0.6]} ry={-0.4} pose={{ armR: [prog(t, 4, 4.6) * 1.2, 0], armL: [0.2, 0], head: -0.3 }} />
          {holo > 0 ? (
            <group scale={holo}>
              <mesh position={[1.6, 4.6, 2]}>
                <sphereGeometry args={[0.16, 20, 14]} />
                <meshBasicMaterial color="#3d7bd8" />
              </mesh>
              <mesh position={[4.4, 4.6, 2]}>
                <sphereGeometry args={[0.11, 20, 14]} />
                <meshBasicMaterial color="#e0582a" />
              </mesh>
              {Array.from({ length: 9 }).map((_, i) => (
                <mesh key={i} position={[2.0 + i * 0.27, 4.6, 2]} visible={i / 9 < prog(t, 6.5, 9)}>
                  <sphereGeometry args={[0.04, 8, 6]} />
                  {holoMat(1)}
                </mesh>
              ))}
            </group>
          ) : null}
        </>
      ),
    };
  },
  /* 05 — 26-month window */
  5: (t) => ({
    cam: cam(t, [[0, [-5, 10, 7], [0, 2.5, -2.5], 38], [10, [5, 10, 7], [0, 2.5, -2.5], 38]]),
    scene: (
      <>
        <Lab power={0.35} spin={(t + 20) * 0.8} />
        <HoloTable at={[0, 0, -1.5]} />
        <HoloOrbits at={[0, 2.4, -1.5]} t={t} arc={prog(t, 3, 7)} scale={lerp(0.6, 1, prog(t, 0, 3))} />
        <F who="P" outfit="lab" at={[-2.9, 0, -3.6]} ry={face([-2.9, 0, -3.6], [0, 0, -1.5])} pose={t < 2 ? { armR: [2.3, 0.2] } : point(t, "R", 2)} />
        <F who="M" outfit="lab" at={[0, 0, -4.6]} ry={0} pose={t > 7 ? { armL: [1.0 + Math.sin(t * 8) * 0.2, 0], armR: [1.0 + Math.cos(t * 8) * 0.2, 0], headTilt: 0.25 } : idle(t, 4)} />
        <F who="L" outfit="lab" at={[2.9, 0, -3.6]} ry={face([2.9, 0, -3.6], [0, 0, -1.5])} pose={{ armR: [1.0, 0], armL: [0.2, 0] }} />
      </>
    ),
  }),
  /* 06 — Pull the lever */
  6: (t) => {
    const suit = t > 6.2;
    const lev = prog(t, 2.6, 3.6);
    const power = 0.35 + prog(t, 3, 5) * 0.65;
    const arm: Pose = { armL: [2.2 - lev * 1.0, 0.2], armR: [2.2 - lev * 1.0, -0.2] };
    return {
      cam: shake(cam(t, [[0, [-1, 1.8, 10], [-1.5, 4, -4], 48], [10, [-0.5, 2.2, 11], [-0.8, 4, -4], 48]]), t, t > 3 && t < 7 ? 0.06 : 0),
      scene: (
        <>
          <Lab power={power} lever={lev} spin={t * (0.8 + power * 6)} />
          <F who="P" outfit={suit ? "suit" : "lab"} at={[-4.6, 0, -5.0]} ry={suit ? 0.3 : 0.6} pose={suit ? idle(t) : arm} />
          <F who="M" outfit={suit ? "suit" : "lab"} at={[-0.6, 0, -3.2]} pose={t > 3 && t < 5 ? cheer(t) : idle(t, 1)} />
          <F who="L" outfit={suit ? "suit" : "lab"} at={[2.6, 0, -3.4]} ry={-0.2} pose={suit ? { armL: [0.6, 0.3], armR: [0.6, 0.3], headTilt: 0.35 } : idle(t, 2)} />
          {t > 5 && t < 6.4 ? <Bricks k={prog(t, 5, 6.2)} targets={[[-4.6, 0, -5], [-0.6, 0, -3.2], [2.6, 0, -3.4]]} /> : null}
        </>
      ),
    };
  },
  /* 07 — Seven months in a can */
  7: (t) => {
    const crumbs = rng(3);
    return {
      cam: cam(t, [[0, [0.5, 4.6, 10], [-0.5, 4.4, -4], 50], [10, [0.5, 4.6, 8.5], [-0.5, 4.4, -4], 50]], Math.sin(t * 0.4) * 0.12),
      scene: (
        <>
          <ShipInterior earthScale={lerp(1, 0.2, prog(t, 0, 10))} />
          <F who="M" at={[0.2, 6.2 + Math.sin(t) * 0.3, 0]} rz={Math.PI + Math.sin(t * 0.5) * 0.3} helmet="hip" pose={{ armL: [1.2, 0.2], armR: [0.9 + Math.sin(t * 4) * 0.3, 0.2], legL: 0.3, legR: -0.2 }} />
          <mesh position={[0.9, 4.6 + Math.sin(t) * 0.3, 0.9]}>
            <boxGeometry args={[0.5, 0.25, 0.5]} />
            <meshStandardMaterial color="#e2b66a" />
          </mesh>
          {Array.from({ length: 12 }).map((_, i) => (
            <mesh key={i} position={[crumbs() * 4 - 1 + t * 0.1 * (i % 3 - 1), 3 + crumbs() * 3, crumbs() * 2]}>
              <boxGeometry args={[0.07, 0.07, 0.07]} />
              <meshStandardMaterial color="#c99a4a" />
            </mesh>
          ))}
          <F who="L" at={[3.2, 0.6 + Math.sin(t * 0.8 + 1) * 0.2, -1]} ry={-0.5} helmet="hip" pose={{ armR: [prog(t, 3, 4) * 1.6, 0], armL: [0.4, 0.3], legL: 0.2 }} />
          <F who="P" at={[-4.4, 0.8 + Math.sin(t * 0.7) * 0.2, -5.4]} ry={Math.PI - 0.15} helmet="hip" pose={{ armR: [1.5, 0], legR: 0.2 }} />
        </>
      ),
    };
  },
  /* 08 — Sleeping behind water */
  8: (t) => {
    const knock = t > 3 && t < 7 ? Math.abs(Math.sin(t * 6)) * 0.4 : 0;
    return {
      cam: cam(t, [[0, [0.5, 4, 11], [0.3, 3.2, -1], 40], [10, [0.5, 3.8, 8.5], [0.3, 3.2, -1], 40]]),
      scene: (
        <>
          <ShipInterior night tanks earthScale={0.2} />
          <F who="L" at={[2.8, 0, 1.5]} ry={-0.5} helmet="hip" pose={{ armR: [1.2, 0], armL: [0.3, 0], head: prog(t, 2, 3) * -0.6 }} />
          {t > 0.6 ? <Glow at={[2.1, 3.3, 2.6]} size={1.2} color="#ffd23f" opacity={0.6 + 0.4 * Math.sin(t * 6)} /> : null}
          <F who="P" at={[-4.6, 0, -2.6]} ry={-0.9 + (t > 6 ? 1.1 : 0)} helmet="hip" pose={{ armL: [1.6 + knock, 0.2], armR: [0.2, 0] }} />
          <group position={[0, 0.8, -6.2]}>
            <F who="M" at={[0, 0, 0]} helmet="none" mouth={0} pose={{ headTilt: 0.2 + Math.sin(t * 1.5) * 0.05 }} />
            <mesh position={[0, 1.6, 0.1]}>
              <capsuleGeometry args={[0.85, 1.6, 6, 16]} />
              <meshStandardMaterial color="#b3241f" roughness={0.5} />
            </mesh>
            <mesh position={[0.15, 3.05 + (t % 2) * 0.1, 0.65]} scale={0.2 + (t % 2) * 0.12}>
              <sphereGeometry args={[0.3, 12, 10]} />
              <meshPhysicalMaterial color="#cfefff" transparent opacity={0.5} roughness={0} />
            </mesh>
          </group>
        </>
      ),
    };
  },
  /* 09 — The Red Planet */
  9: (t) => ({
    cam: cam(t, [[0, [-14, 3, 12], [0, 0, -25], 50], [10, [2, 3, 12], [4, 0, -25], 50]]),
    scene: (
      <>
        <Space />
        <MarsGlobe at={[10, -2, -36]} r={16} spin={t * 0.05 + 0.8} />
        <group scale={0.55}>
          <Brickstar at={[-20 + t * 2, 2, -12]} ry={-0.3} thrust={1} />
        </group>
        <mesh position={[-14, 8, -40]}>
          <icosahedronGeometry args={[0.9, 1]} />
          <meshStandardMaterial color="#8a8580" flatShading />
        </mesh>
        <mesh position={[30, 12, -60]}>
          <icosahedronGeometry args={[0.6, 1]} />
          <meshStandardMaterial color="#9a958f" flatShading />
        </mesh>
      </>
    ),
  }),
  /* 10 — Seven minutes of terror */
  10: (t) => {
    const seat = (who: Who, x: number, pose: Pose) => (
      <F who={who} at={[x, 0.3, -0.4]} pose={{ legL: 1.5, legR: 1.5, ...pose }} />
    );
    return {
      cam: shake(cam(t, [[0, [0, 3.8, 9], [0, 3.2, 0], 44], [10, [0, 3.6, 7.8], [0, 3.2, 0], 44]]), t, 0.09),
      scene: (
        <>
          <Cockpit t={t} />
          {seat("P", -3.4, { armL: [1.3, -0.5], armR: [0.9, -0.3], head: -0.2, headTilt: 0.3 })}
          {seat("M", 0, { armL: [0.5, 0.6], armR: [0.5, 0.6], headTilt: Math.sin(t * 20) * 0.05 })}
          {seat("L", 3.4, { armR: [1.2, -0.3], armL: [0.6, 0], head: 0.2, headTilt: 0.25 })}
        </>
      ),
    };
  },
  /* 11 — Rockets all the way down */
  11: (t) => {
    const k = prog(t, 0, 7.6);
    const y = lerp(36, 0, 1 - Math.pow(1 - k, 2.2));
    const flame = t < 7.8 ? 1 : 0;
    return {
      cam: shake(cam(t, [[0, [4, 2.2, 24], [-10, 12, -2], 46], [8, [4, 2.2, 24], [-10, 4.5, -2], 46], [10, [3.5, 2.2, 22], [-10, 4.5, -2], 44]]), t, t > 6 && t < 8 ? 0.08 : 0.01),
      scene: (
        <>
          <MarsSurface sky="morning" sunDir={[-60, 25, 10]} studCenter={[-6, 4]} />
          <Lander at={[LANDER_POS[0], y, LANDER_POS[2]]} flame={flame} legs={prog(t, 3.5, 6.5)} />
          {t > 4 ? <Dust t={t} center={[-10, 0, -2]} density={t < 8 ? prog(t, 4, 7) : 1 - prog(t, 8, 10)} color="#e0975a" /> : null}
        </>
      ),
    };
  },
  /* 12 — Butterscotch sky */
  12: (t) => {
    const step = prog(t, 0, 2.6);
    return {
      cam: cam(t, [[0, [1.5, 1.2, 9], [-5.6, 1.6, -1], 40], [3.5, [1.5, 1.2, 9], [-6.0, 3.2, -1.0], 44], [7, [1.5, 1.0, 10], [-7, 9, -6], 58], [10, [1.5, 1.0, 10.5], [-7, 11, -7], 60]]),
      scene: (
        <>
          <MarsSurface sky="morning" sunDir={[-60, 25, 10]} studCenter={[-6, 0]} />
          <Lander hatch={1} />
          <Glow at={[-120, 60, -60]} size={30} color="#fff3dc" />
          <F who="L" at={[lerp(-6.2, -4.6, step), lerp(1.8, 0, step), -1.0]} ry={lerp(-Math.PI / 2, 0.6, prog(t, 2.6, 4))} pose={{ legL: step < 1 ? 0.4 : 0, headTilt: -0.45 * prog(t, 3, 4.5), armL: [0.3, 0.2], armR: [0.3, 0.2] }} />
          <mesh position={[-5.6, 0.02, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.55, 0.75]} />
            <meshStandardMaterial color="#7a3016" />
          </mesh>
          <mesh position={[-6.3, 3.2, -1.2]}>
            <boxGeometry args={[1.6, 0.2, 3.4]} />
            <meshStandardMaterial color="#9aa0a6" />
          </mesh>
          <F who="M" at={[-6.2, 3.3, -0.3]} ry={Math.PI / 2} pose={{ headTilt: -0.3 }} />
          <F who="P" at={[-6.3, 3.3, -2.2]} ry={Math.PI / 2} pose={{ headTilt: -0.3 }} />
        </>
      ),
    };
  },
  /* 13 — Superhero jump */
  13: (t) => {
    const k = prog(t, 0.6, 6);
    const lin = Math.min(1, Math.max(0, (t - 0.6) / 5.4));
    const x = lerp(-6, 4, lin);
    const y = Math.sin(Math.PI * lin) * 9;
    const sk = prog(t, 6, 8.5);
    const mx = t < 6 ? x : lerp(4, 8, sk);
    return {
      cam: cam(t, [[0, [-2, 4.5, 22], [-2, 4, 0], 46], [6, [2, 6, 22], [2, 5, 0], 46], [10, [3, 4.5, 21], [3, 3, 0], 44]]),
      scene: (
        <>
          <MarsSurface sky="morning" sunDir={[-60, 25, 10]} />
          <Lander hatch={1} />
          <F who="M" at={[mx, t < 6 ? y : 0.3, 0]} rx={t < 6 ? 0 : -1.3 * prog(t, 6, 6.6)} ry={t < 6 ? Math.PI / 2 - 0.5 : -0.3} pose={t < 6 ? { armL: [2.8, 0.3], armR: [2.8, 0.3], legL: k > 0 ? 0.3 : 0 } : { armL: [1, 0.6], armR: [1, 0.6] }} />
          <F who="P" at={[-4, 0, 5]} ry={0.4} pose={t > 8.6 ? { armR: [2.4, 0.1] } : idle(t, 2)} />
          <F who="L" at={[9, 0, 4]} ry={-0.7} pose={{ armL: [prog(t, 1, 2) * 1.8, 0.4], armR: [prog(t, 1, 2) * 1.8, 0.4] }} />
        </>
      ),
    };
  },
  /* 14 — Air you can't breathe */
  14: (t) => (
    {
      cam: cam(t, [[0, [0.6, 3.4, 8], [0.6, 3.2, 0], 30], [6, [0.2, 3.4, 8], [-0.4, 3.2, 0], 30], [10, [-0.4, 3.4, 8.4], [-1.0, 3.2, 0], 30]]),
      scene: (
        <>
          <MarsSurface sky="morning" sunDir={[-60, 25, 10]} />
          <F who="L" at={[1.6, 0, 0.2]} ry={lerp(-0.3, -0.8, prog(t, 3, 5))} pose={{ armR: [1.35, 0.1], armL: [0.2, 0], headTilt: 0.1 }} />
          <HoloPie at={[2.4, 3.5, 2.2]} k={prog(t, 0.5, 2) * 0.55} />
          <F who="P" at={[-2.2, 0, -0.6]} ry={0.5} pose={t > 6 ? { armL: [1.4, -0.3], armR: [2.4, 0.2] } : idle(t, 2)} />
          {t > 6 ? (
            <group position={[-2.1, 4.1, 0.6]} scale={prog(t, 6, 7)}>
              <mesh>
                <sphereGeometry args={[0.28, 16, 12]} />
                {holoMat(0.7)}
              </mesh>
              {Array.from({ length: 6 }).map((_, i) => (
                <mesh key={i} position={[Math.sin(i * 2.3) * 0.15, ((t * 0.8 + i / 6) % 1) * 0.7, Math.cos(i * 2.3) * 0.15]}>
                  <sphereGeometry args={[0.05, 8, 6]} />
                  {holoMat(0.9)}
                </mesh>
              ))}
            </group>
          ) : null}
        </>
      ),
    }
  ),
  /* 15 — Minus sixty */
  15: (t) => {
    const r = rng(15);
    return {
      cam: cam(t, [[0, [0.3, 1.4, 3.6], [0.3, 1.1, 1.2], 32], [3, [0.3, 1.5, 3.4], [0.3, 1.1, 1.2], 30], [6, [0, 3.2, 11], [0, 2.2, 0], 34], [10, [0, 3.2, 10.5], [0, 2.2, 0], 34]]),
      scene: (
        <>
          <MarsSurface sky="morning" sunDir={[-60, 25, 10]} rocks={false} />
          <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
            <boxGeometry args={[3, 1.8, 2.4]} />
            <meshStandardMaterial color="#5e2818" roughness={0.85} />
          </mesh>
          {Array.from({ length: 70 }).map((_, i) => (
            <mesh key={i} position={[-1.4 + r() * 2.8, 0.1 + r() * 1.6, 1.21]} rotation={[0, 0, r() * 3]}>
              <boxGeometry args={[0.05 + r() * 0.12, 0.03, 0.02]} />
              <meshStandardMaterial color="#f4fbff" emissive="#cfeaff" emissiveIntensity={0.35 + 0.3 * Math.sin(t * 4 + i)} />
            </mesh>
          ))}
          <F who="P" at={[-2.4, -0.55, 1.6]} ry={0.6} pose={{ legL: 1.3, legR: 0.2, armL: [1.3, -0.2], armR: [0.6, 0] }} />
          <mesh position={[-1.5, 1.9, 2.0]}>
            <boxGeometry args={[0.6, 0.36, 0.1]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <Label at={[-1.5, 1.9, 2.06]} text="-63°C" w={0.55} fg="#7ff8ff" bg="#0b1a22" />
          <F who="M" at={[2.8 + Math.sin(t * 40) * 0.03, 0, 1.4]} ry={-0.4} pose={{ armL: [1.2, -0.7], armR: [1.2, -0.7], head: Math.sin(t * 30) * 0.05 }} />
        </>
      ),
    };
  },
  /* 16 — No shield */
  16: (t) => ({
    cam: cam(t, [[0, [0, 4.2, 12], [0, 4, 0], 38], [10, [0, 4.4, 8.5], [0, 4.4, 0], 38]]),
    scene: (
      <>
        <MarsSurface sky="morning" sunDir={[-60, 25, 10]} />
        <HoloShield at={[0, 5.4, 1.2]} t={t} strip={prog(t, 4, 6)} />
        <F who="P" at={[-3.2, 0, 0]} ry={0.3} pose={{ armL: [1.4, -0.2], armR: [0.2, 0] }} />
        <F who="M" at={[0, 0, -1]} pose={{ headTilt: -0.25, ...idle(t, 4) }} />
        <F who="L" at={[3.2, 0, 0]} ry={-0.3} pose={{ armR: [prog(t, 7, 7.6) * 1.2, 0], headTilt: prog(t, 7, 7.6) * 0.3 }} />
      </>
    ),
  }),
  /* 17 — Poison dirt */
  17: (t) => {
    const drop = prog(t, 6, 6.8);
    return {
      cam: cam(t, [[0, [1.0, 2.3, 7.5], [1.0, 2.0, 0], 36], [10, [1.0, 2.5, 7], [1.0, 2.2, 0], 34]]),
      scene: (
        <>
          <MarsSurface sky="morning" sunDir={[-60, 25, 10]} />
          <F who="M" at={[-0.2, -0.6, 0]} ry={0.2} pose={{ legL: 1.4, legR: 0.1, armL: t < 6 ? [1.4, 0] : [0.4 + Math.sin(t * 10) * 0.3, 0.2], armR: [0.6, 0] }} />
          {Array.from({ length: 10 }).map((_, i) => (
            <mesh key={i} position={[0.55 + (i % 3) * 0.1, lerp(2.1 + (i % 2) * 0.1, 0.1, drop), 1.25 + (i % 4) * 0.06]}>
              <cylinderGeometry args={[0.07, 0.07, 0.07, 8]} />
              <meshStandardMaterial color="#c4602e" />
            </mesh>
          ))}
          <F who="L" at={[2.8, 0, 0.6]} ry={-0.6} pose={{ armR: [1.3, 0.1] }} />
          {t > 3 && t < 6.5 ? <Glow at={[2.2, 3.1, 1.8]} size={1.6} color="#ff2020" opacity={0.6 + 0.4 * Math.sin(t * 14)} /> : null}
          <F who="P" at={[-4.5, 0, -2.5]} ry={0.6} pose={idle(t, 5)} />
        </>
      ),
    };
  },
  /* 18 — Hide from the sky (timelapse) */
  18: (t) => {
    const p = prog(t, 0.3, 9.4);
    const sun = (t * 1.6) % 2;
    const ang = Math.PI * (sun / 2);
    return {
      cam: cam(t, [[0, [24, 22, 18], [-2, 0, -20], 46], [10, [20, 20, 16], [-2, 0, -20], 46]]),
      scene: (
        <>
          <MarsSurface sky="day" sunDir={[-Math.cos(ang) * 60, 10 + Math.sin(ang) * 40, 10]} studCenter={[0, -10]} fogFar={300} />
          <Lander hatch={1} />
          <Base progress={p} t={t} />
          <Rover at={[lerp(-14, 12, (t * 0.35) % 1), 0, -15]} blade wheelSpin={t * 6} />
          {[-3, 1, 5].map((x, i) => (
            <F key={i} who={(["P", "M", "L"] as Who[])[i]} at={[x + Math.sin(t * 2 + i) * 2, 0, -12 + Math.cos(t * 1.5 + i)]} ry={Math.sin(t * 2 + i) > 0 ? 1.4 : -1.4} pose={walk(t * 2 + i)} />
          ))}
        </>
      ),
    };
  },
  /* 19 — Helmets off */
  19: (t) => {
    const off = prog(t, 3, 4.6);
    const h = t < 4.6 ? "on" : "hip";
    const lift: Pose = off > 0 && off < 1 ? { armL: [2.6, 0.2], armR: [2.6, 0.2] } : {};
    const walkIn = prog(t, 0.2, 3);
    const pos = (z: number): V3 => [lerp(11, 6.5, walkIn), 0, z];
    const camP: V3 = [-4, 4.3, 9];
    return {
      cam: cam(t, [[0, [-1, 4.3, 7], [8, 3.4, 1], 40], [10, camP, [7, 3.2, 1], 40]]),
      scene: (
        <>
          <HabInterior view="day" />
          <F who="P" at={pos(-1.8)} ry={face(pos(-1.8), camP) - 0.3} helmet={h} pose={walkIn < 1 ? walk(t) : { ...idle(t), ...lift, ...(t > 6 ? { armL: [1.4, 0.6] } : {}) }} />
          <F who="M" at={pos(1)} ry={face(pos(1), camP)} helmet={h} pose={walkIn < 1 ? walk(t + 1) : { ...idle(t, 1), ...lift }} mouth={t > 6 && t < 8 ? 0.9 : undefined} />
          <F who="L" at={pos(3.8)} ry={face(pos(3.8), camP) + 0.2} helmet={h} pose={walkIn < 1 ? walk(t + 2) : { ...idle(t, 2), ...lift, head: t > 6 ? Math.sin(t * 9) * 0.3 : 0 }} />
        </>
      ),
    };
  },
  /* 20 — Breathing Mars */
  20: (t) => {
    if (t < 3.2) {
      return {
        cam: cam(t, [[0, [4, 4, 0], [-1, 4.4, -13], 40], [3.2, [3.6, 4, -1], [-1, 4.4, -13], 40]]),
        scene: (
          <>
            <HabInterior view="day" />
            <F who="P" at={[-2.4, 0, -8.5]} ry={2.6} helmet="hip" pose={point(t, "L")} />
            <F who="M" at={[1.6, 0, -10.5]} ry={Math.PI} helmet="hip" pose={idle(t, 1)} />
          </>
        ),
      };
    }
    return {
      cam: cam(t, [[3.2, [-1, 3.6, -5], [-4.5, 1.8, -14], 40], [10, [-2.5, 3.0, -8.5], [-4.5, 1.7, -14], 36]]),
      scene: (
        <>
          <MarsSurface sky="day" sunDir={[-20, 40, 10]} studCenter={[-4, -12]} />
          <Base progress={1} t={t} />
          <O2Unit cutaway={prog(t, 3.5, 5)} t={t} />
        </>
      ),
    };
  },
  /* 21 — Ice below */
  21: (t) => {
    if (t < 7) {
      return {
        cam: cam(t, [[0, [12, 5, -22], [3, 5, -40], 44], [7, [9, 5, -27], [3, 5.5, -40], 40]]),
        scene: (
          <>
            <MarsSurface sky="day" sunDir={[-20, 40, 10]} studCenter={[3, -32]} />
            <Base progress={1} drillSpin={t * 8} core={prog(t, 3, 6)} />
          </>
        ),
      };
    }
    return {
      cam: cam(t, [[7, [2, 3.8, -1], [2, 3.3, -9], 34]]),
      scene: (
        <>
          <HabInterior view="day" />
          <F who="L" at={[2, 0, -9]} helmet="hip" pose={cheer(t)} />
        </>
      ),
    };
  },
  /* 22 — Martian potatoes */
  22: (t) => ({
    cam: cam(t, [[0, [-7, 4, 12], [-3, 2.8, 0], 40], [10, [4, 4, 12], [2, 2.8, 0], 40]]),
    scene: (
      <>
        <GreenhouseInterior />
        <F who="P" at={[-4.2, 0, 2.2]} ry={-0.6} helmet="hip" pose={{ armR: [1.2, 0], armL: [0.2, 0] }} />
        <mesh position={[-5.0, 2.4, 3.0]} rotation={[0, 0, 0.5]}>
          <cylinderGeometry args={[0.3, 0.35, 0.5, 12]} />
          <meshStandardMaterial color="#2d6fd0" />
        </mesh>
        <F who="M" at={[0, 0, 3]} helmet="hip" pose={t > 1.6 ? { armR: [2.9, 0.1], armL: [0.3, 0.3] } : { armR: [0.8, 0], armL: [0.8, 0] }} />
        {t > 1.6 ? (
          <mesh position={[-0.66, 3.7, 3.15]} scale={[1.2, 0.8, 0.9]}>
            <sphereGeometry args={[0.32, 14, 10]} />
            <meshStandardMaterial color="#c9a46a" roughness={0.7} />
          </mesh>
        ) : null}
        <F who="L" at={[4.2, 0, 2.6]} ry={-0.3} helmet="hip" pose={t > 3.5 ? { armL: [2.4, 0.2], headTilt: -0.3 } : idle(t, 2)} />
      </>
    ),
  }),
  /* 23 — Power problem */
  23: (t) => {
    if (t < 7.4) {
      return {
        cam: cam(t, [[0, [-10, 5, 2], [-20, 1.5, -10], 44], [7.4, [-14, 5, 0], [-31, 2.5, -24], 44]]),
        scene: (
          <>
            <MarsSurface sky="day" sunDir={[-20, 40, 10]} studCenter={[-18, -8]} />
            <Base progress={1} dust={0.35} />
          </>
        ),
      };
    }
    return {
      cam: cam(t, [[7.4, [2.5, 4, -6], [-1, 4.2, -13], 36]]),
      scene: (
        <>
          <HabInterior view="day" />
          <F who="P" at={[-1.2, 0, -10.5]} ry={2.5} helmet="hip" pose={{ armL: [1.5 + Math.abs(Math.sin(t * 8)) * 0.15, 0], headTilt: Math.sin(t * 4) * 0.1 }} />
        </>
      ),
    };
  },
  /* 24 — A sol and a year */
  24: (t) => {
    const txt = t < 1 ? "23:59" : t < 2 ? "24:00" : "24:39";
    return {
      cam: cam(t, [[0, [-6, 4.3, 2], [-6, 4.2, -12], 38], [6, [-6, 4.3, 1.5], [-6, 4.2, -12], 38], [10, [-4.2, 3.8, -2], [-3.4, 3.4, -8], 34]]),
      scene: (
        <>
          <HabInterior view="day" />
          <Clock at={[-6, 6.2, -12.2]} ry={0.45} text={txt} />
          {t > 3 ? <Label at={[-6, 4.7, -12]} ry={0.45} text="687 DAYS" w={2.8 * prog(t, 3, 4)} /> : null}
          <F who="L" at={[-8.8, 0, -7.8]} ry={0.4} helmet="hip" pose={t < 3 ? { armR: [1.8, -0.3] } : idle(t, 2)} />
          <F who="M" at={[-3.4, 0, -7.8]} ry={-0.3} helmet="hip" patch={false} pose={t > 6 ? { armL: [0.25, 0.1], armR: [0.25, 0.1], headTilt: 0.35 } : { armL: [1.0 + Math.sin(t * 7) * 0.2, 0], armR: [1.0, 0] }} />
        </>
      ),
    };
  },
  /* 25 — Hi Mom! */
  25: (t) => ({
    cam: cam(t, [[0, [5, 3.7, 1.6], [5, 3.3, -6], 36]]),
    scene: (
      <>
        <HabInterior view="day" />
        <mesh position={[5, 1.2, -4.8]}>
          <boxGeometry args={[3.6, 1.6, 1.2]} />
          <meshStandardMaterial color="#3a3f45" />
        </mesh>
        <F who="M" at={[5, t > 7 ? Math.abs(Math.sin(t * 7)) * 0.25 : 0, -6.2]} helmet="hip" pose={t < 2 ? { armR: [2.6, 0.3 + Math.sin(t * 12) * 0.3] } : { armR: [2.6, 0.3] }} mouth={t > 2 && t < 7 ? 0.25 : undefined} />
        <F who="L" at={[8.6, 0, -10]} ry={-0.4} helmet="hip" pose={{ armR: [1.6, 0.2] }} />
        <mesh position={[8.3, 3.0, -9.0]}>
          <cylinderGeometry args={[0.18, 0.15, 0.4, 12]} />
          <meshStandardMaterial color="#f2f2f0" />
        </mesh>
        <pointLight position={[5, 3, -3.5]} color="#7fd8ff" intensity={20} distance={6} />
      </>
    ),
  }),
  /* 26 — The wall of dust */
  26: (t) => {
    const h = t < 7 ? "hip" : "on";
    const turn = prog(t, 6, 7);
    const run = prog(t, 7.6, 10);
    const pose = (s: number): Pose => (t < 6 ? idle(t, s) : t < 7.6 ? { armL: [2.4, 0.2], armR: [2.4, 0.2] } : walk(t * 1.6 + s));
    return {
      cam: cam(t, [[0, [0, 4.6, 3], [0, 5, -13], 44], [6, [0, 4.6, 1.5], [0, 5, -13], 44], [10, [-2, 4.4, 1.5], [6, 3.5, -4], 44]]),
      scene: (
        <>
          <HabInterior view="day" alarm={t > 0.3 ? 0.5 + 0.5 * Math.sin(t * 8) : 0} lights={0.7} />
          <WindowSky>
            <mesh position={[0, -1.6, 0.02]} scale={[1, prog(t, 0, 7) * 1.4 + 0.2, 1]}>
              <circleGeometry args={[3.9, 40, Math.PI * 1.0, Math.PI * 1.0]} />
              <meshBasicMaterial color="#6b3a22" transparent opacity={0.85} />
            </mesh>
          </WindowSky>
          <F who="P" at={[-3 + run * 9, 0, -7]} ry={lerp(Math.PI, Math.PI / 2, turn)} helmet={h} pose={t > 1 && t < 4 ? { armL: [1.3, -0.3] } : pose(0)} />
          <F who="M" at={[0 + run * 9, 0, -6.4]} ry={lerp(Math.PI, Math.PI / 2, turn)} helmet={h} patch={false} pose={pose(1)} />
          <F who="L" at={[3 + run * 9, 0, -7]} ry={lerp(Math.PI, Math.PI / 2, turn)} helmet={h} pose={t < 6 ? { armR: [1.6, 0] } : pose(2)} />
        </>
      ),
    };
  },
  /* 27 — The crack, revisited */
  27: (t) => {
    // 4.8–7 s: exact match-cut to the cold-open patch moment (Shot 02)
    if (t > 4.8 && t < 7) return SHOT_SCENES[2](t - 4.8);
    const fall = prog(t, 1.2, 2.6);
    const up = prog(t, 7.2, 9);
    const insert = t > 4.8 && t < 7;
    const M: V3 = [lerp(-21.5, -19.6, prog(t, 0, 1.4)), 0, -3];
    return {
      cam: insert
        ? cam(t, [[4.8, [-19.2, 3.4, -8.4], [-19.6, 0.9, -6.2], 40], [7, [-19.1, 3.2, -8.2], [-19.6, 0.9, -6.2], 38]])
        : shake(cam(t, [[0, [-17, 5, 11], [-20, 2, -4], 44], [4.8, [-17.5, 4.5, 10], [-19.6, 1.6, -3], 42], [7, [-17.5, 4, 9], [-19, 2.5, -3], 42], [10, [-17.5, 4, 8.5], [-19, 2.8, -3], 40]]), t, 0.03),
      scene: (
        <>
          <MarsSurface sky="storm" fogNear={3} fogFar={80} studCenter={[-20, -4]} />
          <Base progress={1} dust={0.7} />
          <Dust t={t} center={[-19, 0, -3]} />
          <mesh position={[-20.2, 0.12, -2.6]} rotation={[0, 0.4, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 6, 8]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[-19.6, 0.4, -7.2]} castShadow>
            <boxGeometry args={[1.2, 0.8, 1]} />
            <meshStandardMaterial color="#5e2818" roughness={0.85} />
          </mesh>
          <F who="M" at={[M[0], up > 0 ? lerp(0.3, 0, up) : fall * 0.3, M[2]]} rx={lerp(-fall * 1.35, 0, up)} pose={t < 1.4 ? walk(t * 1.5) : { armL: [1.4, 0.3], armR: [1.4, 0.3] }} crack={prog(t, 2.6, 4)} patch={t > 5.6} />
          <F who="L" at={[lerp(-16, -18.3, prog(t, 3, 5)), 0, -5.2]} ry={-1.5} pose={{ armR: insert ? [1.5, 0] : [lerp(0.3, 1.4, prog(t, 7, 7.5)), 0.2] }} />
          <F who="P" at={[-25, 0, -8]} ry={-0.6} pose={{ armL: [1.0 + Math.sin(t * 5) * 0.3, 0], armR: [1.0 + Math.cos(t * 5) * 0.3, 0] }} />
        </>
      ),
    };
  },
  /* 28 — The gentle hurricane */
  28: (t) => {
    const run = prog(t, 6.8, 10);
    return {
      cam: cam(t, [[0, [-20, 3.6, 6], [-20, 3.2, -4], 36], [6.8, [-20, 3.6, 5], [-20, 3.2, -4], 36], [10, [-17, 4, 6], [-12, 3, -4], 40]]),
      scene: (
        <>
          <MarsSurface sky="storm" fogNear={3} fogFar={80} studCenter={[-18, -4]} />
          <Base progress={1} dust={0.85} />
          <Dust t={t} center={[-20, 0, -3]} />
          <F who="P" at={[-20 + run * 8, 0, -4]} ry={run > 0 ? Math.PI / 2 : 0.1} pose={run > 0 ? walk(t * 1.6) : { armL: [1.2, 1.0], armR: [1.2, 1.0], headTilt: -0.15 }} />
          <F who="M" at={[-16.5 + run * 9, 0, -7]} ry={Math.PI / 2} patch pose={walk(t * 1.6 + 1)} />
          <F who="L" at={[-15 + run * 9, 0, -7.6]} ry={Math.PI / 2} pose={walk(t * 1.6 + 2)} />
        </>
      ),
    };
  },
  /* 29 — Bones in low gravity */
  29: (t) => ({
    cam: cam(t, [[0, [0, 3.8, 5], [0, 3.2, -6], 42], [10, [0, 3.8, 3], [0, 3.2, -6], 40]]),
    scene: (
      <>
        <HabInterior view="day" />
        <mesh position={[0, 0.25, -6.5]}>
          <boxGeometry args={[3.2, 0.5, 1.6]} />
          <meshStandardMaterial color="#3a3f45" />
        </mesh>
        <F who="P" at={[0, 0.5 + Math.abs(Math.sin(t * 5)) * 0.15, -6.5]} ry={Math.PI / 2} helmet="hip" pose={walk(t, 10)} />
        {[-1, 1].map((s) => (
          <mesh key={s} position={[-0.2, 4.2, -6.5 + s * 0.4]} rotation={[s * 0.3, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 4.6, 6]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        ))}
        <F who="M" at={[-4.6, 0, -5]} ry={0.3} helmet="hip" patch pose={{ armL: [0.6 + Math.max(0, Math.sin(t * 3)) * 1.2, 0], armR: [0.6 + Math.max(0, -Math.sin(t * 3)) * 1.2, 0], headTilt: 0.1 }} />
        <F who="L" at={[4.4, 0, -6]} ry={-0.8} helmet="hip" pose={idle(t, 3)} />
        <group position={[6.6, 4.2, -8]}>
          <mesh rotation={[0, 0, 0.3]}>
            <cylinderGeometry args={[0.35 * lerp(1, 0.75, prog(t, 2, 8)), 0.35, 2.6, 16, 1, true]} />
            {holoMat(0.5)}
          </mesh>
        </group>
      </>
    ),
  }),
  /* 30 — Born on Mars */
  30: (t) => ({
    cam: cam(t, [[0, [4, 4.2, 4], [0, 3.2, -4], 38], [10, [-3, 4.2, 4.5], [0, 3.2, -4], 38]]),
    scene: (
      <>
        <HabInterior view="day" />
        <HoloTable at={[0, 0, -4]} />
        <group position={[0, 1.2, -4]} scale={[0.42 * prog(t, 0.3, 1.5), 0.6 * prog(t, 0.3, 1.5), 0.42 * prog(t, 0.3, 1.5)]} rotation={[0, t * 0.6, 0]}>
          <Minifig who="M" holo mouth={0} />
        </group>
        {t > 1.5 ? <Label at={[0, 4.3, -4]} text="?" w={1.4} /> : null}
        <F who="L" at={[3.2, 0, -3]} ry={-1.3} helmet="hip" pose={{ armR: [prog(t, 0, 0.5) * 1.2, 0], headTilt: -0.15 }} />
        <F who="P" at={[-3.2, 0, -3]} ry={1.3} helmet="hip" pose={t > 7 ? { armL: [2.2, -0.3] } : idle(t, 1)} />
      </>
    ),
  }),
  /* 31 — Can we fix Mars? */
  31: (t) => {
    const tf = t < 6 ? prog(t, 2.5, 5.5) : 1 - prog(t, 6, 8);
    const flick = t > 6 && t < 8 ? (Math.sin(t * 60) > 0 ? 1 : 0.6) : 1;
    return {
      cam: cam(t, [[0, [0, 4.6, 7], [0, 3.4, -4], 38], [10, [0, 4.4, 5], [0, 3.6, -4], 36]]),
      scene: (
        <>
          <HabInterior view="day" />
          <HoloTable at={[0, 0, -4]} />
          <group scale={flick}>
            <MarsGlobe at={[0, 3.3, -4]} r={1.2} spin={t * 0.8} terraform={tf} holo />
          </group>
          <F who="P" at={[-3.2, 0, -6]} ry={0.5} helmet="hip" pose={t > 6 ? { ...idle(t, 1), head: Math.sin(t * 6) * 0.35 } : idle(t, 1)} />
          <F who="M" at={[0, 0, -7]} helmet="hip" patch pose={t < 6 ? { armL: [1.5, 0], armR: [1.5, 0] } : { armL: [0.1, 0.1], armR: [0.1, 0.1], headTilt: 0.35 }} />
          <F who="L" at={[3.2, 0, -6]} ry={-0.5} helmet="hip" pose={{ armL: [1.1, -0.6], armR: [1.1, -0.6] }} />
        </>
      ),
    };
  },
  /* 32 — Blue sunset */
  32: (t) => {
    const walkIn = prog(t, 0, 3.5);
    const sunY = lerp(1.0, -1.15, prog(t, 0, 10));
    return {
      cam: cam(t, [[0, [0, 4.6, 6], [0, 4.8, -13], 40], [10, [0, 4.8, 1.5], [0, 4.9, -13], 40]]),
      scene: (
        <>
          <HabInterior view="sunset" lights={0.45} />
          <WindowSky>
            <Glow at={[0.8, sunY, 0.05]} size={5 + prog(t, 3, 8) * 4} color="#3d7dff" opacity={1} />
            <Glow at={[0.8, sunY, 0.06]} size={2.4} color="#9cc4ff" opacity={1} />
            <mesh position={[0.8, sunY, 0.08]}>
              <circleGeometry args={[0.28, 24]} />
              <meshBasicMaterial color="#f4f8ff" toneMapped={false} />
            </mesh>
            <mesh position={[0, -2.2, 0.1]}>
              <circleGeometry args={[3.98, 40, Math.PI * 1.07, Math.PI * 0.86]} />
              <meshBasicMaterial color="#3a1a10" />
            </mesh>
          </WindowSky>
          {(["P", "M", "L"] as Who[]).map((w, i) => (
            <F key={w} who={w} at={[(i - 1) * 2.8, 0, lerp(-3, -9, walkIn)]} ry={Math.PI} helmet="hip" patch={w === "M"} pose={walkIn < 1 ? walk(t * 1.2 + i) : idle(t, i)} />
          ))}
        </>
      ),
    };
  },
  /* 33 — The blue star */
  33: (t) => ({
    cam: cam(t, [[0, [4.2, 3.8, -8.4], [0.4, 4.0, -12.6], 34], [10, [3.6, 3.7, -8.6], [0.2, 3.8, -12.6], 32]]),
    scene: (
      <>
        <HabInterior view="dusk" lights={0.35} />
        <WindowSky>
          <Glow at={[-1.2, -0.3, 0.06]} size={0.9 * prog(t, 0, 2.5)} color="#9fd0ff" />
          <mesh position={[-1.2, -0.3, 0.08]} scale={prog(t, 0, 2.5)}>
            <circleGeometry args={[0.06, 12]} />
            <meshBasicMaterial color="#e8f4ff" toneMapped={false} />
          </mesh>
          <mesh position={[0, -2.2, 0.1]}>
            <circleGeometry args={[3.98, 40, Math.PI * 1.07, Math.PI * 0.86]} />
            <meshBasicMaterial color="#26120a" />
          </mesh>
        </WindowSky>
        <F who="L" at={[0.6, 0, -11.6]} ry={Math.PI} helmet="hip" pose={{ armR: [prog(t, 3, 4.5) * 1.5, -0.1], headTilt: -0.15 }} />
        <F who="M" at={[lerp(4.5, 2.6, prog(t, 7, 9)), 0, -11.2]} ry={Math.PI + 0.3} helmet="hip" patch pose={{ armL: [prog(t, 8.5, 9.5) * 1.4, 0] }} />
      </>
    ),
  }),
  /* 34 — The answer */
  34: (t) => {
    if (t < 7) {
      return {
        cam: cam(t, [[0, [0, 4.4, -12.8], [0, 3.0, -3], 46], [7, [0, 4.6, -13.1], [0, 3.0, -3], 50]]),
        scene: (
          <>
            <HabInterior view="dusk" lights={0.6} />
            <F who="P" at={[-2.0, 0, -6.2]} helmet="hip" pose={t > 4 && t < 5 ? { armR: [2.7, 0.2], armL: [1.0, -0.4] } : { armL: [1.0, -0.4], armR: [1.0, -0.4] }} />
            <F who="M" at={[0.1, 0, -6.8]} helmet="hip" patch pose={idle(t, 1)} />
            <F who="L" at={[2.2, 0, -6.8]} helmet="hip" pose={idle(t, 2)} />
          </>
        ),
      };
    }
    return {
      cam: cam(t, [[7, [-6, 5, 2], [0, 2, -24], 46], [10, [-10, 11, 16], [0, 2, -24], 50]]),
      scene: (
        <>
          <MarsSurface sky="dusk" sunDir={[-40, 8, -30]} studCenter={[0, -10]} />
          <Base progress={1} />
          {BASE.domes.map(([x, z], i) => (
            <Glow key={i} at={[x, 3, z + 4]} size={8} color="#ffcf8a" opacity={0.6} />
          ))}
          <Stars count={600} opacity={0.6} />
        </>
      ),
    };
  },
  /* 35 — The doomed moon */
  35: (t) => {
    const rise = lerp(-1.4, 2.2, prog(t, 0, 7));
    return {
      cam: cam(t, [[0, [0, 4.6, 1], [0, 5, -13], 40], [10, [0, 4.9, -3], [0, 5.3, -13], 40]]),
      scene: (
        <>
          <HabInterior view="night" lights={0.35} />
          <WindowSky>
            <Phobos at={[-1.4, rise, 0.4]} r={0.45} crack={prog(t, 8, 10)} />
            {t > 3 ? (
              <group position={[0.6, -1.8, 0.2]} rotation={[1.25, 0, 0]} scale={prog(t, 3, 4)}>
                {Array.from({ length: 60 }).map((_, i) => {
                  const a = i * 0.32;
                  const r = 2.3 - i * 0.03;
                  return (
                    <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r, 0]} visible={i / 60 < prog(t, 3.5, 8)}>
                      <sphereGeometry args={[0.04, 6, 4]} />
                      {holoMat(0.9)}
                    </mesh>
                  );
                })}
                <mesh>
                  <circleGeometry args={[0.55, 24]} />
                  <meshBasicMaterial color="#d05a2a" transparent opacity={0.6} />
                </mesh>
              </group>
            ) : null}
            <mesh position={[0, -2.2, 0.5]}>
              <circleGeometry args={[3.98, 40, Math.PI * 1.07, Math.PI * 0.86]} />
              <meshBasicMaterial color="#160a06" />
            </mesh>
          </WindowSky>
          <F who="P" at={[-2.8, 0, -8]} ry={Math.PI - 0.2} helmet="hip" pose={t > 3 ? { armL: [1.5, -0.2] } : idle(t, 1)} />
          <F who="M" at={[0, 0, -7.6]} ry={Math.PI} helmet="hip" patch pose={idle(t, 2)} />
          <F who="L" at={[2.8, 0, -8]} ry={Math.PI + 0.2} helmet="hip" pose={t < 3.5 ? { armR: [2.2, -0.2] } : idle(t, 3)} />
        </>
      ),
    };
  },
  /* 36 — Next time */
  36: (t) => {
    const portal = prog(t, 3.6, 5.2);
    const moon = 1 - prog(t, 6.0, 7.4);
    const flick = t > 6 && t < 7.4 ? (Math.sin(t * 50) > 0 ? 1 : 0.2) : 1;
    return {
      cam:
        t < 3.8
          ? cam(t, [[0, [0, 3.6, -1.6], [0, 3.4, -8], 30], [3.8, [0, 3.6, -2.6], [0, 3.4, -8], 28]])
          : cam(t, [[3.8, [3, 4.6, 6], [-0.5, 4.5, -14], 50], [10, [2, 4.4, 3], [-0.5, 4.8, -14], 50]]),
      scene: (
        <>
          <HabInterior view="night" lights={0.35 + portal * 0.2} />
          {portal > 0 ? (
            <group scale={portal}>
              <Engine at={[-0.5, 0, -12]} power={1} spin={t * 4} />
              <mesh position={[-0.5, 4.2, -12.06]}>
                <circleGeometry args={[2.75, 48]} />
                <meshBasicMaterial color="#0a1a3a" />
              </mesh>
              <mesh position={[0.4, 5.0, -12.0]} scale={moon * flick}>
                <circleGeometry args={[0.6, 32]} />
                <meshBasicMaterial color="#f2f0e4" toneMapped={false} />
              </mesh>
              <Glow at={[0.4, 5.0, -11.95]} size={2.4 * moon * flick} color="#fff6d8" opacity={0.7} />
              {Array.from({ length: 6 }).map((_, i) => (
                <mesh key={i} position={[-2.2 + i * 0.7, 2.2 + (i % 2) * 0.2, -11.98]}>
                  <boxGeometry args={[0.4, 0.6 + (i % 3) * 0.5, 0.02]} />
                  <meshBasicMaterial color="#26304a" />
                </mesh>
              ))}
            </group>
          ) : null}
          <F who="M" at={[0.5, 0, -7.5]} ry={lerp(Math.PI, 0.1, prog(t, 0.2, 1.6))} helmet="hip" patch pose={t > 4 ? { armL: [0.5, 0.4], armR: [0.5, 0.4] } : idle(t, 2)} />
          <F who="P" at={[-2.8, 0, -7]} ry={t > 4 ? Math.PI - 0.3 : 0.6} helmet="hip" pose={t > 5.5 && t < 7 ? { armR: [2.7, 0.2] } : idle(t, 1)} />
          <F who="L" at={[3.4, 0, -7]} ry={t > 4 ? Math.PI + 0.3 : -0.6} helmet="hip" pose={t > 4 ? { armR: [2.5, -0.2] } : idle(t, 3)} />
        </>
      ),
    };
  },
};

export { THREE };

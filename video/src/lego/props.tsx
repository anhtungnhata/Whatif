import React from "react";
import * as THREE from "three";
import { COLORS } from "./Minifig";
import { Glow } from "./envs";
import { clamp01, tex, V3 } from "./util";

const W = (p: { c?: string; r?: number; e?: string; ei?: number; o?: number }) => (
  <meshStandardMaterial
    color={p.c ?? COLORS.white}
    roughness={p.r ?? 0.35}
    emissive={p.e ?? "#000"}
    emissiveIntensity={p.ei ?? 1}
    transparent={p.o !== undefined}
    opacity={p.o ?? 1}
  />
);

export const LANDER_POS: V3 = [-10, 0, -2];

export const Lander: React.FC<{ at?: V3; flame?: number; legs?: number; hatch?: number }> = ({
  at = LANDER_POS,
  flame = 0,
  legs = 1,
  hatch = 0,
}) => (
  <group position={at}>
    <mesh position={[0, 5, 0]} castShadow>
      <cylinderGeometry args={[2.6, 3, 4.5, 24]} />
      {W({})}
    </mesh>
    <mesh position={[0, 5.4, 0]}>
      <cylinderGeometry args={[2.72, 2.85, 0.5, 24]} />
      {W({ c: "#ff7a1a" })}
    </mesh>
    <mesh position={[0, 8.2, 0]} castShadow>
      <coneGeometry args={[2.6, 2, 24]} />
      {W({})}
    </mesh>
    {/* hatch facing +x (camera right) */}
    <group position={[2.85, 4.6, 0.6]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[1.7, 2.6]} />
        <meshBasicMaterial color={hatch > 0 ? "#2a2a2a" : "#d9dcdf"} />
      </mesh>
      <group position={[-0.85, 0, 0.05]} rotation={[0, -hatch * 1.6, 0]}>
        <mesh position={[0.85, 0, 0]}>
          <boxGeometry args={[1.7, 2.6, 0.12]} />
          {W({ c: "#e6e8ea" })}
        </mesh>
      </group>
    </group>
    {/* ladder */}
    {hatch > 0
      ? Array.from({ length: 5 }).map((_, i) => (
          <mesh key={i} position={[3.3, 0.4 + i * 0.7, 0.6]}>
            <boxGeometry args={[0.12, 0.1, 1.2]} />
            {W({ c: "#888" })}
          </mesh>
        ))
      : null}
    {[0, 1, 2, 3].map((i) => {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      return (
        <group key={i} rotation={[0, a, 0]}>
          <mesh position={[2.4 + legs * 0.8, 1.6, 0]} rotation={[0, 0, 0.45 * legs]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 4, 8]} />
            {W({ c: "#9aa0a6" })}
          </mesh>
          <mesh position={[3.1 + legs * 1.0, 0.1, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 0.2, 12]} />
            {W({ c: "#9aa0a6" })}
          </mesh>
        </group>
      );
    })}
    {flame > 0
      ? [0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <group key={i} position={[Math.cos(a) * 1.5, 2.4, Math.sin(a) * 1.5]}>
              <mesh position={[0, -1.4 * flame, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.45, 3 * flame, 12]} />
                <meshBasicMaterial color="#ffd27a" transparent opacity={0.9} toneMapped={false} />
              </mesh>
              <Glow at={[0, -1.5 * flame, 0]} size={5 * flame} color="#ffb347" />
            </group>
          );
        })
      : null}
    {flame > 0 ? <pointLight position={[0, 0.5, 0]} intensity={300 * flame} color="#ffb347" distance={30} /> : null}
  </group>
);

export const Rover: React.FC<{ at: V3; ry?: number; blade?: boolean; wheelSpin?: number }> = ({
  at,
  ry = 0,
  blade,
  wheelSpin = 0,
}) => (
  <group position={at} rotation={[0, ry, 0]}>
    <mesh position={[0, 2, 0]} castShadow>
      <boxGeometry args={[6, 2.2, 3.2]} />
      {W({})}
    </mesh>
    <mesh position={[1.5, 3.4, 0]} castShadow>
      <boxGeometry args={[2.6, 1.2, 2.8]} />
      {W({ c: "#ff7a1a" })}
    </mesh>
    <mesh position={[2.85, 3.4, 0]}>
      <boxGeometry args={[0.1, 0.8, 2.2]} />
      <meshStandardMaterial color="#223" roughness={0.1} />
    </mesh>
    {[-2, 0, 2].map((x) =>
      [-1.7, 1.7].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.75, z]} rotation={[Math.PI / 2, wheelSpin, 0]} castShadow>
          <cylinderGeometry args={[0.75, 0.75, 0.6, 16]} />
          {W({ c: "#2b2b2b", r: 0.8 })}
        </mesh>
      )),
    )}
    {blade ? (
      <mesh position={[3.6, 1.0, 0]} castShadow>
        <boxGeometry args={[0.3, 1.6, 4]} />
        {W({ c: COLORS.yellow })}
      </mesh>
    ) : null}
  </group>
);

const o2Tex = () =>
  tex("o2", 256, 256, (c, w, h) => {
    c.fillStyle = "#f2f2f0";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#13a3a8";
    c.font = "bold 120px Arial";
    c.textAlign = "center";
    c.fillText("O2", w / 2, h / 2 + 40);
  });

export const BASE = {
  domes: [
    [-9, -22],
    [0, -25],
    [9, -22],
  ] as [number, number][],
  greenhouse: [19, -19] as [number, number],
  solar: [-22, -10] as [number, number],
  reactor: [-31, -24] as [number, number],
  drill: [3, -40] as [number, number],
  o2: [-4.5, -14] as [number, number],
};

export const SolarArray: React.FC<{ at?: [number, number]; dust?: number; tie?: number }> = ({
  at = BASE.solar,
  dust = 0,
}) => (
  <group position={[at[0], 0, at[1]]}>
    {Array.from({ length: 3 }).map((_, row) =>
      Array.from({ length: 4 }).map((_, i) => (
        <group key={`${row}-${i}`} position={[i * 3.4 - 5, 0, row * 4 - 4]}>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 1.6, 6]} />
            {W({ c: "#888" })}
          </mesh>
          <mesh position={[0, 1.7, 0]} rotation={[-0.55, 0, 0]} castShadow>
            <boxGeometry args={[3.1, 0.12, 2.4]} />
            <meshStandardMaterial
              color={new THREE.Color("#3f7fe0").lerp(new THREE.Color("#b5653a"), dust)}
              roughness={0.15 + dust * 0.6}
              transparent
              opacity={0.88}
            />
          </mesh>
        </group>
      )),
    )}
  </group>
);

export const Reactor: React.FC<{ at?: [number, number] }> = ({ at = BASE.reactor }) => (
  <group position={[at[0], 0, at[1]]}>
    <mesh position={[0, 2.2, 0]} castShadow>
      <cylinderGeometry args={[1.2, 1.4, 4.4, 20]} />
      {W({ c: "#8a9096" })}
    </mesh>
    {Array.from({ length: 6 }).map((_, i) => (
      <mesh key={i} position={[0, 3.2, 0]} rotation={[0, (i / 6) * Math.PI, 0]}>
        <boxGeometry args={[4.4, 2, 0.12]} />
        {W({ c: "#6d7379" })}
      </mesh>
    ))}
    <Glow at={[0, 0.6, 1.4]} size={2.5} color="#7ff8ff" opacity={0.6} />
    <mesh position={[0, 1.2, 4]} scale={[1, 0.4, 0.5]}>
      <sphereGeometry args={[4, 20, 12]} />
      {W({ c: "#9a4526", r: 0.9 })}
    </mesh>
  </group>
);

export const Drill: React.FC<{ at?: [number, number]; spin?: number; core?: number }> = ({
  at = BASE.drill,
  spin = 0,
  core = 0,
}) => (
  <group position={[at[0], 0, at[1]]}>
    {[-1, 1].map((x) =>
      [-1, 1].map((z) => (
        <mesh key={`${x}${z}`} position={[x * 1.4, 5, z * 1.4]} rotation={[z * 0.08, 0, -x * 0.08]} castShadow>
          <boxGeometry args={[0.35, 10, 0.35]} />
          {W({ c: (x + z) % 4 === 0 ? COLORS.white : "#ff7a1a" })}
        </mesh>
      )),
    )}
    {[2, 5, 8].map((y) => (
      <mesh key={y} position={[0, y, 0]}>
        <boxGeometry args={[3.2, 0.3, 3.2]} />
        {W({ c: COLORS.white })}
      </mesh>
    ))}
    <mesh position={[0, 10.3, 0]}>
      <boxGeometry args={[2.2, 1, 2.2]} />
      {W({ c: "#ff7a1a" })}
    </mesh>
    <group position={[0, 1 + core * 6, 0]} rotation={[0, spin, 0]}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 3, 12]} />
        {W({ c: "#9aa0a6" })}
      </mesh>
      {core > 0 ? (
        <group>
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
            {W({ c: "#9a4526", r: 0.9 })}
          </mesh>
          <mesh position={[0, -2.2, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 2.4, 16]} />
            <meshPhysicalMaterial color="#e8f6ff" roughness={0.05} transmission={0.4} transparent opacity={0.9} clearcoat={1} />
          </mesh>
          <Glow at={[0, -2.2, 0.5]} size={3} color="#d8f4ff" opacity={0.5} />
        </group>
      ) : null}
    </group>
  </group>
);

export const O2Unit: React.FC<{ at?: [number, number]; cutaway?: number; t?: number }> = ({
  at = BASE.o2,
  cutaway = 0,
  t = 0,
}) => (
  <group position={[at[0], 0, at[1]]}>
    <mesh position={[0, 1.6, 0]} castShadow>
      <boxGeometry args={[3, 3.2, 2.4]} />
      <meshStandardMaterial color="#f2f2f0" transparent opacity={1 - cutaway * 0.7} roughness={0.35} />
    </mesh>
    <mesh position={[0, 1.8, 1.21]}>
      <planeGeometry args={[1.6, 1.6]} />
      <meshStandardMaterial map={o2Tex()} transparent opacity={1 - cutaway * 0.6} />
    </mesh>
    {cutaway > 0 ? (
      <group>
        <mesh position={[0, 1.6, 0]}>
          <sphereGeometry args={[0.6, 20, 16]} />
          <meshBasicMaterial color="#ff8a2a" toneMapped={false} />
        </mesh>
        <Glow at={[0, 1.6, 0.4]} size={4} color="#ff9a3a" opacity={cutaway} />
        {Array.from({ length: 6 }).map((_, i) => {
          const k = (t * 0.5 + i / 6) % 1;
          return (
            <group key={i}>
              <mesh position={[-1.4 + k * 1.4, 1.6, 0.3]}>
                <sphereGeometry args={[0.13, 10, 8]} />
                <meshStandardMaterial color="#222" />
              </mesh>
              <mesh position={[k * 1.6, 1.6 + Math.sin(k * 6) * 0.2, 0.3]}>
                <sphereGeometry args={[0.12, 10, 8]} />
                <meshStandardMaterial color="#38a8ff" emissive="#38a8ff" emissiveIntensity={0.8} />
              </mesh>
            </group>
          );
        })}
      </group>
    ) : null}
    <mesh position={[2.5, 0.6, -2]} rotation={[0, 0.6, Math.PI / 2]}>
      <cylinderGeometry args={[0.25, 0.25, 4, 10]} />
      {W({ c: "#9aa0a6" })}
    </mesh>
  </group>
);

/** progress 0..1 builds the base in stages */
export const Base: React.FC<{ progress?: number; dust?: number; t?: number; drillSpin?: number; core?: number }> = ({
  progress = 1,
  dust = 0,
  t = 0,
  drillSpin = 0,
  core = 0,
}) => {
  const st = (a: number, b: number) => clamp01((progress - a) / (b - a));
  const dome = st(0, 0.25);
  const bury = st(0.25, 0.6);
  const gh = st(0.55, 0.75);
  const sol = st(0.65, 0.85);
  const rig = st(0.75, 0.95);
  return (
    <group>
      {BASE.domes.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} scale={[dome, dome, dome]}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[i === 1 ? 5 : 4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#f2f2f0" roughness={0.35} />
          </mesh>
          <mesh scale={[1, 0.62 * bury + 0.001, 1]} receiveShadow castShadow>
            <sphereGeometry args={[i === 1 ? 6.2 : 5.2, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#a8492a" roughness={0.95} />
          </mesh>
          {i === 1 ? (
            <mesh position={[0, 1.5, 6]}>
              <boxGeometry args={[2.4, 3, 1.2]} />
              <meshStandardMaterial color="#f5c518" />
            </mesh>
          ) : null}
        </group>
      ))}
      {[-4.5, 4.5].map((x) => (
        <mesh key={x} position={[x, 0.9 * dome, -23.5]} rotation={[0, 0.3 * Math.sign(x), Math.PI / 2]} scale={dome}>
          <cylinderGeometry args={[1.1, 1.1, 5, 16]} />
          <meshStandardMaterial color="#e9ebed" />
        </mesh>
      ))}
      {gh > 0 ? (
        <group position={[BASE.greenhouse[0], 0, BASE.greenhouse[1]]} scale={gh}>
          <mesh>
            <sphereGeometry args={[4.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#ffc8f4" transparent opacity={0.4} roughness={0.05} emissive="#ff4fd8" emissiveIntensity={0.5} />
          </mesh>
          <Glow at={[0, 2, 0]} size={12} color="#ff5fe0" opacity={0.55} />
          <pointLight position={[0, 2, 0]} color="#ff5fe0" intensity={60} distance={14} />
        </group>
      ) : null}
      {sol > 0 ? (
        <group scale={[1, sol, 1]}>
          <SolarArray dust={dust} />
          <Reactor />
        </group>
      ) : null}
      {rig > 0 ? (
        <group scale={[1, rig, 1]}>
          <Drill spin={drillSpin} core={core} />
          <O2Unit t={t} />
        </group>
      ) : null}
    </group>
  );
};

/* ================= BRICKSTAR ship ================= */
export const Brickstar: React.FC<{ at: V3; ry?: number; thrust?: number }> = ({ at, ry = 0, thrust = 0 }) => (
  <group position={at} rotation={[0, ry, 0]}>
    <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[1.2, 1.2, 7, 20]} />
      {W({})}
    </mesh>
    <mesh position={[4.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <coneGeometry args={[1.2, 1.6, 20]} />
      {W({ c: "#ff7a1a" })}
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[-1, 0, s * 3.2]}>
        <boxGeometry args={[2.5, 0.12, 3.6]} />
        <meshStandardMaterial color="#3f7fe0" roughness={0.2} />
      </mesh>
    ))}
    <mesh position={[-3.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.8, 1.1, 0.8, 16]} />
      {W({ c: "#777" })}
    </mesh>
    {thrust > 0 ? <Glow at={[-4.8, 0, 0]} size={3 * thrust} color="#7fd0ff" /> : null}
  </group>
);

/* ================= HOLOGRAMS ================= */
export const holoMat = (o = 0.55) => (
  <meshBasicMaterial color="#5ff5ff" transparent opacity={o} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
);

export const HoloOrbits: React.FC<{ at: V3; t: number; arc?: number; scale?: number }> = ({ at, t, arc = 0, scale = 1 }) => {
  const ea = t * 0.9;
  const ma = t * 0.48 + 0.9;
  return (
    <group position={at} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.35, 20, 14]} />
        <meshBasicMaterial color="#ffd23f" toneMapped={false} />
      </mesh>
      <Glow at={[0, 0, 0]} size={2} color="#ffd23f" />
      {[1.2, 1.9].map((r) => (
        <mesh key={r} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.02, 6, 64]} />
          {holoMat(0.6)}
        </mesh>
      ))}
      <mesh position={[Math.cos(ea) * 1.2, 0, Math.sin(ea) * 1.2]}>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshBasicMaterial color="#3d7bd8" toneMapped={false} />
      </mesh>
      <mesh position={[Math.cos(ma) * 1.9, 0, Math.sin(ma) * 1.9]}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshBasicMaterial color="#e0582a" toneMapped={false} />
      </mesh>
      {arc > 0 ? (
        <mesh rotation={[Math.PI / 2, 0, ea]} scale={[1.55, 1.55, 1]} position={[-0.35 * Math.cos(ea), 0, -0.35 * Math.sin(ea)]}>
          <torusGeometry args={[1, 0.025, 6, 64, Math.PI * arc]} />
          <meshBasicMaterial color="#9ffcff" toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
};

export const HoloPie: React.FC<{ at: V3; k: number }> = ({ at, k }) => (
  <group position={at} rotation={[Math.PI / 2 - 0.3, 0, 0]} scale={k}>
    <mesh>
      <cylinderGeometry args={[0.8, 0.8, 0.12, 40, 1, false, 0, Math.PI * 2 * 0.95]} />
      <meshBasicMaterial color="#ff8a5a" transparent opacity={0.75} toneMapped={false} />
    </mesh>
    <mesh position={[0.05, 0, -0.05]}>
      <cylinderGeometry args={[0.85, 0.85, 0.14, 12, 1, false, Math.PI * 2 * 0.95, Math.PI * 2 * 0.05]} />
      <meshBasicMaterial color="#5ff5ff" toneMapped={false} />
    </mesh>
  </group>
);

export const HoloShield: React.FC<{ at: V3; t: number; strip?: number }> = ({ at, t, strip = 0 }) => (
  <group position={at}>
    <mesh position={[-1.2, 0, 0]}>
      <sphereGeometry args={[0.45, 20, 14]} />
      <meshBasicMaterial color="#3d7bd8" />
    </mesh>
    <mesh position={[-1.2, 0, 0]} scale={[1.3, 1, 1]}>
      <sphereGeometry args={[0.85, 24, 16]} />
      {holoMat(0.1)}
    </mesh>
    <mesh position={[1.2, 0, 0]}>
      <sphereGeometry args={[0.36, 20, 14]} />
      <meshBasicMaterial color="#d05a2a" />
    </mesh>
    {Array.from({ length: 10 }).map((_, i) => {
      const k = (t * 0.6 + i / 10) % 1;
      const y = ((i % 5) - 2) * 0.3;
      const toEarth = i % 2 === 0;
      const x = 3.2 - k * 2.2;
      const xe = toEarth ? Math.max(x, -0.3) : x;
      const bend = toEarth && x < -0.2 ? (y >= 0 ? 0.4 : -0.4) * (-0.2 - x) : 0;
      return (
        <mesh key={i} position={[toEarth ? xe - 1.2 * (x < 0 ? 0 : 0) : x, y + bend, toEarth ? 0.3 : 0]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshBasicMaterial color="#ffd23f" toneMapped={false} />
        </mesh>
      );
    })}
    {strip > 0
      ? Array.from({ length: 6 }).map((_, i) => {
          const k = (t * 0.4 + i / 6) % 1;
          return (
            <mesh key={i} position={[1.2 - k * 0.2 - 0.45, Math.sin(i) * 0.3, -k * 1.2]} scale={1 - k}>
              <sphereGeometry args={[0.07, 8, 6]} />
              <meshBasicMaterial color="#ff9c6a" transparent opacity={0.8 * strip} />
            </mesh>
          );
        })
      : null}
  </group>
);

export const Phobos: React.FC<{ at: V3; r?: number; crack?: number }> = ({ at, r = 1, crack = 0 }) => (
  <group position={at}>
    {crack < 0.5 ? (
      <mesh scale={[1.3, 1, 1]}>
        <icosahedronGeometry args={[r, 1]} />
        <meshStandardMaterial color="#8a8580" roughness={1} flatShading />
      </mesh>
    ) : (
      Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const d = r * (1 + (crack - 0.5) * 6);
        return (
          <mesh key={i} position={[Math.cos(a) * d, Math.sin(a * 3) * 0.1, Math.sin(a) * d * 0.3]}>
            <icosahedronGeometry args={[r * 0.3, 0]} />
            <meshStandardMaterial color="#8a8580" roughness={1} flatShading />
          </mesh>
        );
      })
    )}
  </group>
);

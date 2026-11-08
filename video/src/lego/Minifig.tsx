import React, { useMemo } from "react";
import * as THREE from "three";
import { mouthFor, tex, useClock, V3 } from "./util";

export type Who = "P" | "M" | "L";
export type Pose = {
  /** [forward raise, outward] radians */
  armL?: [number, number];
  armR?: [number, number];
  legL?: number;
  legR?: number;
  head?: number;
  headTilt?: number;
  lean?: number;
  /** hand twist */
  handL?: number;
  handR?: number;
};

export const COLORS = {
  yellow: "#f5c518",
  teal: "#13a3a8",
  red: "#d01712",
  purple: "#7b3fbf",
  white: "#f2f2f0",
  gray: "#8a9096",
  dark: "#1b1b1b",
  gold: "#d4a017",
  orangeHair: "#e8661a",
  brownHair: "#4a2a14",
  whiteHair: "#f7f7f7",
  tan: "#c9a46a",
  blue: "#2c5aa0",
};

const ACCENT: Record<Who, string> = { P: COLORS.teal, M: COLORS.red, L: COLORS.purple };
const NAME: Record<Who, string> = { P: "BRICK", M: "MAX", L: "LUNA" };

type MatProps = { color: string; holo?: boolean; rough?: number; emissive?: string };
const Mat: React.FC<MatProps> = ({ color, holo, rough = 0.32, emissive }) =>
  holo ? (
    <meshBasicMaterial color="#5ff5ff" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
  ) : (
    <meshStandardMaterial color={color} roughness={rough} metalness={0} emissive={emissive ?? "#000"} />
  );

const patchTex = (who: Who) =>
  tex(`patch-${who}`, 256, 128, (c, w, h) => {
    c.fillStyle = ACCENT[who];
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#fff";
    c.font = "bold 64px Arial";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(NAME[who], w / 2, h / 2 + 4);
  });

const Torso: React.FC<{ color: string; holo?: boolean }> = ({ color, holo }) => {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.62, 0.8, 1.25, 4, 1);
    g.rotateY(Math.PI / 4);
    g.scale(1, 1, 0.6);
    return g;
  }, []);
  return (
    <mesh geometry={geo} castShadow>
      <Mat color={color} holo={holo} />
    </mesh>
  );
};

const Arm: React.FC<{
  side: 1 | -1;
  sleeve: string;
  pose: [number, number];
  twist?: number;
  holo?: boolean;
  gadget?: string;
}> = ({ side, sleeve, pose, twist = 0, holo, gadget }) => (
  <group position={[side * 0.6, 2.6, 0]} rotation={[-pose[0], 0, side * (0.12 + pose[1])]}>
    <mesh position={[0, -0.42, 0.05]} castShadow>
      <cylinderGeometry args={[0.17, 0.19, 0.9, 14]} />
      <Mat color={sleeve} holo={holo} />
    </mesh>
    {gadget ? (
      <mesh position={[side * 0.05, -0.62, 0.12]}>
        <boxGeometry args={[0.28, 0.22, 0.12]} />
        <meshStandardMaterial color={gadget} emissive={gadget} emissiveIntensity={0.6} roughness={0.3} />
      </mesh>
    ) : null}
    <group position={[0, -0.95, 0.14]} rotation={[Math.PI / 2 + 0.3, twist, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.14, 10]} />
        <Mat color={COLORS.yellow} holo={holo} />
      </mesh>
      <mesh position={[0, 0.0, -0.16]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.13, 0.065, 10, 18, Math.PI * 1.45]} />
        <Mat color={COLORS.yellow} holo={holo} />
      </mesh>
    </group>
  </group>
);

const Hair: React.FC<{ who: Who; holo?: boolean }> = ({ who, holo }) => {
  if (who === "P") {
    const puffs: V3[] = [
      [-0.42, 3.55, 0], [0.42, 3.55, 0], [-0.36, 3.75, -0.2], [0.36, 3.75, -0.2], [0, 3.82, -0.3],
      [-0.48, 3.35, -0.1], [0.48, 3.35, -0.1], [0, 3.5, -0.42], [-0.25, 3.3, -0.4], [0.25, 3.3, -0.4],
    ];
    return (
      <group>
        {puffs.map((p, i) => (
          <mesh key={i} position={p} castShadow>
            <sphereGeometry args={[0.2 + (i % 3) * 0.03, 12, 10]} />
            <Mat color={COLORS.whiteHair} holo={holo} rough={0.6} />
          </mesh>
        ))}
      </group>
    );
  }
  if (who === "M") {
    const spikes: [V3, V3][] = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      spikes.push([[Math.sin(a) * 0.3, 3.82, Math.cos(a) * 0.3 - 0.05], [Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]]);
    }
    return (
      <group>
        <mesh position={[0, 3.62, -0.03]} scale={[1, 0.62, 1]} castShadow>
          <sphereGeometry args={[0.47, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Mat color={COLORS.orangeHair} holo={holo} rough={0.5} />
        </mesh>
        {spikes.map(([p, r], i) => (
          <mesh key={i} position={p} rotation={r} castShadow>
            <coneGeometry args={[0.13, 0.36, 8]} />
            <Mat color={COLORS.orangeHair} holo={holo} rough={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 3.55, 0.36]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.7, 0.14, 0.14]} />
          <Mat color={COLORS.orangeHair} holo={holo} rough={0.5} />
        </mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh position={[0, 3.6, -0.05]} scale={[1.02, 0.7, 1.02]} castShadow>
        <sphereGeometry args={[0.47, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Mat color={COLORS.brownHair} holo={holo} rough={0.5} />
      </mesh>
      <mesh position={[0, 3.25, -0.4]} scale={[1, 1.15, 0.6]}>
        <cylinderGeometry args={[0.43, 0.43, 0.75, 18, 1, false, Math.PI / 2, Math.PI]} />
        <Mat color={COLORS.brownHair} holo={holo} rough={0.5} />
      </mesh>
      <mesh position={[0, 3.66, 0]} rotation={[Math.PI / 2 - 0.15, 0, 0]}>
        <torusGeometry args={[0.45, 0.05, 8, 26]} />
        <Mat color={COLORS.purple} holo={holo} />
      </mesh>
      <mesh position={[0, 3.2, -0.62]} rotation={[0.25, 0, 0]} castShadow>
        <capsuleGeometry args={[0.13, 0.55, 6, 12]} />
        <Mat color={COLORS.brownHair} holo={holo} rough={0.5} />
      </mesh>
    </group>
  );
};

const Face: React.FC<{ who: Who; mouth: number; holo?: boolean }> = ({ who, mouth, holo }) => {
  const z = 0.425;
  const dark = holo ? "#aefcff" : COLORS.dark;
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.15, 3.35, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.02, 12]} />
          <meshBasicMaterial color={dark} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`hl${s}`} position={[s * 0.15 + 0.02, 3.37, z + 0.012]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.01, 8]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
      ))}
      {mouth > 0.05 ? (
        <mesh position={[0, 3.12, z]} scale={[1, 0.35 + mouth * 0.9, 1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 16]} />
          <meshBasicMaterial color="#5a0d0d" />
        </mesh>
      ) : (
        <mesh position={[0, 3.18, z]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.12, 0.022, 6, 16, Math.PI]} />
          <meshBasicMaterial color={dark} />
        </mesh>
      )}
      {who === "P" ? (
        <group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.15, 3.35, z + 0.03]}>
              <torusGeometry args={[0.11, 0.018, 8, 20]} />
              <meshStandardMaterial color={COLORS.gold} metalness={0.8} roughness={0.25} />
            </mesh>
          ))}
          <mesh position={[0, 3.36, z + 0.03]}>
            <boxGeometry args={[0.09, 0.02, 0.02]} />
            <meshStandardMaterial color={COLORS.gold} metalness={0.8} roughness={0.25} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={`b${s}`} position={[s * 0.16, 3.5, z]} rotation={[0, 0, s * -0.15]}>
              <boxGeometry args={[0.18, 0.05, 0.03]} />
              <meshStandardMaterial color={COLORS.whiteHair} />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={`m${s}`} position={[s * 0.1, 3.22, z + 0.02]} rotation={[0, 0, s * 0.35]} scale={[1.6, 0.7, 0.6]}>
              <sphereGeometry args={[0.08, 12, 8]} />
              <meshStandardMaterial color={COLORS.whiteHair} roughness={0.6} />
            </mesh>
          ))}
        </group>
      ) : null}
      {who === "M"
        ? [-0.2, -0.12, 0.12, 0.2].map((x, i) => (
            <mesh key={i} position={[x, 3.26 + (i % 2) * 0.03, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.01, 6]} />
              <meshBasicMaterial color="#b0601c" />
            </mesh>
          ))
        : null}
      {who === "L"
        ? [-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.15, 3.43, z]} rotation={[0, 0, s * -0.2]}>
              <boxGeometry args={[0.12, 0.025, 0.01]} />
              <meshBasicMaterial color={COLORS.brownHair} />
            </mesh>
          ))
        : null}
    </group>
  );
};

const Helmet: React.FC<{ who: Who; patch?: boolean; crack?: number }> = ({ patch, crack = 0 }) => (
  <group>
    <mesh position={[0, 3.3, 0]}>
      <sphereGeometry args={[0.82, 32, 24]} />
      <meshPhysicalMaterial
        color="#dff3ff"
        transparent
        opacity={0.16}
        roughness={0.05}
        metalness={0}
        clearcoat={1}
        depthWrite={false}
      />
    </mesh>
    <mesh position={[0, 2.78, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.55, 0.09, 12, 30]} />
      <meshStandardMaterial color={COLORS.gold} metalness={0.85} roughness={0.25} />
    </mesh>
    {crack > 0 ? (
      <group position={[0, 3.3, 0]} rotation={[-0.45, 0.45, 0]}>
        {[0, 0.9, -0.8, 2.1, -2.3].map((a, i) => (
          <mesh key={i} position={[0, 0, 0.83]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.02, 0.5 * crack * (1 - i * 0.12), 0.005]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
          </mesh>
        ))}
      </group>
    ) : null}
    {patch ? (
      <group position={[0, 3.3, 0]} rotation={[-0.45, 0.45, 0]}>
        <mesh position={[0, 0, 0.83]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.03, 6]} />
          <meshStandardMaterial color={COLORS.purple} roughness={0.4} />
        </mesh>
      </group>
    ) : null}
  </group>
);

export type FigProps = {
  who: Who;
  outfit?: "lab" | "suit";
  helmet?: "on" | "hip" | "none";
  patch?: boolean;
  crack?: number;
  pose?: Pose;
  at?: V3;
  ry?: number;
  rx?: number;
  rz?: number;
  scale?: number;
  holo?: boolean;
  /** override mouth (else uses voice timing) */
  mouth?: number;
};

export const Minifig: React.FC<FigProps> = ({
  who,
  outfit = "suit",
  helmet = "on",
  patch,
  crack,
  pose = {},
  at = [0, 0, 0],
  ry = 0,
  rx = 0,
  rz = 0,
  scale = 1,
  holo,
  mouth,
}) => {
  const { g } = useClock();
  const m = mouth ?? mouthFor(who, g);
  const talkBob = m > 0 ? Math.sin(g * 6) * 0.06 : 0;
  const suit = outfit === "suit";
  const torso = suit ? COLORS.white : who === "P" ? COLORS.white : who === "M" ? COLORS.red : COLORS.purple;
  const sleeve = torso;
  const legs = suit ? COLORS.white : who === "P" ? COLORS.tan : who === "M" ? COLORS.blue : COLORS.gray;
  const shoes = suit ? COLORS.gray : who === "M" ? COLORS.white : who === "L" ? COLORS.purple : "#5a3a1a";
  const acc = ACCENT[who];
  return (
    <group position={at} rotation={[rx, ry, rz]} scale={scale}>
      <group rotation={[pose.lean ?? 0, 0, 0]}>
        {/* legs */}
        {([1, -1] as const).map((s) => (
          <group key={s} position={[s * 0.27, 1.35, 0]} rotation={[-(s === 1 ? pose.legL ?? 0 : pose.legR ?? 0), 0, 0]}>
            <mesh position={[0, -0.62, 0]} castShadow>
              <boxGeometry args={[0.5, 1.15, 0.6]} />
              <Mat color={legs} holo={holo} />
            </mesh>
            <mesh position={[0, -1.25, 0.06]} castShadow>
              <boxGeometry args={[0.52, 0.2, 0.74]} />
              <Mat color={shoes} holo={holo} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 1.42, 0]} castShadow>
          <boxGeometry args={[1.08, 0.22, 0.62]} />
          <Mat color={legs} holo={holo} />
        </mesh>
        {/* torso */}
        <group position={[0, 2.16, 0]}>
          <Torso color={torso} holo={holo} />
          {!holo && suit ? (
            <>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.36, 0.5, 0.05]} rotation={[0, 0, s * 0.25]}>
                  <boxGeometry args={[0.22, 0.12, 0.62]} />
                  <meshStandardMaterial color={acc} roughness={0.3} />
                </mesh>
              ))}
              <mesh position={[0.22, 0.1, 0.33]} rotation={[-0.08, 0, 0]}>
                <planeGeometry args={[0.36, 0.18]} />
                <meshStandardMaterial map={patchTex(who)} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.0, -0.45]} castShadow>
                <boxGeometry args={[0.95, 1.2, 0.35]} />
                <meshStandardMaterial color={COLORS.gray} roughness={0.45} />
              </mesh>
              <mesh position={[0, -0.5, 0.0]}>
                <boxGeometry args={[1.04, 0.1, 0.7]} />
                <meshStandardMaterial color={COLORS.gray} roughness={0.4} />
              </mesh>
              {who === "M" ? (
                <mesh position={[-0.42, -0.5, 0.3]}>
                  <boxGeometry args={[0.12, 0.28, 0.1]} />
                  <meshStandardMaterial color={COLORS.red} />
                </mesh>
              ) : null}
            </>
          ) : null}
          {!holo && !suit && who === "P" ? (
            <mesh position={[0, -0.05, 0.36]} rotation={[-0.13, 0, 0]}>
              <planeGeometry args={[0.42, 1.1]} />
              <meshStandardMaterial color={COLORS.teal} roughness={0.5} />
            </mesh>
          ) : null}
          {!holo && !suit && who === "M" ? (
            <group position={[0, 0.08, 0.372]} rotation={[-0.13, 0, 0.5]}>
              <mesh>
                <planeGeometry args={[0.1, 0.26]} />
                <meshBasicMaterial color="#fff" />
              </mesh>
              <mesh position={[0, 0.17, 0]} rotation={[0, 0, Math.PI / 2]}>
                <circleGeometry args={[0.07, 3]} />
                <meshBasicMaterial color="#fff" />
              </mesh>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * 0.08, -0.1, 0]} rotation={[0, 0, s * 0.5]}>
                  <planeGeometry args={[0.05, 0.12]} />
                  <meshBasicMaterial color="#fff" />
                </mesh>
              ))}
              <mesh position={[0, -0.17, 0]}>
                <planeGeometry args={[0.06, 0.07]} />
                <meshBasicMaterial color="#ffb347" />
              </mesh>
            </group>
          ) : null}
          {!holo && !suit && who === "L" ? (
            <>
              <mesh position={[0.2, 0.15, 0.37]} rotation={[-0.13, 0, 0]}>
                <circleGeometry args={[0.1, 5]} />
                <meshStandardMaterial color="#d8d8e0" metalness={0.7} roughness={0.3} />
              </mesh>
              <mesh position={[0, -0.05, 0.365]} rotation={[-0.13, 0, 0]}>
                <planeGeometry args={[0.03, 1.1]} />
                <meshBasicMaterial color="#d8d8e0" />
              </mesh>
            </>
          ) : null}
        </group>
        {/* arms */}
        <Arm
          side={1}
          sleeve={sleeve}
          pose={pose.armL ?? [0, 0]}
          twist={pose.handL}
          holo={holo}
          gadget={who === "P" ? COLORS.teal : undefined}
        />
        <Arm
          side={-1}
          sleeve={sleeve}
          pose={pose.armR ?? [0, 0]}
          twist={pose.handR}
          holo={holo}
          gadget={who === "L" ? COLORS.purple : undefined}
        />
        {/* head */}
        <group position={[0, 0, 0]} rotation={[pose.headTilt ?? talkBob, pose.head ?? 0, 0]}>
          <group position={[0, -0.0, 0]}>
            <mesh position={[0, 2.85, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.14, 14]} />
              <Mat color={COLORS.yellow} holo={holo} />
            </mesh>
            <mesh position={[0, 3.28, 0]} castShadow>
              <cylinderGeometry args={[0.42, 0.42, 0.74, 28]} />
              <Mat color={COLORS.yellow} holo={holo} />
            </mesh>
            <mesh position={[0, 3.7, 0]}>
              <cylinderGeometry args={[0.24, 0.24, 0.14, 18]} />
              <Mat color={COLORS.yellow} holo={holo} />
            </mesh>
            <Face who={who} mouth={m} holo={holo} />
            <Hair who={who} holo={holo} />
          </group>
          {suit && helmet === "on" && !holo ? <Helmet who={who} patch={patch} crack={crack} /> : null}
        </group>
        {suit && helmet === "hip" && !holo ? (
          <group position={[0.68, 1.55, 0]} scale={0.42}>
            <mesh>
              <sphereGeometry args={[0.82, 24, 18]} />
              <meshPhysicalMaterial color="#dff3ff" transparent opacity={0.3} roughness={0.05} clearcoat={1} />
            </mesh>
            <mesh position={[0, -0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.55, 0.12, 10, 24]} />
              <meshStandardMaterial color={COLORS.gold} metalness={0.85} roughness={0.25} />
            </mesh>
            {patch ? (
              <mesh position={[0, 0.2, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.25, 0.25, 0.04, 6]} />
                <meshStandardMaterial color={COLORS.purple} />
              </mesh>
            ) : null}
          </group>
        ) : null}
      </group>
    </group>
  );
};

/* ---------- pose helpers ---------- */
export const idle = (t: number, seed = 0): Pose => ({
  armL: [0.05 + Math.sin(t * 1.3 + seed) * 0.04, 0.05],
  armR: [0.05 + Math.sin(t * 1.1 + seed + 2) * 0.04, 0.05],
  head: Math.sin(t * 0.6 + seed) * 0.12,
});
export const walk = (t: number, speed = 6): Pose => {
  const s = Math.sin(t * speed);
  return { legL: s * 0.5, legR: -s * 0.5, armL: [-s * 0.45, 0.05], armR: [s * 0.45, 0.05] };
};
export const cheer = (t: number): Pose => ({
  armL: [2.6 + Math.sin(t * 12) * 0.25, 0.3],
  armR: [2.6 + Math.cos(t * 12) * 0.25, 0.3],
  headTilt: -0.15,
});
export const point = (t: number, side: "L" | "R" = "R", seed = 0): Pose => {
  const p = idle(t, seed);
  if (side === "R") p.armR = [1.45, 0.1];
  else p.armL = [1.45, 0.1];
  return p;
};

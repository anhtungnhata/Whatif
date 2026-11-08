import React, { useMemo } from "react";
import * as THREE from "three";
import { COLORS } from "./Minifig";
import { rng, tex, V3 } from "./util";

/* ================= shared bits ================= */
export const Studs: React.FC<{
  size: number;
  step?: number;
  color: string;
  y?: number;
  center?: [number, number];
  seed?: number;
}> = ({ size, step = 1, color, y = 0, center = [0, 0], seed = 1 }) => {
  const mesh = useMemo(() => {
    const n = Math.floor(size / step);
    const count = n * n;
    const geo = new THREE.CylinderGeometry(0.24, 0.24, 0.17, 12);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.42 });
    const m = new THREE.InstancedMesh(geo, mat, count);
    const d = new THREE.Object3D();
    const r = rng(seed);
    let i = 0;
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++) {
        d.position.set(center[0] - size / 2 + a * step + step / 2, y + 0.08, center[1] - size / 2 + b * step + step / 2);
        d.updateMatrix();
        m.setMatrixAt(i, d.matrix);
        const c = new THREE.Color(color).multiplyScalar(0.9 + r() * 0.2);
        m.setColorAt(i, c);
        i++;
      }
    m.receiveShadow = true;
    return m;
  }, [size, step, color, y, center, seed]);
  return <primitive object={mesh} />;
};

const Sky: React.FC<{ top: string; horizon: string; radius?: number }> = ({ top, horizon, radius = 400 }) => {
  const t = tex(`sky-${top}-${horizon}`, 16, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(0.5, horizon);
    g.addColorStop(1, horizon);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
  return (
    <mesh>
      <sphereGeometry args={[radius, 32, 16]} />
      <meshBasicMaterial map={t} side={THREE.BackSide} fog={false} />
    </mesh>
  );
};

const glowTex = (color: string) =>
  tex(`glow-${color}`, 128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });

export const Glow: React.FC<{ at: V3; size: number; color: string; opacity?: number }> = ({
  at,
  size,
  color,
  opacity = 1,
}) => (
  <sprite position={at} scale={[size, size, 1]}>
    <spriteMaterial
      map={glowTex(color)}
      transparent
      opacity={opacity}
      blending={THREE.AdditiveBlending}
      depthWrite={false}
      fog={false}
    />
  </sprite>
);

export const Stars: React.FC<{ count?: number; radius?: number; opacity?: number }> = ({
  count = 1500,
  radius = 300,
  opacity = 1,
}) => {
  const geo = useMemo(() => {
    const r = rng(42);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = r() * 2 - 1;
      const th = r() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      arr.set([radius * s * Math.cos(th), radius * u, radius * s * Math.sin(th)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, [count, radius]);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffffff" size={1.6} sizeAttenuation={false} transparent opacity={opacity} fog={false} />
    </points>
  );
};

/* ================= BRICK LAB ================= */
const brickWall = () =>
  tex(
    "brickwall",
    512,
    512,
    (c, w, h) => {
      c.fillStyle = "#a9adb1";
      c.fillRect(0, 0, w, h);
      const bh = 32;
      for (let y = 0; y < h; y += bh) {
        const off = (y / bh) % 2 ? 64 : 0;
        for (let x = -64; x < w; x += 128) {
          c.fillStyle = `hsl(210,4%,${62 + ((x * 7 + y * 3) % 9)}%)`;
          c.fillRect(x + off + 2, y + 2, 124, bh - 4);
        }
      }
    },
    [10, 3],
  );

const chalk = () =>
  tex("chalk", 512, 256, (c, w, h) => {
    c.fillStyle = "#24543a";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#7a4a22";
    c.lineWidth = 18;
    c.strokeRect(0, 0, w, h);
    c.fillStyle = "#f2f2e8";
    c.font = "bold 60px 'Comic Sans MS', Arial";
    c.fillText("EP. 2 → MARS?", 40, 110);
    c.font = "32px Arial";
    c.fillText("g = 3.72 m/s²   CO₂ 95%", 40, 175);
    c.fillText("1 sol = 24h 39m", 40, 220);
  });

export const Gear: React.FC<{ at: V3; r: number; spin: number; color?: string; rot?: V3 }> = ({
  at,
  r,
  spin,
  color = COLORS.yellow,
  rot = [Math.PI / 2, 0, 0],
}) => (
  <group position={at} rotation={rot}>
    <group rotation={[0, spin, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r, 0.3, 24]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0, Math.sin(a) * r]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color={color} roughness={0.35} />
          </mesh>
        );
      })}
    </group>
  </group>
);

export const Engine: React.FC<{ at?: V3; power?: number; lever?: number; spin?: number }> = ({
  at = [0, 0, -7],
  power = 0.4,
  lever = 0,
  spin = 0,
}) => (
  <group position={at}>
    {/* arch */}
    <mesh position={[0, 4.2, 0]} castShadow>
      <torusGeometry args={[3.4, 0.45, 16, 48]} />
      <meshStandardMaterial color="#9da3a8" roughness={0.4} />
    </mesh>
    <mesh position={[0, 4.2, 0]}>
      <torusGeometry args={[2.85, 0.16, 12, 64]} />
      <meshStandardMaterial color="#38f2ff" emissive="#38f2ff" emissiveIntensity={1.5 + power * 4} />
    </mesh>
    <mesh position={[0, 4.2, -0.05]}>
      <circleGeometry args={[2.8, 48]} />
      <meshBasicMaterial color="#7ff8ff" transparent opacity={0.08 + power * 0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
    <Glow at={[0, 4.2, 0.3]} size={9 + power * 10} color="#4ff3ff" opacity={0.25 + power * 0.6} />
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 3.4, 1.1, 0]} castShadow>
        <boxGeometry args={[1.1, 2.2, 1.1]} />
        <meshStandardMaterial color="#7d8388" roughness={0.45} />
      </mesh>
    ))}
    <Gear at={[-3.4, 6.9, 0.5]} r={0.9} spin={spin} />
    <Gear at={[-2.2, 7.6, 0.6]} r={0.55} spin={-spin * 1.6} />
    <Gear at={[3.3, 7.0, 0.5]} r={1.0} spin={-spin} />
    <Gear at={[2.1, 7.8, 0.6]} r={0.5} spin={spin * 2} />
    {/* lever */}
    <group position={[-4.6, 1.6, 0.6]} rotation={[0, 0, 0]}>
      <mesh>
        <boxGeometry args={[0.6, 0.8, 0.6]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <group rotation={[-0.9 + lever * 1.8, 0, 0]}>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 1.6, 10]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[0, 1.65, 0]} castShadow>
          <sphereGeometry args={[0.3, 16, 12]} />
          <meshStandardMaterial color={COLORS.red} roughness={0.25} />
        </mesh>
      </group>
    </group>
    <pointLight position={[0, 4.2, 2]} color="#4ff3ff" intensity={20 + power * 120} distance={18} />
  </group>
);

export const HoloTable: React.FC<{ at: V3; r?: number }> = ({ at, r = 2.2 }) => (
  <group position={at}>
    <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[r, r * 0.9, 0.3, 32]} />
      <meshStandardMaterial color="#3a3f45" roughness={0.4} />
    </mesh>
    <mesh position={[0, 1.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[r * 0.85, 32]} />
      <meshStandardMaterial color="#38f2ff" emissive="#38f2ff" emissiveIntensity={1.2} />
    </mesh>
    <mesh position={[0, 0.45, 0]}>
      <cylinderGeometry args={[0.4, 0.6, 0.9, 16]} />
      <meshStandardMaterial color="#2a2e33" />
    </mesh>
  </group>
);

export const Lab: React.FC<{ power?: number; lever?: number; spin?: number }> = ({ power, lever, spin = 0 }) => {
  const r = rng(5);
  const bench = (x: number, z: number, ry: number) => (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, 1.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[4, 0.3, 1.6]} />
        <meshStandardMaterial color="#7a4a22" roughness={0.5} />
      </mesh>
      {[-1.7, 1.7].map((dx) => (
        <mesh key={dx} position={[dx, 0.65, 0]}>
          <boxGeometry args={[0.3, 1.3, 1.4]} />
          <meshStandardMaterial color="#5c3618" />
        </mesh>
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <mesh key={i} position={[-1.5 + i * 0.75, 1.85, (r() - 0.5) * 0.8]}>
          <cylinderGeometry args={[0.18, 0.22, 0.6 + r() * 0.4, 12]} />
          <meshStandardMaterial
            color={["#38f2ff", "#ff5a5a", "#ffd23f", "#9b6bff", "#5fe07a"][i]}
            transparent
            opacity={0.75}
            roughness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
  return (
    <group>
      <color attach="background" args={["#1d232b"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#1f3b73" roughness={0.45} />
      </mesh>
      <Studs size={30} step={2} color="#24438a" y={0} />
      <mesh position={[0, 7, 0]}>
        <cylinderGeometry args={[16, 16, 14, 48, 1, true]} />
        <meshStandardMaterial map={brickWall()} side={THREE.BackSide} roughness={0.6} />
      </mesh>
      <mesh position={[0, 14, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#3b4047" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[9.5, 5, -12.6]} rotation={[0, -0.65, 0]}>
        <planeGeometry args={[7, 3.5]} />
        <meshStandardMaterial map={chalk()} roughness={0.8} />
      </mesh>
      {bench(-9, -8, 0.8)}
      {bench(10, -4, -1.1)}
      {bench(-11, 3, 1.5)}
      {[-6, 0, 6].map((x, i) => (
        <group key={i} position={[x, 11, -2 + (i % 2) * 3]}>
          <mesh>
            <cylinderGeometry args={[0.05, 0.05, 6, 6]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[0, -3, 0]}>
            <coneGeometry args={[0.8, 0.8, 20, 1, true]} />
            <meshStandardMaterial color="#c0392b" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -3.25, 0]}>
            <sphereGeometry args={[0.25, 12, 8]} />
            <meshBasicMaterial color="#fff2c4" />
          </mesh>
          <pointLight position={[0, -3.6, 0]} color="#ffd59a" intensity={40} distance={16} />
        </group>
      ))}
      <Engine power={power} lever={lever} spin={spin} />
      <HoloTable at={[0, 0, -1.5]} />
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#ffe9c7", "#1f3b73", 0.6]} />
      <directionalLight position={[6, 12, 8]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]}>
        <orthographicCamera attach="shadow-camera" args={[-15, 15, 15, -15, 0.1, 50]} />
      </directionalLight>
    </group>
  );
};

/* ================= SHIP ================= */
export const ShipInterior: React.FC<{ earthScale?: number; night?: boolean; tanks?: boolean }> = ({
  earthScale = 1,
  night,
  tanks,
}) => (
  <group>
    <color attach="background" args={["#000"]} />
    <mesh position={[0, 5, 0]}>
      <boxGeometry args={[20, 10, 16]} />
      <meshStandardMaterial color={night ? "#9fb3cc" : "#eef0f2"} side={THREE.BackSide} roughness={0.5} />
    </mesh>
    {[1.2, 8.8].map((y) => (
      <mesh key={y} position={[0, y, -7.9]}>
        <boxGeometry args={[20, 0.25, 0.1]} />
        <meshStandardMaterial color="#ff7a1a" />
      </mesh>
    ))}
    {[-9.9, 9.9].map((x) => (
      <mesh key={x} position={[x, 5, 0]}>
        <boxGeometry args={[0.1, 10, 0.4]} />
        <meshStandardMaterial color="#ff7a1a" />
      </mesh>
    ))}
    {/* porthole on back wall */}
    <group position={[-4.5, 5.4, -7.85]}>
      <mesh>
        <torusGeometry args={[1.5, 0.2, 12, 40]} />
        <meshStandardMaterial color="#c9ccd0" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[1.5, 40]} />
        <meshBasicMaterial color="#02030a" />
      </mesh>
      {[
        [-0.9, 0.6],
        [0.7, -0.8],
        [1.0, 0.9],
        [-0.4, -1.1],
        [0.2, 1.2],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.02]}>
          <circleGeometry args={[0.03, 6]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
      ))}
      <mesh position={[0.1, 0.1, 0.03]}>
        <circleGeometry args={[0.6 * earthScale, 32]} />
        <meshBasicMaterial color="#3d7bd8" />
      </mesh>
      <mesh position={[0.25 * earthScale, 0.25 * earthScale, 0.04]}>
        <circleGeometry args={[0.2 * earthScale, 20]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
      </mesh>
    </group>
    {[-1, 1].map((x) => (
      <mesh key={x} position={[x * 5, 2.6, -7.6]}>
        <boxGeometry args={[3, 0.25, 0.3]} />
        <meshStandardMaterial color="#5c6066" />
      </mesh>
    ))}
    {Array.from({ length: 8 }).map((_, i) => (
      <mesh key={i} position={[1.5 + i * 0.6, 6.5, -7.85]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshStandardMaterial
          color={["#ff5a5a", "#38f2ff", "#ffd23f", "#5fe07a"][i % 4]}
          emissive={["#ff5a5a", "#38f2ff", "#ffd23f", "#5fe07a"][i % 4]}
          emissiveIntensity={0.8}
        />
      </mesh>
    ))}
    {tanks
      ? [-8, -5.8, 5.8, 8].map((x) => (
          <mesh key={x} position={[x, 3.5, -5.5]} castShadow>
            <cylinderGeometry args={[1.0, 1.0, 7, 24]} />
            <meshStandardMaterial color="#f4f6f8" roughness={0.3} />
          </mesh>
        ))
      : null}
    <ambientLight intensity={night ? 0.35 : 0.8} color={night ? "#8fb2ff" : "#fff"} />
    <pointLight position={[0, 8, 3]} intensity={night ? 30 : 80} color={night ? "#9fc0ff" : "#fff"} distance={30} />
  </group>
);

/* ================= SPACE / MARS GLOBE ================= */
export const marsTex = () =>
  tex("marsglobe", 1024, 512, (c, w, h) => {
    const r = rng(9);
    c.fillStyle = "#c1592b";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = r() * w;
      const y = r() * h;
      const s = 8 + r() * 60;
      c.fillStyle = `rgba(${r() < 0.5 ? "90,30,15" : "230,140,80"},${0.08 + r() * 0.15})`;
      c.beginPath();
      c.ellipse(x, y, s, s * 0.6, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    // Valles Marineris
    c.strokeStyle = "rgba(60,15,8,0.85)";
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(420, 270);
    c.bezierCurveTo(500, 280, 560, 265, 660, 285);
    c.stroke();
    // Olympus Mons
    const g = c.createRadialGradient(300, 210, 0, 300, 210, 50);
    g.addColorStop(0, "#f0a070");
    g.addColorStop(0.4, "#a0461f");
    g.addColorStop(1, "rgba(160,70,31,0)");
    c.fillStyle = g;
    c.beginPath();
    c.arc(300, 210, 50, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#f6efe8";
    c.fillRect(0, 0, w, 22);
    c.fillRect(0, h - 16, w, 16);
  });

export const Space: React.FC = () => (
  <group>
    <color attach="background" args={["#010104"]} />
    <Stars />
    <ambientLight intensity={0.15} />
    <directionalLight position={[-30, 10, 20]} intensity={3} />
  </group>
);

export const MarsGlobe: React.FC<{ at: V3; r: number; spin: number; terraform?: number; holo?: boolean }> = ({
  at,
  r,
  spin,
  terraform = 0,
  holo,
}) => (
  <group position={at}>
    <mesh rotation={[0.3, spin, 0]}>
      <sphereGeometry args={[r, 64, 48]} />
      {holo ? (
        <meshStandardMaterial
          map={marsTex()}
          emissive="#38f2ff"
          emissiveIntensity={0.25}
          transparent
          opacity={0.9}
          color={new THREE.Color("#ffffff").lerp(new THREE.Color("#3a9cff"), terraform)}
        />
      ) : (
        <meshStandardMaterial map={marsTex()} roughness={0.9} />
      )}
    </mesh>
    {terraform > 0 ? (
      <mesh>
        <sphereGeometry args={[r * 1.01, 48, 32]} />
        <meshStandardMaterial color="#2a8f5a" transparent opacity={terraform * 0.55} />
      </mesh>
    ) : null}
    <mesh>
      <sphereGeometry args={[r * 1.04, 48, 32]} />
      <meshBasicMaterial color="#ff9c6a" transparent opacity={0.12} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
    </mesh>
  </group>
);

/* ================= MARS SURFACE ================= */
export type SkyMode = "day" | "morning" | "storm" | "sunset" | "dusk" | "night";
const SKY: Record<SkyMode, { top: string; hor: string; fog: string; sun: string; sunI: number; amb: number }> = {
  morning: { top: "#c99a6b", hor: "#e8c39a", fog: "#dcb48a", sun: "#ffe2bf", sunI: 2.3, amb: 0.55 },
  day: { top: "#c49166", hor: "#e7c49c", fog: "#dcb48a", sun: "#fff0d8", sunI: 2.6, amb: 0.6 },
  storm: { top: "#7a4630", hor: "#a8693f", fog: "#93593a", sun: "#e0a070", sunI: 1.4, amb: 1.15 },
  sunset: { top: "#5d4a44", hor: "#b98b67", fog: "#8f6a52", sun: "#cfe2ff", sunI: 1.1, amb: 0.4 },
  dusk: { top: "#1c2230", hor: "#4b4a52", fog: "#35343c", sun: "#9fb4d8", sunI: 0.35, amb: 0.3 },
  night: { top: "#05070d", hor: "#1b1d26", fog: "#121318", sun: "#8ea2c8", sunI: 0.2, amb: 0.22 },
};

export const MarsSurface: React.FC<{
  sky?: SkyMode;
  sunDir?: V3;
  studCenter?: [number, number];
  rocks?: boolean;
  fogNear?: number;
  fogFar?: number;
}> = ({ sky = "morning", sunDir = [-40, 25, 10], studCenter = [0, 0], rocks = true, fogNear = 40, fogFar = 260 }) => {
  const s = SKY[sky];
  const rockList = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 70 }).map(() => ({
      p: [(r() - 0.5) * 120, 0, (r() - 0.5) * 120 - 20] as V3,
      s: [0.6 + r() * 2.2, 0.4 + r() * 1.4, 0.6 + r() * 2.2] as V3,
      ry: r() * 3,
      c: r() < 0.5 ? "#6e2f1c" : "#8a3f22",
    }));
  }, []);
  const ground = tex(
    "marsground",
    512,
    512,
    (c, w, h) => {
      const r = rng(3);
      c.fillStyle = "#b5532a";
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) {
        c.fillStyle = `rgba(${r() < 0.5 ? "120,45,20" : "215,120,70"},${0.05 + r() * 0.12})`;
        const x = r() * w;
        const y = r() * h;
        c.fillRect(x, y, 6 + r() * 40, 6 + r() * 40);
      }
    },
    [30, 30],
  );
  return (
    <group>
      <fog attach="fog" args={[s.fog, fogNear, fogFar]} />
      <Sky top={s.top} horizon={s.hor} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial map={ground} roughness={0.95} />
      </mesh>
      <Studs size={72} step={1} color="#b65a2e" center={studCenter} seed={3} />
      {rocks
        ? rockList.map((k, i) => (
            <mesh key={i} position={[k.p[0], k.s[1] / 2, k.p[2]]} rotation={[0, k.ry, 0]} castShadow receiveShadow>
              <boxGeometry args={k.s} />
              <meshStandardMaterial color={k.c} roughness={0.8} />
            </mesh>
          ))
        : null}
      {/* horizon ridges */}
      {Array.from({ length: 14 }).map((_, i) => (
        <mesh key={i} position={[-210 + i * 32, 3 + (i % 3) * 2, -200 - (i % 2) * 20]}>
          <boxGeometry args={[40, 8 + (i % 4) * 4, 20]} />
          <meshStandardMaterial color="#9a4a2a" roughness={0.9} />
        </mesh>
      ))}
      <ambientLight intensity={s.amb} color={s.hor} />
      <hemisphereLight args={[s.top, "#7a3a1e", 0.5]} />
      <directionalLight
        position={sunDir}
        intensity={s.sunI}
        color={s.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
      >
        <orthographicCamera attach="shadow-camera" args={[-40, 40, 40, -40, 0.5, 200]} />
      </directionalLight>
    </group>
  );
};

/* ================= DUST ================= */
export const Dust: React.FC<{ density?: number; center?: V3; t: number; color?: string }> = ({
  density = 1,
  center = [0, 0, 0],
  t,
  color = "#d08850",
}) => {
  const data = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: 900 }).map(() => [r() * 60 - 30, r() * 9, r() * 40 - 25, 6 + r() * 10, r()]);
  }, []);
  const n = Math.floor(900 * density);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.07, 0.022, 0.022),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }),
      900,
    );
    return m;
  }, [color]);
  const d = new THREE.Object3D();
  for (let i = 0; i < 900; i++) {
    const [x, y, z, sp, ph] = data[i];
    const xx = ((x + t * sp + 30) % 60) - 30;
    d.position.set(center[0] + xx, center[1] + y + Math.sin(t * 3 + ph * 9) * 0.2, center[2] + z);
    d.scale.setScalar(i < n ? 1 + ph * 1.5 : 0);
    d.scale.x *= 2 + sp * 0.15;
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

/* ================= HAB INTERIOR ================= */
export const windowView = (mode: SkyMode) =>
  tex(`win-${mode}`, 512, 512, (c, w, h) => {
    const s = SKY[mode];
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, s.top);
    g.addColorStop(0.62, s.hor);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = mode === "night" || mode === "dusk" ? "#3a1a10" : mode === "storm" ? "#6b3a22" : "#a24a24";
    c.beginPath();
    c.moveTo(0, h * 0.66);
    for (let x = 0; x <= w; x += 32) c.lineTo(x, h * 0.66 - Math.abs(Math.sin(x * 0.02)) * 18);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.fill();
    if (mode === "night" || mode === "dusk") {
      const r = rng(4);
      c.fillStyle = "#fff";
      for (let i = 0; i < 120; i++) c.fillRect(r() * w, r() * h * 0.55, 1.5, 1.5);
    }
  });

export const HabInterior: React.FC<{ view?: SkyMode; alarm?: number; lights?: number }> = ({
  view = "day",
  alarm = 0,
  lights = 1,
}) => {
  const hazard = tex(
    "hazard",
    256,
    256,
    (c, w, h) => {
      c.fillStyle = "#f5c518";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#111";
      for (let i = -h; i < w; i += 64) {
        c.beginPath();
        c.moveTo(i, h);
        c.lineTo(i + 32, h);
        c.lineTo(i + 32 + h, 0);
        c.lineTo(i + h, 0);
        c.fill();
      }
    },
    [1, 1],
  );
  return (
    <group>
      <color attach="background" args={["#111"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 48]} />
        <meshStandardMaterial color="#d9dcdf" roughness={0.5} />
      </mesh>
      <Studs size={24} step={2} color="#cfd3d7" />
      <mesh position={[0, 5, 0]}>
        <sphereGeometry args={[14, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f1f1ee" side={THREE.BackSide} roughness={0.55} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[14, 14, 5, 48, 1, true]} />
        <meshStandardMaterial color="#f1f1ee" side={THREE.BackSide} roughness={0.55} />
      </mesh>
      {[1.2, 4.6].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[13.95, 13.95, 0.3, 48, 1, true]} />
          <meshStandardMaterial color={y < 2 ? "#ff7a1a" : COLORS.teal} side={THREE.BackSide} />
        </mesh>
      ))}
      {/* WEST observation window (at -z) */}
      <group position={[0, 5.2, -13.6]}>
        <mesh>
          <torusGeometry args={[4, 0.35, 12, 48]} />
          <meshStandardMaterial color="#c9ccd0" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, -0.05]}>
          <circleGeometry args={[4, 48]} />
          <meshBasicMaterial map={windowView(view)} toneMapped={false} fog={false} />
        </mesh>
      </group>
      {/* airlock (east, +x) */}
      <group position={[13.5, 2.6, 2]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[3.6, 5, 0.3]} />
          <meshStandardMaterial map={hazard} />
        </mesh>
        <mesh position={[0, 0, 0.2]}>
          <boxGeometry args={[2.6, 4.2, 0.2]} />
          <meshStandardMaterial color="#cfd3d7" />
        </mesh>
      </group>
      {/* wall screens */}
      {[-0.9, 0.9].map((a) => (
        <mesh key={a} position={[Math.sin(a) * 13.4, 4.2, -Math.cos(a) * 13.4]} rotation={[0, -a, 0]}>
          <planeGeometry args={[3.2, 2]} />
          <meshStandardMaterial color="#0e2a3a" emissive="#1b6f8f" emissiveIntensity={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 9.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6, 0.15, 8, 48]} />
        <meshBasicMaterial color="#fff4dc" />
      </mesh>
      <ambientLight intensity={0.45 * lights} color="#fff2e0" />
      <hemisphereLight args={["#fff4e0", "#9aa0a6", 0.5 * lights]} />
      <pointLight position={[0, 9, 2]} intensity={160 * lights} color="#ffe6c4" distance={40} castShadow />
      {alarm > 0 ? <pointLight position={[0, 8, 0]} intensity={alarm * 240} color="#ff2020" distance={40} /> : null}
    </group>
  );
};

/* ================= GREENHOUSE ================= */
export const GreenhouseInterior: React.FC = () => {
  const r = rng(21);
  return (
    <group>
      <color attach="background" args={["#c8a07a"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#c9ccd0" />
      </mesh>
      <mesh>
        <sphereGeometry args={[16, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e8c39a" transparent opacity={0.55} side={THREE.BackSide} roughness={0.1} />
      </mesh>
      {[-4.5, 0, 4.5].map((z) =>
        Array.from({ length: 7 }).map((_, i) => {
          const x = -12 + i * 4;
          return (
            <group key={`${z}-${i}`} position={[x, 0, z - 4]}>
              <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
                <boxGeometry args={[3.6, 1.4, 2]} />
                <meshStandardMaterial color="#f2f2f0" />
              </mesh>
              <mesh position={[0, 1.42, 0]}>
                <boxGeometry args={[3.4, 0.05, 1.8]} />
                <meshStandardMaterial color="#5a4636" />
              </mesh>
              {[-1.1, 0, 1.1].map((dx) => (
                <group key={dx} position={[dx, 1.45, 0]}>
                  <mesh position={[0, 0.5, 0]}>
                    <cylinderGeometry args={[0.06, 0.06, 1, 6]} />
                    <meshStandardMaterial color="#2f7d32" />
                  </mesh>
                  {[0, 1, 2].map((k) => (
                    <mesh key={k} position={[Math.cos(k * 2.1) * 0.3, 0.6 + k * 0.25 + r() * 0.1, Math.sin(k * 2.1) * 0.3]}>
                      <sphereGeometry args={[0.33, 10, 8]} />
                      <meshStandardMaterial color={k % 2 ? "#43a047" : "#5cbf4a"} roughness={0.6} />
                    </mesh>
                  ))}
                </group>
              ))}
              <mesh position={[0, 4.2, 0]}>
                <boxGeometry args={[3.4, 0.15, 0.3]} />
                <meshStandardMaterial color="#ff4fd8" emissive="#ff4fd8" emissiveIntensity={3} />
              </mesh>
            </group>
          );
        }),
      )}
      <ambientLight intensity={0.5} color="#ffd9f2" />
      <pointLight position={[0, 6, 0]} intensity={140} color="#ff6fe0" distance={40} />
      <directionalLight position={[-10, 20, 5]} intensity={1.2} color="#ffe6c4" castShadow shadow-mapSize={[1024, 1024]}>
        <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20, 0.5, 60]} />
      </directionalLight>
    </group>
  );
};

/* ================= COCKPIT ================= */
export const Cockpit: React.FC<{ t: number }> = ({ t }) => {
  const flick = 0.75 + 0.25 * Math.sin(t * 37) * Math.sin(t * 11);
  return (
    <group>
      <color attach="background" args={["#100604"]} />
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[16, 10, 14]} />
        <meshStandardMaterial color="#d9dcdf" side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 5.5, -6.9]}>
        <planeGeometry args={[12, 4]} />
        <meshBasicMaterial color={new THREE.Color("#ff8a2a").multiplyScalar(flick * 1.4)} toneMapped={false} />
      </mesh>
      <Glow at={[0, 5.5, -6]} size={18} color="#ffb060" opacity={0.6 * flick} />
      {[-3.4, 0, 3.4].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.2, -0.6]}>
            <boxGeometry args={[2.2, 0.4, 1.8]} />
            <meshStandardMaterial color="#3a3f45" />
          </mesh>
          <mesh position={[0, 3, -1.4]}>
            <boxGeometry args={[2.2, 4, 0.4]} />
            <meshStandardMaterial color="#3a3f45" />
          </mesh>
        </group>
      ))}
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 5, -4]} intensity={160 * flick} color="#ff8a3a" distance={30} />
      <pointLight position={[0, 6, 6]} intensity={30} color="#9fc0ff" distance={30} />
    </group>
  );
};

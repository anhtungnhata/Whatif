import { createContext, useContext } from "react";
import timing from "../data/timing.json";

export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
/** 0..1 eased progress of t between a and b (seconds) */
export const prog = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const lerp3 = (a: V3, b: V3, k: number): V3 => [
  lerp(a[0], b[0], k),
  lerp(a[1], b[1], k),
  lerp(a[2], b[2], k),
];

/** deterministic RNG */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export type Line = {
  shot: number;
  who: string;
  text: string;
  start: number;
  end: number;
};
export const LINES = timing as Line[];

export type Clock = { shot: number; t: number; g: number };
export const ClockCtx = createContext<Clock>({ shot: 1, t: 0, g: 0 });
export const useClock = () => useContext(ClockCtx);

/** is `who` speaking at global time g? returns mouth openness 0..1 */
export const mouthFor = (who: string, g: number) => {
  const l = LINES.find((x) => x.who === who && g >= x.start && g <= x.end);
  if (!l) return 0;
  const k = g - l.start;
  return 0.35 + 0.65 * Math.abs(Math.sin(k * 13.0) * Math.sin(k * 5.3 + 1));
};

const texCache = new Map<string, HTMLCanvasElement>();
/** cached canvas drawing helper */
export const canvas = (
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
) => {
  const hit = texCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  texCache.set(key, c);
  return c;
};

import * as THREE from "three";
const textureCache = new Map<string, THREE.CanvasTexture>();
export const tex = (
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeat?: [number, number],
) => {
  const hit = textureCache.get(key);
  if (hit) return hit;
  const t = new THREE.CanvasTexture(canvas(key, w, h, draw));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  textureCache.set(key, t);
  return t;
};

/**
 * QbD analytics built on the coupled engine: design-space sweeps, Monte Carlo
 * robustness / process capability (Cpk), and one-at-a-time sensitivity.
 */
import type { Knobs, SimResult } from './types';
import { simulateKnobs } from './engine';

export type CQAKey = 'high_mannose' | 'afucosylation' | 'galactosylation' | 'sialylation' | 'G0F';
export type KnobKey = keyof Knobs;

/** CQA specification limits (typical mAb targets; editable in UI). */
export interface Spec { key: CQAKey; label: string; lo: number; hi: number; }
export const DEFAULT_SPECS: Spec[] = [
  { key: 'G0F', label: 'G0F', lo: 35, hi: 60 },
  { key: 'galactosylation', label: 'Galactosylation', lo: 35, hi: 65 },
  { key: 'afucosylation', label: 'Afucosylation', lo: 1, hi: 8 },
  { key: 'high_mannose', label: 'High mannose', lo: 0, hi: 6 },
  { key: 'sialylation', label: 'Sialylation', lo: 1, hi: 12 },
];

const readHarvest = (r: SimResult, k: CQAKey): number => r.harvest[k];

/** 2-D design-space grid: sweep two knobs, record one CQA (+ titer) over the grid. */
export interface DesignSpace {
  xKey: KnobKey; yKey: KnobKey; cqa: CQAKey;
  xs: number[]; ys: number[];
  z: number[][];        // [iy][ix] CQA value
  titer: number[][];    // [iy][ix] titer
}
export function designSpace(
  base: Knobs, xKey: KnobKey, xRange: [number, number],
  yKey: KnobKey, yRange: [number, number], cqa: CQAKey, nx = 24, ny = 24,
): DesignSpace {
  const xs = grid(xRange, nx), ys = grid(yRange, ny);
  const z: number[][] = [], titer: number[][] = [];
  for (const yv of ys) {
    const zr: number[] = [], tr: number[] = [];
    for (const xv of xs) {
      const k = { ...base, [xKey]: xv, [yKey]: yv } as Knobs;
      const r = simulateKnobs(k);
      zr.push(readHarvest(r, cqa)); tr.push(r.titer);
    }
    z.push(zr); titer.push(tr);
  }
  return { xKey, yKey, cqa, xs, ys, z, titer };
}

/** One-at-a-time sensitivity: fractional CQA change per +/-delta on each knob. */
export interface Sensitivity { knob: KnobKey; low: number; high: number; range: number; }
export function sensitivity(base: Knobs, cqa: CQAKey, knobs: KnobKey[], frac = 0.15): Sensitivity[] {
  const r0 = readHarvest(simulateKnobs(base), cqa);
  const out: Sensitivity[] = knobs.map((kk) => {
    const lo = { ...base, [kk]: base[kk] * (1 - frac) } as Knobs;
    const hi = { ...base, [kk]: base[kk] * (1 + frac) } as Knobs;
    const low = readHarvest(simulateKnobs(lo), cqa) - r0;
    const high = readHarvest(simulateKnobs(hi), cqa) - r0;
    return { knob: kk, low, high, range: Math.abs(high - low) };
  });
  return out.sort((a, b) => b.range - a.range);
}

/**
 * Two-factor interaction: how much two knobs' combined effect departs from the sum of their
 * individual effects (non-additivity). For each pair (a,b) at ±frac, the interaction is the
 * mixed second difference  I = [f(a+,b+) - f(a+,b-) - f(a-,b+) + f(a-,b-)] / 4  (in CQA %-points).
 * Large |I| means the two CPPs are coupled — you cannot tune them independently.
 */
export interface Interaction { a: KnobKey; b: KnobKey; value: number; }
export function interactions(base: Knobs, cqa: CQAKey, knobs: KnobKey[], frac = 0.15): {
  keys: KnobKey[]; matrix: number[][]; pairs: Interaction[];
} {
  const ev = (over: Partial<Record<KnobKey, number>>) =>
    readHarvest(simulateKnobs({ ...base, ...over } as Knobs), cqa);
  const n = knobs.length;
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const pairs: Interaction[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = knobs[i], b = knobs[j];
      const ap = base[a] * (1 + frac), am = base[a] * (1 - frac);
      const bp = base[b] * (1 + frac), bm = base[b] * (1 - frac);
      const I = (ev({ [a]: ap, [b]: bp }) - ev({ [a]: ap, [b]: bm })
        - ev({ [a]: am, [b]: bp }) + ev({ [a]: am, [b]: bm })) / 4;
      matrix[i][j] = I; matrix[j][i] = I;
      pairs.push({ a, b, value: I });
    }
  }
  pairs.sort((x, y) => Math.abs(y.value) - Math.abs(x.value));
  return { keys: knobs, matrix, pairs };
}

/** Monte Carlo robustness: Gaussian variability on knobs -> CQA distributions + Cpk. */
export interface MCResult {
  n: number;
  samples: Record<CQAKey, number[]>;
  stats: Record<CQAKey, { mean: number; sd: number; cpk: number; inSpecPct: number }>;
}
export function monteCarlo(base: Knobs, cvPct: Record<KnobKey, number>, specs: Spec[], n = 500, seed = 12345): MCResult {
  const rng = mulberry32(seed);
  const keys = specs.map((s) => s.key);
  const samples = Object.fromEntries(keys.map((k) => [k, [] as number[]])) as Record<CQAKey, number[]>;
  const knobKeys = Object.keys(base) as KnobKey[];
  for (let i = 0; i < n; i++) {
    const k = { ...base } as Knobs;
    for (const kk of knobKeys) {
      const cv = (cvPct[kk] ?? 0) / 100;
      if (cv > 0) k[kk] = Math.max(base[kk] * (1 + gaussian(rng) * cv), 1e-6);
    }
    const r = simulateKnobs(k);
    for (const key of keys) samples[key].push(r.harvest[key]);
  }
  const stats = {} as MCResult['stats'];
  for (const s of specs) {
    const xs = samples[s.key];
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1)) || 1e-9;
    const cpk = Math.min((s.hi - mean) / (3 * sd), (mean - s.lo) / (3 * sd));
    const inSpec = xs.filter((v) => v >= s.lo && v <= s.hi).length / xs.length;
    stats[s.key] = { mean, sd, cpk, inSpecPct: 100 * inSpec };
  }
  return { n, samples, stats };
}

// ---- helpers ----
function grid([a, b]: [number, number], n: number): number[] {
  return Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
}
/** Deterministic PRNG for reproducible Monte Carlo. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rng: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

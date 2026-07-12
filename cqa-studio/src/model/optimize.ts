/**
 * Browser-side agent optimizer — the SAME deterministic coordinate search the backend
 * runs keyless, ported to run entirely in the browser against the in-app model. This
 * makes the Agent Optimize tab work with ZERO setup (no server, no Docker, no key).
 *
 * The division of labor is identical to the backend: the "agent" only reasons about
 * *which* operating point to try; the mechanistic model (simulateKnobs) scores every
 * candidate as ground truth. When the backend IS running with an API key, the tab uses
 * the LLM proposer instead — this local version is the always-available fallback.
 */
import { simulateKnobs, defaultKnobs } from './engine';
import type { Knobs } from './types';

export interface OptEntry {
  round: number;
  knobs: Record<string, number>;
  harvest: Record<string, number>;
  score: number;
  rationale?: string;
}
export interface LocalOptResult {
  target: Record<string, number>;
  best: { knobs: Record<string, number>; harvest: Record<string, number>; score: number };
  history: OptEntry[];
  converged: boolean;
  mode: 'local';
}

const BOUNDS: Record<string, [number, number]> = {
  kLa_CO2: [0.03, 0.45], pH_set: [6.8, 7.3], mu_max: [0.018, 0.038],
  Fglc: [0.05, 0.5], Fgln: [0.0, 0.12], Fgal: [0.0, 0.25],
  asn_level: [0.2, 1.0], Tset: [30.0, 37.5], DO: [10.0, 90.0],
  Mn: [0.0, 3.0], MGAT: [0.0, 2.0], B4GALT: [0.0, 3.0],
  FUT8: [0.0, 2.0], ST6GAL: [0.0, 4.0],
};
const DRIVERS: Record<string, [string, number]> = {
  galactosylation: ['B4GALT', +1], afucosylation: ['FUT8', -1],
  sialylation: ['ST6GAL', +1], high_mannose: ['asn_level', +1],
};

function clip(k: Record<string, number>): Knobs {
  const base = defaultKnobs() as unknown as Record<string, number>;
  const out = { ...base };
  for (const [key, v] of Object.entries(k)) {
    if (key in BOUNDS) {
      const [lo, hi] = BOUNDS[key];
      out[key] = Math.min(Math.max(v, lo), hi);
    }
  }
  return out as unknown as Knobs;
}

function harvestOf(knobs: Record<string, number>): Record<string, number> {
  const r = simulateKnobs(clip(knobs));
  return {
    high_mannose: r.harvest.high_mannose, afucosylation: r.harvest.afucosylation,
    galactosylation: r.harvest.galactosylation, sialylation: r.harvest.sialylation,
    G0F: r.harvest.G0F,
  };
}

function score(h: Record<string, number>, target: Record<string, number>): number {
  return Object.keys(target).reduce((s, k) => (k in h ? s + (h[k] - target[k]) ** 2 : s), 0);
}

/** A point the search has actually visited (knobs + the harvest they produced). */
type Point = { knobs: Record<string, number>; harvest: Record<string, number> };

function coordinateStep(target: Record<string, number>, from: Point, decay: number):
  { knobs: Record<string, number>; rationale: string } {
  const h = from.harvest; const knobs = { ...from.knobs };
  const base = defaultKnobs() as unknown as Record<string, number>;
  // worst CQA = biggest deviation from target
  let worst = Object.keys(target)[0]; let wd = -1;
  for (const k of Object.keys(target)) {
    if (!(k in h)) continue;
    const d = Math.abs(h[k] - target[k]);
    if (d > wd) { wd = d; worst = k; }
  }
  const [knob, sign] = DRIVERS[worst] ?? ['B4GALT', +1];
  const cur = knobs[knob] ?? base[knob] ?? 1.0;
  const need = target[worst] - (h[worst] ?? 0);
  // Step from the LAST visited point with a DECAYING magnitude. Walking from the last
  // point (not always the incumbent best) plus a shrinking step means a round that fails
  // to improve can't re-propose the identical candidate forever — the same stall fix
  // applied to the backend agent (agents.py _coordinate_step).
  const stepMag = (need > 0 ? 0.15 : -0.15) * Math.max(Math.abs(cur), 0.5) * decay;
  knobs[knob] = cur + sign * stepMag;
  return { knobs, rationale: `coordinate step on ${knob} to move ${worst} toward target` };
}

/** Run the local optimization loop. Mirrors the backend's keyless path exactly. */
export function optimizeLocal(target: Record<string, number>, rounds = 4): LocalOptResult {
  const history: OptEntry[] = [];
  let best: LocalOptResult['best'] = { knobs: {}, harvest: harvestOf({}), score: 0 };
  best.score = score(best.harvest, target);
  // Advance the search from wherever we actually landed last round (not always `best`),
  // so an overshoot is followed by a smaller, different step rather than an identical retry.
  let last: Point = { knobs: best.knobs, harvest: best.harvest };

  for (let r = 0; r < rounds; r++) {
    const decay = Math.pow(0.7, r); // step shrinks each round → refine toward target, don't oscillate
    const prop = coordinateStep(target, last, decay);
    const knobs = clip(prop.knobs) as unknown as Record<string, number>;
    // keep only the knobs that differ from default so the display stays readable
    const shown: Record<string, number> = {};
    const base = defaultKnobs() as unknown as Record<string, number>;
    for (const [k, v] of Object.entries(knobs)) if (Math.abs(v - (base[k] ?? v)) > 1e-6) shown[k] = v;
    const harvest = harvestOf(knobs);
    const sc = score(harvest, target);
    history.push({ round: r, knobs: shown, harvest, score: sc, rationale: prop.rationale });
    last = { knobs: shown, harvest }; // always advance from where we landed, improved or not
    if (sc < best.score) best = { knobs: shown, harvest, score: sc };
    if (sc < 0.5) break;
  }
  return { target, best, history, converged: best.score < 0.5, mode: 'local' };
}

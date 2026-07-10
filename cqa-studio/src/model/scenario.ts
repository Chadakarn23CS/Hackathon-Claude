/**
 * Scenario export / import — a reproducibility bundle. Captures the exact operating point
 * (knobs), the CQAs the model predicts there, and a provenance stamp, into one JSON file
 * that anyone can re-load to regenerate the same result. No backend — pure client-side,
 * works from the offline single-file build. This is the "analysis others can reproduce" artifact.
 */
import { simulateKnobs, defaultKnobs } from './engine';
import type { Knobs } from './types';
import { PROVENANCE_NOTE } from './sources';

export const SCENARIO_SCHEMA = 'glycotwin.scenario/1';
const PORT_FIDELITY = '≤0.17% (JS↔Python port self-consistency)';

export interface Scenario {
  schema: string;
  exported: string;           // ISO timestamp
  knobs: Knobs;               // the operating point
  predicted: {                // CQAs the model gives at that point (recomputed on load, stored for reference)
    galactosylation: number; afucosylation: number; sialylation: number;
    high_mannose: number; G0F: number; titer: number; peakVCD: number; pCO2max: number;
  };
  provenance: { note: string; port_fidelity: string };
}

/** Build a scenario object from the current knobs. */
export function buildScenario(knobs: Knobs): Scenario {
  const r = simulateKnobs(knobs, 13);
  const h = r.harvest;
  return {
    schema: SCENARIO_SCHEMA,
    exported: new Date().toISOString(),
    knobs: { ...knobs },
    predicted: {
      galactosylation: round(h.galactosylation), afucosylation: round(h.afucosylation),
      sialylation: round(h.sialylation), high_mannose: round(h.high_mannose), G0F: round(h.G0F),
      titer: Math.round(r.titer), peakVCD: round(r.peakVCD), pCO2max: round(r.pCO2max),
    },
    provenance: { note: PROVENANCE_NOTE, port_fidelity: PORT_FIDELITY },
  };
}

/** Trigger a browser download of the scenario as JSON. */
export function downloadScenario(knobs: Knobs): void {
  const s = buildScenario(knobs);
  const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `glycotwin_scenario_${s.exported.slice(0, 19).replace(/[:T]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse a scenario file's text and return validated knobs (merged onto defaults so partial files load). */
export function parseScenario(text: string): { knobs: Knobs; scenario: Scenario } {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== 'object' || !obj.knobs)
    throw new Error('Not a GlycoTwin scenario file (missing "knobs").');
  if (obj.schema && obj.schema !== SCENARIO_SCHEMA)
    throw new Error(`Unsupported scenario schema "${obj.schema}" (expected ${SCENARIO_SCHEMA}).`);
  // merge onto defaults so an older/partial file still loads and unknown keys are dropped
  const base = defaultKnobs() as unknown as Record<string, number>;
  const merged: Record<string, number> = { ...base };
  for (const k of Object.keys(base)) if (typeof obj.knobs[k] === 'number') merged[k] = obj.knobs[k];
  return { knobs: merged as unknown as Knobs, scenario: obj as Scenario };
}

const round = (v: number) => Math.round(v * 10) / 10;

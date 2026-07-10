/**
 * GlycoTwin API client. Talks to the FastAPI backend (single source of truth:
 * the Python model). Base URL is configurable so the same build works whether
 * the frontend is served by the backend container (same origin) or dev-proxied.
 */
export const API_BASE =
  (import.meta as any).env?.VITE_API_BASE ?? '';

export interface OptEntry {
  round: number;
  knobs: Record<string, number>;
  harvest: Record<string, number>;
  score: number;
  rationale?: string;
  critique?: string;
}
export interface OptResult {
  target: Record<string, number>;
  best: { knobs: Record<string, number>; harvest: Record<string, number>; score: number };
  history: OptEntry[];
  converged: boolean;
  mode: 'llm' | 'deterministic' | 'local';
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json() as Promise<T>;
}

export const api = {
  health: () => fetch(`${API_BASE}/api/health`).then((r) => r.json()),
  simulate: (knobs: Record<string, number>, days = 13) => post('/simulate', { knobs, days }),
  harvest: (knobs: Record<string, number>, days = 13) => post<Record<string, number>>('/harvest', { knobs, days }),
  sensitivity: (knobs: Record<string, number>, cqa = 'galactosylation', frac = 0.15) =>
    post('/sensitivity', { knobs, cqa, frac }),
  optimize: (target: Record<string, number>, rounds = 4, use_llm = true) =>
    post<OptResult>('/agent/optimize', { target, rounds, use_llm }),
};

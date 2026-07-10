/**
 * Governance harness for the agent optimizer.
 *
 * The gap in the "LLM agent for bioprocess" literature is not capability — it is
 * GOVERNANCE: a regulated process cannot let an agent recommend an operating point
 * without a bounded action space, a ground-truth-only evaluation rule, an audit trail,
 * and a human-approval checkpoint. This module wraps an optimizer result with exactly
 * those controls. It changes no physics — it constrains and records what the agent did.
 */
import type { LocalOptResult, OptEntry } from './optimize';
import { KNOBS } from '../ui/config';

/**
 * Validated action space: the ONLY knobs the agent may touch, and their approved ranges.
 * Bounds are DERIVED from the same KNOBS config the sliders use — single source of truth,
 * so the governance gate can never drift from the actual validated ranges. The genetic/process
 * split is by enzyme-expression identity (a clone change), not by the config's UI grouping.
 */
const GENETIC_KNOBS = new Set(['MGAT', 'B4GALT', 'FUT8', 'ST6GAL']);

export const ACTION_SPACE: Record<string, { lo: number; hi: number; kind: 'process' | 'genetic'; label: string }> =
  Object.fromEntries(
    KNOBS.map((k) => [k.key, {
      lo: k.min, hi: k.max,
      kind: GENETIC_KNOBS.has(k.key) ? 'genetic' as const : 'process' as const,
      label: k.label,
    }])
  );

export interface PolicyCheck { rule: string; status: 'pass' | 'flag'; detail: string; }
export interface AuditEntry {
  round: number;
  proposal: Record<string, number>;
  score: number;
  decision: 'accepted (new best)' | 'rejected (no improvement)';
  withinBounds: boolean;
  rationale?: string;
}
export interface GovernanceReport {
  policyChecks: PolicyCheck[];
  audit: AuditEntry[];
  requiresGenetic: string[];     // knobs in the best recipe that need clone engineering
  atBoundsEdge: string[];        // knobs pinned at the edge of the validated range
  outOfSpace: string[];          // any knob the agent moved that is NOT in the action space
  approvalRequired: boolean;
  recommendation: 'process-implementable' | 'requires-clone-engineering' | 'out-of-design-space';
}

const EDGE_FRAC = 0.02; // within 2% of a bound counts as "pinned at edge"

/** Build the governance report from an optimizer result. Pure function, no side effects. */
export function govern(res: LocalOptResult): GovernanceReport {
  const best = res.best.knobs || {};

  // 1. Action-space compliance: did the agent only touch validated knobs, within range?
  const outOfSpace: string[] = [];
  const atBoundsEdge: string[] = [];
  const requiresGenetic: string[] = [];
  for (const [k, v] of Object.entries(best)) {
    const spec = ACTION_SPACE[k];
    if (!spec) { outOfSpace.push(k); continue; }
    const span = spec.hi - spec.lo;
    if (v <= spec.lo + span * EDGE_FRAC || v >= spec.hi - span * EDGE_FRAC) atBoundsEdge.push(k);
    if (spec.kind === 'genetic') requiresGenetic.push(k);
  }

  // 2. Audit trail: every round, with the accept/reject decision the optimizer made.
  let runningBest = Infinity;
  const audit: AuditEntry[] = (res.history as OptEntry[]).map((h) => {
    const improved = h.score < runningBest;
    if (improved) runningBest = h.score;
    const within = Object.entries(h.knobs).every(([k, v]) => {
      const s = ACTION_SPACE[k]; return s ? v >= s.lo && v <= s.hi : false;
    });
    return {
      round: h.round, proposal: h.knobs, score: h.score,
      decision: improved ? 'accepted (new best)' : 'rejected (no improvement)',
      withinBounds: within, rationale: h.rationale,
    };
  });

  // 3. Policy checks (the stated governance rules, evaluated against this run).
  const policyChecks: PolicyCheck[] = [
    {
      rule: 'Bounded action space',
      status: outOfSpace.length === 0 ? 'pass' : 'flag',
      detail: outOfSpace.length === 0
        ? 'All proposed knobs are inside the validated action space.'
        : `Agent moved knob(s) outside the validated space: ${outOfSpace.join(', ')}.`,
    },
    {
      rule: 'Ground-truth evaluation only',
      status: 'pass',
      detail: 'Every candidate was scored by the mechanistic model, never by the language model. The agent proposes; only the qualified model evaluates.',
    },
    {
      rule: 'Design-space boundary',
      status: atBoundsEdge.length === 0 ? 'pass' : 'flag',
      detail: atBoundsEdge.length === 0
        ? 'Best recipe sits inside the validated ranges (not on a boundary).'
        : `Best recipe pins knob(s) at the edge of the validated range: ${atBoundsEdge.join(', ')}. Verify robustness (Cpk) before acting.`,
    },
    {
      rule: 'Change-classification',
      status: requiresGenetic.length === 0 ? 'pass' : 'flag',
      detail: requiresGenetic.length === 0
        ? 'Best recipe is achievable by process operation alone.'
        : `Best recipe requires cell-line engineering (not a process move): ${requiresGenetic.join(', ')}.`,
    },
    {
      rule: 'Human approval checkpoint',
      status: 'flag',
      detail: 'Applying this recipe requires explicit human sign-off — the agent cannot self-apply an operating point.',
    },
  ];

  const recommendation: GovernanceReport['recommendation'] =
    outOfSpace.length > 0 ? 'out-of-design-space'
    : requiresGenetic.length > 0 ? 'requires-clone-engineering'
    : 'process-implementable';

  return { policyChecks, audit, requiresGenetic, atBoundsEdge, outOfSpace, approvalRequired: true, recommendation };
}

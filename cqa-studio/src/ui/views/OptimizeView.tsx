import { useState, useEffect } from 'react';
import { api } from '../../api';
import type { OptResult } from '../../api';
import { optimizeLocal } from '../../model/optimize';
import { govern } from '../../model/governance';

/**
 * Agent optimization panel. Runs the Proposer -> Evaluator(model) -> Critic loop.
 *
 * IMPORTANT: this works with ZERO setup. By default it runs the search entirely in
 * the browser against the in-app model (no server, no Docker, no key needed). If the
 * GlycoTwin backend is running AND "use LLM agents" is on, it uses the server-side LLM
 * proposer instead for smarter proposals. Either way the mechanistic model scores every
 * candidate as ground truth.
 */
export function OptimizeView({ applyKnobs, go }: {
  applyKnobs?: (partial: Record<string, number>) => void;
  go?: (tab: string) => void;
}) {
  const [applied, setApplied] = useState(false);
  const [approved, setApproved] = useState(false);
  const useResult = (tab?: string) => {
    if (res && applyKnobs) applyKnobs(res.best.knobs);
    setApplied(true);
    if (tab && go) go(tab);
  };
  const [target, setTarget] = useState<Record<string, number>>({ galactosylation: 62, afucosylation: 6, sialylation: 7 });
  const [rounds, setRounds] = useState(8);
  const [useLLM, setUseLLM] = useState(false);
  const [running, setRunning] = useState(false);
  const [res, setRes] = useState<OptResult | null>(null);
  const [err, setErr] = useState('');
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    api.health().then(() => setOnline(true)).catch(() => setOnline(false));
  }, []);

  const setT = (k: string, v: number) => setTarget((p) => ({ ...p, [k]: v }));

  const run = async () => {
    setRunning(true); setErr(''); setRes(null); setApproved(false); setApplied(false);
    // Use the backend's LLM proposer only when it's reachable AND the user asked for it.
    if (useLLM && online) {
      try {
        const r = await api.optimize(target, rounds, true);
        setRes(r); setRunning(false); return;
      } catch {
        setErr('Backend was unreachable — ran the search locally in your browser instead.');
      }
    }
    // Default path: run entirely in the browser. Small delay so the flow graph animates.
    await new Promise((r) => setTimeout(r, 350));
    const local = optimizeLocal(target, rounds) as unknown as OptResult;
    setRes(local);
    setRunning(false);
  };

  return (
    <div className="view opt">
      <div className="bio-legend">
        <span><b>Agent-to-agent process optimization.</b> A Proposer agent suggests operating conditions; the
        mechanistic model scores each one (ground truth — never hallucinated); a Critic agent steers the next
        round. Set a target glycan profile and let the agents search for the process that hits it.</span>
      </div>

      <AgentGraph running={running} rounds={res ? res.history.length : 0} mode={res?.mode} />

      <div className={`opt-status ${online ? 'on' : ''}`}>
        {online === null ? 'Runs in your browser — no setup needed. (checking for optional LLM backend…)'
          : online ? 'Backend connected — enable "use LLM agents" for the smart proposer. Otherwise runs locally.'
          : 'Runs entirely in your browser — no server, no Docker, no key needed. (Optional: start the backend for the LLM proposer.)'}
      </div>

      <details className="opt-keyhelp">
        <summary>How to enable the LLM proposer (optional) — where does the API key go?</summary>
        <div className="opt-keyhelp-body">
          <p><b>The key never goes in this page.</b> The browser search needs no key and is the default. The LLM
          proposer is smarter but runs <b>server-side</b>, so the key stays on your own machine — a browser key box
          would be both insecure (visible in page source) and non-functional (the Anthropic API blocks direct
          browser calls by design).</p>
          <p>To turn it on, start the bundled backend with your key in an environment variable, then reload:</p>
          <pre className="opt-code">{`# option A — local Python
export ANTHROPIC_API_KEY=sk-ant-...
uvicorn app.main:app --port 8000

# option B — Docker
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=sk-ant-... glycotwin`}</pre>
          <p>The app auto-detects the backend (the status line turns green) and the <b>use LLM agents</b> checkbox
          unlocks. Either way, <b>the mechanistic model still scores every proposal</b> — the LLM only proposes;
          it never invents the physics.</p>
        </div>
      </details>

      <div className="opt-grid">
        <div className="panel">
          <div className="panel-title">Target CQA profile (%)</div>
          {(['galactosylation', 'afucosylation', 'sialylation'] as const).map((k) => (
            <label key={k} className="opt-row">
              <span>{k}</span>
              <input type="number" step="0.5" value={target[k] ?? 0}
                onChange={(e) => setT(k, parseFloat(e.target.value))} />
            </label>
          ))}
          <label className="opt-row"><span>rounds</span>
            <input type="number" min={1} max={8} value={rounds} onChange={(e) => setRounds(parseInt(e.target.value) || 8)} />
          </label>
          <label className="opt-row"><span>use LLM agents {online ? '' : '(needs backend)'}</span>
            <input type="checkbox" checked={useLLM} disabled={!online}
              onChange={(e) => setUseLLM(e.target.checked)} />
          </label>
          <button className="btn primary" disabled={running} onClick={run}>
            {running ? 'agents working…' : 'Run optimization'}
          </button>
          {err && <div className="opt-err">{err}</div>}
        </div>

        <div className="panel">
          <div className="panel-title">Agent rounds</div>
          <ol className="opt-howto">
            <li><b>Set a target</b> CQA profile (left) and press <b>Run optimization</b>.</li>
            <li>Read the <b>rounds</b> below — each shows the proposed knobs, the model-scored CQAs, and the critic's steer.</li>
            <li><b>Approve</b> the recipe in the Governance panel (it checks the knobs are in the validated range).</li>
            <li>Click <b>Apply knobs to sliders</b>, then <b>→ Verify trajectory (Live Simulation)</b> to watch the batch play out — then Robustness and Sensitivity to confirm.</li>
          </ol>
          {!res && !running && <div className="mol-note">Nothing has run yet. Set a target and press Run — results appear here.</div>}
          {res && (
            <>
              <div className="opt-summary">
                Mode: <b>{res.mode === 'llm' ? 'LLM agents (backend)' : res.mode === 'local' ? 'in-browser search' : 'deterministic search'}</b> ·
                {res.converged ? ' converged' : ' best effort'} ·
                best score <b>{res.best.score.toFixed(2)}</b>
              </div>

              {/* Target vs achieved — did the agent hit each requested CQA? at a glance */}
              <div className="cqa-strip opt-hit-strip">
                {Object.entries(target).map(([key, tgt]) => {
                  const got = (res.best.harvest as Record<string, number>)[key];
                  if (got == null) return null;
                  const miss = Math.abs(got - tgt);
                  const dir = miss <= 1 ? 'up' : miss <= 3 ? 'flat' : 'down';
                  const mark = dir === 'up' ? '✓ on target' : dir === 'flat' ? '≈ close' : `▲ ${miss.toFixed(1)} off`;
                  const label = key.charAt(0).toUpperCase() + key.slice(1);
                  return (
                    <div className={`cqa-tile ${dir}`} key={key}>
                      <div className="cqa-name">{label}</div>
                      <div className="cqa-val">{tgt.toFixed(0)}<span className="cqa-to"> → </span>{got.toFixed(1)}%</div>
                      <div className="cqa-delta">{mark}</div>
                    </div>
                  );
                })}
              </div>
              <div className="opt-rounds">
                {res.history.map((h) => (
                  <div key={h.round} className="opt-card">
                    <div className="opt-card-hd">Round {h.round + 1} · score {h.score.toFixed(2)}</div>
                    <div className="opt-knobs">{Object.entries(h.knobs).map(([k, v]) => `${k}=${v.toFixed(2)}`).join('  ')}</div>
                    <div className="opt-harvest">
                      Gal {h.harvest.galactosylation?.toFixed(1)} · aFuc {h.harvest.afucosylation?.toFixed(1)} · Sia {h.harvest.sialylation?.toFixed(1)}
                    </div>
                    {h.rationale && <div className="opt-rationale">▸ {h.rationale}</div>}
                    {h.critique && <div className="opt-critique">◂ {h.critique}</div>}
                  </div>
                ))}
              </div>
              <div className="opt-best">
                Best operating point: {Object.entries(res.best.knobs).map(([k, v]) => `${k}=${v.toFixed(2)}`).join('  ') || '(baseline)'}
              </div>

              <div className="opt-next">
                <div className="opt-next-hd">Use this result → next steps</div>
                <div className="opt-next-body">
                  The agent proposed a recipe. Don't stop at the number — <b>verify it</b>, in order:
                  <b> (1)</b> approve it in Governance below, <b>(2)</b> Apply the knobs to the sliders,
                  <b> (3)</b> open Live Simulation to watch the batch reach that CQA, then <b>(4)</b> check
                  Robustness (Cpk) and Sensitivity. The buttons below do each step and jump you there.
                </div>
                <div className="opt-next-btns">
                  <button className="btn primary" disabled={!approved} title={approved ? '' : 'Requires governance approval below'}
                    onClick={() => useResult()}>
                    {applied ? '✓ Applied to sliders' : 'Apply knobs to sliders'}
                  </button>
                  <button className="btn" disabled={!approved} onClick={() => useResult('sim')}>→ Verify trajectory (Live Simulation)</button>
                  <button className="btn" disabled={!approved} onClick={() => useResult('rob')}>→ Check robustness (Cpk)</button>
                  <button className="btn" disabled={!approved} onClick={() => useResult('sens')}>→ Confirm levers (Sensitivity)</button>
                </div>
                <div className="opt-next-note">
                  {approved ? 'Approved — apply the recipe or jump to a verification tab.'
                    : 'These actions unlock after you approve the recipe in the Governance panel below.'}
                  {' '}Genetic knobs (B4GALT, FUT8, ST6GAL) are a clone-engineering recommendation; process knobs
                  (kLa, Fgal, Tset, DO, Mn) are operating conditions you can run on a bioreactor.
                </div>
              </div>

              {(() => {
                const g = govern(res as any);
                const recLabel = g.recommendation === 'process-implementable' ? 'Process-implementable'
                  : g.recommendation === 'requires-clone-engineering' ? 'Requires clone engineering'
                  : 'Outside validated design space';
                const recCls = g.recommendation === 'process-implementable' ? 'ok' : 'warn';
                return (
                  <div className="gov">
                    <div className="gov-hd">
                      <span className="panel-title" style={{ border: 'none', margin: 0, padding: 0 }}>Governance &amp; audit</span>
                      <span className={`gov-verdict ${recCls}`}>{recLabel}</span>
                    </div>
                    <div className="gov-body">Agent proposals are constrained to a validated action space and scored only by
                      the qualified model; applying a recipe requires human sign-off. This is the control layer a regulated process needs.</div>
                    <div className="gov-policy">
                      {g.policyChecks.map((p, i) => (
                        <div key={i} className={`gov-rule ${p.status}`}>
                          <span className="gov-badge">{p.status === 'pass' ? '✓' : '⚑'}</span>
                          <span className="gov-rule-name">{p.rule}</span>
                          <span className="gov-rule-detail">{p.detail}</span>
                        </div>
                      ))}
                    </div>
                    <div className="gov-audit-hd">Audit trail ({g.audit.length} rounds) · in-session log, not a 21 CFR Part 11 e-signed record</div>
                    <table className="gov-audit">
                      <thead><tr><th>Round</th><th>Proposal</th><th>Score</th><th>Decision</th><th>In bounds</th></tr></thead>
                      <tbody>
                        {g.audit.map((a) => (
                          <tr key={a.round} className={a.decision.startsWith('accepted') ? 'acc' : 'rej'}>
                            <td>{a.round + 1}</td>
                            <td className="gov-mono">{Object.entries(a.proposal).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ') || '—'}</td>
                            <td className="gov-mono">{a.score.toFixed(2)}</td>
                            <td>{a.decision}</td>
                            <td>{a.withinBounds ? '✓' : '✗'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="gov-approve">
                      <span className="gov-approve-lbl">⚑ Human approval checkpoint</span>
                      <button className={`btn ${approved ? 'primary' : ''}`} onClick={() => setApproved(true)}>
                        {approved ? '✓ Approved by operator' : 'Approve this recipe'}
                      </button>
                      <span className="gov-approve-note">
                        {approved ? 'Signed off — recipe may now be applied to the sliders above.'
                          : 'The agent cannot self-apply an operating point. A human must approve first.'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** LangGraph-style flow diagram: Proposer -> Evaluator(model) -> Critic, looping.
 * When running, the active node pulses through the cycle so the flow is visible. */
function AgentGraph({ running, rounds, mode }: { running: boolean; rounds: number; mode?: string }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!running) { setActive(0); return; }
    const id = setInterval(() => setActive((a) => (a + 1) % 3), 700);
    return () => clearInterval(id);
  }, [running]);
  const nodes = [
    { id: 0, x: 90, label: 'Proposer', sub: 'LLM agent', hint: 'suggests knobs', fill: '#2563eb' },
    { id: 1, x: 300, label: 'Evaluator', sub: 'mechanistic model', hint: 'scores candidate (ground truth)', fill: '#0ea5a4' },
    { id: 2, x: 510, label: 'Critic', sub: 'LLM agent', hint: 'steers next round', fill: '#d97706' },
  ];
  return (
    <div className="panel agent-graph">
      <div className="panel-title">Agent flow {mode ? `· ${mode === 'llm' ? 'LLM agents' : 'deterministic'} · ${rounds} round${rounds === 1 ? '' : 's'}` : ''}</div>
      <svg viewBox="0 0 600 176" width="100%" style={{ maxHeight: 190 }} role="img" aria-label="agent flow graph">
        <defs>
          <marker id="arw" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
            <path d="M0,0 L7,3 L0,6 Z" fill="#5a6b83" />
          </marker>
        </defs>
        <line x1="150" y1="71" x2="238" y2="71" stroke="#5a6b83" strokeWidth="1.6" markerEnd="url(#arw)" />
        <line x1="360" y1="71" x2="448" y2="71" stroke="#5a6b83" strokeWidth="1.6" markerEnd="url(#arw)" />
        <path d="M510,110 C510,150 90,150 90,110" fill="none" stroke="#5a6b83" strokeWidth="1.4" strokeDasharray="5 4" markerEnd="url(#arw)" />
        <text x="300" y="170" fontSize="9.5" textAnchor="middle" fill="#5a6b83">feedback: refine proposal from critique + score</text>
        {nodes.map((n) => (
          <g key={n.id}>
            <rect x={n.x - 60} y={38} width={120} height={66} rx={10}
              fill={running && active === n.id ? n.fill : '#ffffff'}
              stroke={n.fill} strokeWidth={running && active === n.id ? 2.5 : 1.5} />
            <text x={n.x} y={58} textAnchor="middle" fontSize={13} fontWeight={700}
              fill={running && active === n.id ? '#ffffff' : n.fill}>{n.label}</text>
            <text x={n.x} y={75} textAnchor="middle" fontSize={9.5}
              fill={running && active === n.id ? '#ffffff' : '#5a6b83'}>{n.sub}</text>
            <text x={n.x} y={94} textAnchor="middle" fontSize={9}
              fill={running && active === n.id ? '#ffffff' : '#5a6b83'}>{n.hint}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

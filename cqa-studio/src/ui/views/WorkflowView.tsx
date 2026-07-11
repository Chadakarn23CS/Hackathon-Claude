/**
 * Workflow — the molecule→decision landing. Two views inside one tab:
 *   • Overview: a connected 5-stage process map (molecule → bioreactor → glycan →
 *     CQA → control) with clickable step nodes.
 *   • Step detail: a drill-in for each of the 8 steps, with Prev/Next and a jump
 *     into the module tab where you act on it.
 * Structure/copy follow the Claude Design "Organic" handoff; real module tabs keep
 * their own content (this only restyles + restructures the Workflow landing).
 */
import { useState, useEffect } from 'react';

interface Step {
  n: number; tab: string; stage: string; title: string; sub: string;
  opens: string; body: string; note: string;
}

const STEPS: Step[] = [
  { n: 1, tab: 'mol', stage: 'Molecule', title: 'The molecule', sub: 'IgG1 · N-glycan at Asn297', opens: 'Antibody Molecule',
    body: 'Start from the antibody itself: an IgG1 with a single N-glycan on each Fc arm. That glycan — not the protein — sets ADCC, CDC, half-life and clearance.',
    note: 'Everything downstream exists to build the right glycan on this site.' },
  { n: 2, tab: 'bio', stage: 'Bioreactor', title: 'The cell that builds it', sub: 'CHO Golgi enzymes', opens: 'Cell Biology',
    body: 'The CHO cell secretes the antibody, and its Golgi enzymes decorate the glycan as it transits. Move the process and genome sliders and watch enzyme activity update from the model.',
    note: 'This is where process inputs become enzyme activity — the heart of the mechanism.' },
  { n: 3, tab: 'sim', stage: 'Bioreactor', title: 'The batch over time', sub: '13-day fed-batch', opens: 'Live Simulation',
    body: 'Run the fed-batch: viable cells, glucose, pCO₂, titer, and the CQA trajectory hour by hour. See how the glycan profile evolves as the culture ages.',
    note: 'A harvest CQA is the endpoint of a trajectory, not a fixed number.' },
  { n: 4, tab: 'mon', stage: 'Glycan', title: 'Track a running batch', sub: 'Digital-twin monitor', opens: 'Batch Monitor',
    body: 'Watch a live batch against its model twin — measured versus predicted — with drift flags when the process wanders off the expected path.',
    note: 'The twin tells you something is wrong before the assay does.' },
  { n: 5, tab: 'sens', stage: 'CQA', title: 'What moves the needle', sub: 'Sensitivity analysis', opens: 'Sensitivity',
    body: 'Rank every process parameter by how strongly it swings each CQA, so you know which knobs are worth controlling and which are just noise.',
    note: 'Not all parameters are equal — spend control effort where it counts.' },
  { n: 6, tab: 'ds', stage: 'CQA', title: 'Safe operating region', sub: 'ICH Q8 design space', opens: 'Design Space',
    body: 'Map the multivariate region where every CQA stays in spec. Anywhere inside is a validated move; the edges are your guardrails.',
    note: 'A design space is permission to move, granted in advance.' },
  { n: 7, tab: 'ctrl', stage: 'Control', title: 'Hold the line', sub: 'Feedback process control', opens: 'Process Control',
    body: 'Close the loop: controllers nudge feeds and setpoints to keep CQAs on target as the batch and the raw materials vary.',
    note: 'Control turns a good design space into a repeatable product.' },
  { n: 8, tab: 'rob', stage: 'Control', title: 'Will it stay in spec', sub: 'Robustness · Cpk', opens: 'Robustness',
    body: 'Stress the process across realistic variation and read the capability index. Cpk says whether the control strategy actually holds at scale.',
    note: 'Robustness is the difference between a demo and a filing.' },
];

const STAGES: { key: string; icon: IconName; steps: number[] }[] = [
  { key: 'Molecule', icon: 'atom', steps: [1] },
  { key: 'Bioreactor', icon: 'flask', steps: [2, 3] },
  { key: 'Glycan', icon: 'hexagon', steps: [4] },
  { key: 'CQA', icon: 'gauge', steps: [5, 6] },
  { key: 'Control', icon: 'sliders', steps: [7, 8] },
];

const nn = (n: number) => String(n).padStart(2, '0');

export function WorkflowView({ go }: { go: (tab: string) => void }) {
  const [step, setStep] = useState<number | null>(null);
  // Overview↔detail and Prev/Next stay on one tab, so reset the scroll here too.
  useEffect(() => { document.querySelector('.main')?.scrollTo({ top: 0 }); }, [step]);
  return step == null
    ? <Overview onPick={setStep} />
    : <Detail step={step} setStep={setStep} go={go} />;
}

/* ---------- Overview: hero + process map ---------- */
function Overview({ onPick }: { onPick: (n: number) => void }) {
  return (
    <div className="view wf">
      <div className="wf-hero">
        <div className="wf-kicker">The Workflow</div>
        <h2 className="wf-headline">From molecule to decision</h2>
        <p className="wf-lede">
          One connected thread. Each stage feeds the next — the glycan you engineer is set
          upstream by the cell and the batch, then judged downstream as a CQA and held by
          control. Pick any node to open the tab where you act on it.
        </p>
        <button className="btn primary wf-cta" onClick={() => onPick(1)}>Start at the molecule →</button>
      </div>

      <div className="wf-map">
        <div className="wf-stages">
          {STAGES.map((s, i) => (
            <div className="wf-stage-wrap" key={s.key}>
              <div className="wf-stage">
                <div className="wf-stage-hd">
                  <span className="wf-badge"><Icon name={s.icon} /></span>
                  <span className="wf-stage-meta">
                    <span className="wf-stage-no">Stage {nn(i + 1)}</span>
                    <span className="wf-stage-name">{s.key}</span>
                  </span>
                </div>
                <div className="wf-nodes">
                  {s.steps.map((n) => {
                    const st = STEPS[n - 1];
                    return (
                      <button className="wf-node" key={n} onClick={() => onPick(n)}>
                        <span className="wf-node-no">{n}</span>
                        <span className="wf-node-text">
                          <span className="wf-node-title">{st.title}</span>
                          <span className="wf-node-sub">{st.sub}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {i < STAGES.length - 1 && <span className="wf-conn"><Icon name="arrow" /></span>}
            </div>
          ))}
        </div>
      </div>

      <div className="wf-legend">
        <span className="wf-legend-item"><span className="wf-node-no sm">N</span> a step you act on</span>
        <span className="wf-legend-item"><span className="wf-legend-arrow"><Icon name="arrow" /></span> flows into the next stage</span>
        <span className="wf-legend-tail">Eight steps · five stages · one thread</span>
      </div>
    </div>
  );
}

/* ---------- Detail: left rail + center + side panel ---------- */
function Detail({ step, setStep, go }: { step: number; setStep: (n: number | null) => void; go: (t: string) => void }) {
  const st = STEPS[step - 1];
  const stageIdx = STAGES.findIndex((s) => s.key === st.stage);
  const prev = step > 1 ? step - 1 : null;
  const next = step < STEPS.length ? step + 1 : 1;
  return (
    <div className="view wf">
      <div className="wf-detail">
        {/* left rail */}
        <aside className="wf-rail">
          <button className="btn wf-rail-back" onClick={() => setStep(null)}>← Overview</button>
          <div className="wf-kicker sm">Workflow Steps</div>
          {STEPS.map((s) => (
            <button key={s.n} className={`wf-steprow ${s.n === step ? 'active' : ''}`} onClick={() => setStep(s.n)}>
              <span className="wf-node-no">{s.n}</span>
              <span className="wf-node-text">
                <span className="wf-node-title">{s.title}</span>
                <span className="wf-node-sub">{s.sub}</span>
              </span>
              {s.n === step && <span className="wf-star"><Icon name="star" /></span>}
            </button>
          ))}
        </aside>

        {/* center */}
        <div className="wf-center">
          <div className="wf-kicker">Step {nn(step)}</div>
          <h2 className="wf-step-title">{st.title}</h2>
          <div className="wf-step-sub">{st.sub}</div>
          <div className={`wf-figure stage-${stageIdx}`}><Icon name={STAGES[stageIdx].icon} /></div>
          <p className="wf-step-body">{st.body}</p>
          <div className="wf-note">‣ {st.note}</div>
          <div className="wf-btns">
            <button className="btn primary" onClick={() => go(st.tab)}>Open {st.opens} →</button>
            {prev && <button className="btn ghost" onClick={() => setStep(prev)}>← Prev</button>}
            <button className="btn ghost" onClick={() => setStep(next)}>Next step →</button>
          </div>
        </div>

        {/* side panel */}
        <aside className="wf-side">
          <div className="wf-card">
            <div className="wf-card-hd"><span>Step detail</span><span className="wf-heart"><Icon name="heart" /></span></div>
            <div className="wf-card-title">{st.title}</div>
            <div className="wf-card-sub">{st.sub}</div>
            <div className="wf-kv"><span>Opens</span><b>{st.opens}</b></div>
            <div className="wf-kv"><span>Chain step</span><b>{step} of 8</b></div>
            <div className="wf-kv"><span>Stage</span><b>{st.stage}</b></div>
          </div>
          <div className="wf-card">
            <div className="wf-card-hd"><span>Why it matters</span></div>
            <div className="wf-card-why">{st.note}</div>
          </div>
          <div className="wf-card">
            <div className="wf-card-hd"><span>Where in the chain</span></div>
            <div className="wf-chain">
              {STAGES.map((s, i) => (
                <div className={`wf-chain-row ${i === stageIdx ? 'on' : ''}`} key={s.key}>
                  <span className="wf-chain-dot" /><span>{s.key}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------- inline icons (Lucide-style, stroke 2.75) ---------- */
type IconName = 'atom' | 'flask' | 'hexagon' | 'gauge' | 'sliders' | 'arrow' | 'heart' | 'star';
function Icon({ name }: { name: IconName }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const solid = { fill: 'currentColor', stroke: 'none' };
  switch (name) {
    case 'atom': return (<svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z" /><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z" /></svg>);
    case 'flask': return (<svg viewBox="0 0 24 24" {...stroke}><path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" /><path d="M6.453 15h11.094" /><path d="M8.5 2h7" /></svg>);
    case 'hexagon': return (<svg viewBox="0 0 24 24" {...stroke}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>);
    case 'gauge': return (<svg viewBox="0 0 24 24" {...stroke}><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></svg>);
    case 'sliders': return (<svg viewBox="0 0 24 24" {...stroke}><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></svg>);
    case 'arrow': return (<svg viewBox="0 0 24 24" {...stroke}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>);
    case 'heart': return (<svg viewBox="0 0 24 24" {...solid}><path d="M12 21s-7.5-4.35-10-9.5C.5 8 2.1 4.5 5.5 4.5c2 0 3.5 1 4.5 2.5 1-1.5 2.5-2.5 4.5-2.5 3.4 0 5 3.5 3.5 7-2.5 5.15-10 9.5-10 9.5Z" /></svg>);
    case 'star': return (<svg viewBox="0 0 24 24" {...solid}><path d="M12 2.5 14.9 8.4l6.5.95-4.7 4.58 1.11 6.47L12 17.9l-5.81 3.06 1.11-6.47-4.7-4.58 6.5-.95Z" /></svg>);
  }
}

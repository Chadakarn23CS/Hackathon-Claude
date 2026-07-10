/**
 * End-to-end workflow spine: molecule -> cell -> Golgi -> glycan -> CQA -> drug decision.
 * Each step names the science and jumps into the tab where you act on it. This is the
 * thread that turns eight independent tabs into one story.
 */
export function WorkflowView({ go }: { go: (tab: string) => void }) {
  const steps = [
    {
      n: 1, tab: 'mol', tabLabel: 'Antibody Molecule',
      title: 'The molecule',
      body: 'Start from the antibody itself: an IgG1 with a single N-glycan on each Fc arm (Asn297). That glycan — not the protein — sets ADCC, CDC, half-life and clearance. See the real 3D structure and the glycan attachment site.',
      why: 'Everything downstream exists to build the right glycan on this site.',
    },
    {
      n: 2, tab: 'bio', tabLabel: 'Cell Biology',
      title: 'The cell that builds it',
      body: 'The CHO cell secretes the antibody, and its Golgi enzymes decorate the glycan as it transits. Move the process/genome sliders and watch the bioreactor state, Golgi pH, per-enzyme activity, and the secreted glycan all update from the model.',
      why: 'This is where process inputs become enzyme activity — the heart of the mechanism.',
    },
    {
      n: 3, tab: 'sim', tabLabel: 'Live Simulation',
      title: 'The batch over time',
      body: 'Run the 13-day fed-batch: viable cells, glucose, pCO₂, titer, and the CQA trajectory hour by hour. See how the glycan profile evolves as the culture ages.',
      why: 'A harvest CQA is the endpoint of a trajectory, not a fixed number.',
    },
    {
      n: 4, tab: 'mon', tabLabel: 'Batch Monitor (Twin)',
      title: 'Track a running batch',
      body: 'The digital-twin step: enter the offline samples from a live batch (VCD, glucose, pCO₂, an at-line glycan reading) and the twin re-forecasts the harvest CQA through your data, flagging a corrective move if the batch is drifting out of spec.',
      why: 'This is what makes it a twin, not a simulator — it tracks the real asset.',
    },
    {
      n: 5, tab: 'sens', tabLabel: 'Sensitivity',
      title: 'Which levers matter',
      body: 'Rank every process and genome parameter by how much it moves a chosen CQA. The tornado tells you the 2–3 factors worth a physical DOE — and which to ignore.',
      why: 'Compress the experimental program before you touch a reactor.',
    },
    {
      n: 6, tab: 'ds', tabLabel: 'Design Space (Q8)',
      title: 'The design space',
      body: 'Sweep any two parameters and map the region where the CQA stays in spec — a mechanistically-justified ICH-Q8 design space for the filing.',
      why: 'Turn "it worked once" into a defensible operating region.',
    },
    {
      n: 7, tab: 'ctrl', tabLabel: 'Process Control',
      title: 'Control it at scale',
      body: 'CO₂ stripping (kLa) is the lever that changes with reactor scale. A PID loop manipulates it to hold pCO₂ — and therefore Golgi pH and galactosylation — at setpoint. See the galactosylation-vs-titer tradeoff a control strategy must balance.',
      why: 'This is the scale-up and control-strategy story (ICH Q10/Q11).',
    },
    {
      n: 8, tab: 'rob', tabLabel: 'Robustness (Cpk)',
      title: 'Will it stay in spec',
      body: 'Monte-Carlo the operating point with realistic run-to-run variability and read the capability index (Cpk). Answers "will this hold at commercial scale?" before the process is locked.',
      why: 'Manufacturability, quantified.',
    },
    {
      n: 9, tab: 'scale', tabLabel: 'Scale-Up',
      title: 'Will the glycan hold at scale',
      body: 'Compare bench → pilot → manufacturing by their effective CO₂-stripping. Shows the honest result: pCO₂ rises and titer falls at scale, but the glycan is robust (within the published effect ceiling).',
      why: 'Tech-transfer: which attribute is actually at risk when you scale up.',
    },
    {
      n: 10, tab: 'opt', tabLabel: 'Agent Optimize',
      title: 'Hit a target profile',
      body: 'Give a target glycan profile (e.g. match an originator for biosimilarity) and let the agent loop search for the process that reaches it — every candidate scored by the real model.',
      why: 'Comparability and inverse design: from desired glycan back to process.',
    },
  ];
  return (
    <div className="view wf">
      <div className="bio-legend">
        <span><b>The GlycoTwin workflow — molecule to decision.</b> Follow the eight steps in order the first
        time: each explains one link in the chain from the antibody molecule to a drug-development decision, and
        jumps you into the tab where you act on it. This is the thread that connects everything.</span>
      </div>
      <div className="wf-thread">
        {steps.map((s, i) => (
          <div key={s.n} className="wf-step">
            <div className="wf-rail">
              <div className="wf-dot">{s.n}</div>
              {i < steps.length - 1 && <div className="wf-line" />}
            </div>
            <div className="wf-card">
              <div className="wf-title">{s.title}</div>
              <div className="wf-body">{s.body}</div>
              <div className="wf-why">▸ {s.why}</div>
              <button className="btn primary wf-go" onClick={() => go(s.tab)}>
                Open {s.tabLabel} →
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="wf-outcome">
        <b>The outcome:</b> a glycan-CQA decision made <i>upstream</i> — in clone selection, process design,
        scale-up, and control strategy — instead of measured after the run. That is what compresses timelines
        and de-risks the CMC package.
      </div>
    </div>
  );
}

/** How-to-use guide: what the tool is, how the model works, and a worked walkthrough. */
import { SOURCES, PROVENANCE_NOTE } from '../../model/sources';

export function GuideView() {
  return (
    <div className="view guide">
      <div className="guide-hero">
        <h2>GlycoTwin — Antibody Glyco-CQA Digital Twin</h2>
        <p>A mechanistic digital twin that connects bioreactor operation → cell metabolism → Golgi
        glycosylation → antibody Critical Quality Attributes (CQAs), with a production-grade interface for
        Quality-by-Design exploration and closed-loop control.</p>
      </div>

      <div className="guide-grid">
        <section className="panel guide-span">
          <div className="panel-title">Starting a new mAb program? Follow the path</div>
          <p>Bringing a new antibody into development? GlycoTwin is a decision-support twin you use
          <b> before and alongside</b> the bench — to decide what to target, what to control, and what
          to engineer. Follow these six steps in order:</p>
          <div className="journey">
            {[
              { n: 1, icon: '🎯', tab: '1 · Antibody Molecule', title: 'Set the glycan target',
                body: 'Map your mechanism of action to a CQA: ADCC → high afucosylation, CDC → high galactosylation, long half-life → sialylation. Turns "what glycan?" into setpoints.' },
              { n: 2, icon: '📊', tab: '5 · Sensitivity', title: 'Find the levers',
                body: 'Rank which inputs move your target CQA most — media (Mn²⁺, galactose), process (CO₂, temperature), or clone (B4GALT1, FUT8).' },
              { n: 3, icon: '🤖', tab: '10 · Agent Optimize', title: 'Get a recipe',
                body: 'Enter the target CQA profile and run. The agent returns knob settings scored by the mechanism, flagged process-implementable or needs-clone.' },
              { n: 4, icon: '🗺️', tab: '6 · Design Space · 8 · Robustness', title: 'Prove it holds',
                body: 'Design Space (Q8) gives the in-spec region for a QbD narrative; Robustness (Cpk) checks it survives real input variability.' },
              { n: 5, icon: '🎛️', tab: '7 · Process Control · 9 · Scale-Up', title: 'Plan control & scale',
                body: 'A feedback loop holds the CQA at setpoint; Scale-Up shows which parameter (CO₂ stripping) drifts at manufacturing scale — what to control at tech transfer.' },
              { n: 6, icon: '🔬', tab: 'recalibrate skill', title: 'Make it your molecule',
                body: 'Public build = canonical IgG1. With your own fed-batch + glycan data, run the open-source cho-cqa-recalibrate skill to refit the twin — that calibration stays local to you.' },
            ].map((s) => (
              <div className="jstep" key={s.n}>
                <div className="jstep-hd">
                  <span className="jnum">{s.n}</span>
                  <span className="jicon" aria-hidden>{s.icon}</span>
                  <span className="jtab">{s.tab}</span>
                </div>
                <div className="jtitle">{s.title}</div>
                <div className="jbody">{s.body}</div>
              </div>
            ))}
          </div>
          <p className="guide-note"><b>The honest boundary:</b> out of the box this is a
          <i> mechanistic, literature-calibrated</i> twin — use it to prioritize experiments, frame a
          design space, and reason about levers. It becomes a quantitative predictor for a specific
          product only after you calibrate it to that product's data. It is decision-support, not a
          release assay.</p>
        </section>

        <section className="panel">
          <div className="panel-title">What it models</div>
          <p>A 9-state fed-batch CHO bioreactor ODE (growth, glucose/glutamine, lactate/ammonia, product,
          dissolved CO₂, volume, galactose) feeds a Golgi enzyme-train that computes the N-glycan distribution
          each hour. CO₂ sets Golgi pH (Villiger relation); pH, Mn²⁺ cofactor, nucleotide-sugar supply and
          residence time jointly set galactosylation, fucosylation, sialylation and high-mannose. The model is
          literature-parameterized and calibrated to a canonical G0F-dominant IgG1 Fc profile.</p>
          <p className="guide-note">The JavaScript engine reproduces its Python reference to ≤0.17% across 13
          scenarios (36 automated tests). It is decision-support, not a validated release assay.</p>
        </section>

        <section className="panel guide-span">
          <div className="panel-title">The biology it captures — and its scope</div>
          <p>Glycosylation is governed by <b>two coupled levers</b>, and the model is built directly on both:</p>
          <svg viewBox="0 0 720 250" className="lever-svg" role="img" aria-label="Two-lever glycosylation mechanism">
            {/* lever 1: enzymes (top) */}
            <rect x="8" y="16" width="150" height="46" rx="6" fill="#0f6e6318" stroke="#0f6e63" strokeWidth="1.4" />
            <text x="83" y="36" textAnchor="middle" className="lever-t1">ENZYME</text>
            <text x="83" y="52" textAnchor="middle" className="lever-t2">expression · pH · Mn²⁺</text>
            {/* lever 2: donors (bottom) */}
            <rect x="8" y="98" width="150" height="46" rx="6" fill="#2563eb18" stroke="#2563eb" strokeWidth="1.4" />
            <text x="83" y="118" textAnchor="middle" className="lever-t1">DONOR</text>
            <text x="83" y="134" textAnchor="middle" className="lever-t2">nucleotide-sugar supply</text>
            {/* multiply node */}
            <circle cx="210" cy="80" r="17" fill="#12161d" />
            <text x="210" y="86" textAnchor="middle" className="lever-mult">×</text>
            <line x1="158" y1="39" x2="196" y2="72" stroke="#0f6e63" strokeWidth="1.6" markerEnd="url(#lv)" />
            <line x1="158" y1="121" x2="196" y2="88" stroke="#2563eb" strokeWidth="1.6" markerEnd="url(#lv)" />
            <text x="210" y="116" textAnchor="middle" className="lever-t2">activity</text>
            {/* sequential branched build */}
            <line x1="227" y1="80" x2="262" y2="80" stroke="#5b626d" strokeWidth="1.4" markerEnd="url(#lv)" />
            {[
              { x: 288, l: 'Man5', s: 'unprocessed' }, { x: 388, l: '+GlcNAc', s: 'antenna' },
              { x: 488, l: '+Gal', s: 'galactose' }, { x: 588, l: '+NeuAc', s: 'sialic acid' },
            ].map((n, i) => (
              <g key={n.l}>
                <rect x={n.x - 34} y="58" width="68" height="44" rx="5" fill="#faf9f5" stroke="#e3e0d8" strokeWidth="1.2" />
                <text x={n.x} y="78" textAnchor="middle" className="lever-step">{n.l}</text>
                <text x={n.x} y="93" textAnchor="middle" className="lever-t3">{n.s}</text>
                {i < 3 && <line x1={n.x + 34} y1="80" x2={n.x + 66} y2="80" stroke="#5b626d" strokeWidth="1.4" markerEnd="url(#lv)" />}
              </g>
            ))}
            {/* fucose parallel branch */}
            <rect x={388 - 34} y="150" width="68" height="40" rx="5" fill="#faf9f5" stroke="#dc262655" strokeWidth="1.2" />
            <text x="388" y="168" textAnchor="middle" className="lever-step">±Fucose</text>
            <text x="388" y="182" textAnchor="middle" className="lever-t3">parallel branch</text>
            <line x1="388" y1="102" x2="388" y2="148" stroke="#dc2626" strokeWidth="1.3" strokeDasharray="3 3" markerEnd="url(#lv)" />
            <text x="612" y="128" textAnchor="middle" className="lever-t3">each step gated by</text>
            <text x="612" y="141" textAnchor="middle" className="lever-t3">the one before it</text>
            <text x="360" y="228" textAnchor="middle" className="lever-cap">
              Activity = enzyme × donor — either lever at zero shuts the step down. Steps are sequential: Gal only where an antenna exists, NeuAc only where Gal exists.</text>
            <defs><marker id="lv" markerWidth="7" markerHeight="7" refX="5.5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#5b626d" /></marker></defs>
          </svg>
          <ul className="guide-list">
            <li><b>Enzymes</b> (glycosyltransferases in the Golgi) — the catalysts. Their activity is set by expression
              (genetic knobs MGAT/B4GALT1/FUT8/ST6GAL1), Golgi-lumen pH (each has a pH optimum), the Mn²⁺ cofactor,
              and residence time. In the engine, enzyme activity = expression × pH-factor × Mn-cofactor.</li>
            <li><b>Nucleotide-sugar donors</b> (UDP-GlcNAc, UDP-Gal, GDP-Fuc, CMP-NeuAc) — the substrates. Fed by
              central metabolism (glucose/glutamine/asparagine), they are the supply side: a fully-active enzyme still
              adds nothing if its donor pool is depleted. Activity multiplies enzyme × substrate — either lever at
              zero shuts the step down.</li>
          </ul>
          <p>Control is hard because the network is <b>sequential and branched</b>: a glycan is built step-by-step as it
          transits (GlcNAc → galactose → sialic acid, with fucose a parallel branch), so galactose is only added where an
          antenna exists and sialic acid only where galactose exists. You steer a whole competing distribution under one
          transit time — which is why a mechanistic model earns its place over a lookup table.</p>
          <p className="guide-note"><b>Scope:</b> this models <b>N-linked glycosylation</b> of the IgG1 Fc glycan
          (Asn297) — where the mAb effector CQAs live (afucosylation→ADCC, galactosylation→CDC, sialylation→half-life).
          IgG1 Fc has no O-glycosylation, so N-linked is the complete CQA story for a canonical antibody.
          <b> O-glycosylation</b> (mucin-type, GALNT family, relevant to Fc-fusions / IgA / EPO) is a distinct,
          template-independent process and is <i>not</i> modeled here — it is the natural next module, not a current claim.</p>
        </section>

        <section className="panel">
          <div className="panel-title">The tabs</div>
          <ul className="guide-list">
            <li><b>Cell Biology</b> — the intuitive entry point. An interactive CHO-cell schematic; move a slider
            and watch the Golgi lumen pH, enzyme activity, precursor tanks and the secreted glycan redraw.</li>
            <li><b>Antibody Molecule</b> — the product itself: a monoclonal IgG1 with its Fc N-glycan redrawing live,
            an on-demand real 3D structure, and each CQA mapped to its clinical function.</li>
            <li><b>Live Simulation</b> — full time-course of CQAs, metabolites, growth and titer for the current
            settings.</li>
            <li><b>Design Space (Q8)</b> — sweep two parameters and see the ICH-Q8 region where a CQA stays in
            spec. This is the in-silico DOE.</li>
            <li><b>Robustness (Cpk)</b> — Monte-Carlo the process with realistic input variability; get capability
            indices and % in-spec.</li>
            <li><b>Sensitivity</b> — tornado ranking of which levers move a chosen CQA most.</li>
            <li><b>Process Control</b> — a PID controller closes the loop on the twin, holding pCO₂ (and therefore
            galactosylation) at setpoint by manipulating CO₂ stripping.</li>
          </ul>
        </section>

        <section className="panel">
          <div className="panel-title">A 60-second walkthrough</div>
          <ol className="guide-steps">
            <li><b>Start in Cell Biology.</b> Drag <i>Mn²⁺</i> up — the β4GalT station brightens and the glycan
            gains galactose caps. Drag <i>CO₂ stripping</i> down — the Golgi lumen turns amber (acidified) and
            galactosylation falls. You are seeing the causal chain, not a correlation.</li>
            <li><b>Quantify it in Design Space.</b> Pick Mn²⁺ × galactose feed, target galactosylation, and read
            off the region that stays in the 35–65% window.</li>
            <li><b>Stress-test in Robustness.</b> Add ±10% input CV and check the galactosylation Cpk — is the
            operating point actually manufacturable?</li>
            <li><b>Close the loop in Process Control.</b> Switch from open to closed loop, set a pCO₂ setpoint,
            and watch the controller hold the CQA while the tradeoff against titer becomes visible.</li>
          </ol>
        </section>

        <section className="panel guide-span">
          <div className="panel-title">Who benefits</div>
          <p><b>Process development</b> screens CPP→CQA relationships in silico before spending bench runs.
          <b> Tech transfer / MSAT</b> uses the scale-gradient logic to decide which parameter to control tightly
          at scale. <b>Regulatory / QbD</b> gets a mechanistically-justified design space for the control-strategy
          narrative. <b>Cell-line engineering</b> screens genotype edits (FUT8-KO for ADCC, B4GALT1-OE for
          galactosylation) against manufacturability. To make any quantitative claim for a specific product, the
          model is calibrated against that product's fed-batch + glycan data.</p>
        </section>

        <section className="panel guide-span">
          <div className="panel-title">Data provenance — all public sources</div>
          <p className="prov-note">{PROVENANCE_NOTE}</p>
          <table className="scale-tbl prov-tbl">
            <thead><tr><th>Area</th><th>What</th><th>Public source</th></tr></thead>
            <tbody>
              {SOURCES.map((s, i) => (
                <tr key={i}>
                  <td><b>{s.area}</b></td>
                  <td>{s.item}</td>
                  <td className="prov-src">{s.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="prov-note">Want the twin to match <i>your</i> molecule? The open-source
            <b> cho-cqa-recalibrate</b> skill (in <code>skills/cho-cqa-recalibrate/</code> in this repo)
            refits the mechanistic model to a specific product from its measured harvest N-glycan
            profile, then rebuilds the app. Run it on your own fed-batch + glycan data — that
            calibration stays local to you and is never part of this public build, so the open
            release carries the method but no proprietary data.</p>
        </section>
      </div>
    </div>
  );
}

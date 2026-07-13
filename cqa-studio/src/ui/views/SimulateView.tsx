import { useMemo } from 'react';
import { simulateKnobs } from '../../model/engine';
import { DEFAULT_SPECS } from '../../model/analysis';
import type { Knobs } from '../../model/types';
import { Plot, CQACard, PLOT_LAYOUT } from '../components';

const CQA_COLOR: Record<string, string> = {
  high_mannose: '#e8a04d', afucosylation: '#5aa9ff', galactosylation: '#7fd0a8',
  sialylation: '#d8b6e0', G0F: '#f2c14e',
};

/** Live process-simulation view: harvest CQA cards + trajectory charts. */
export function SimulateView({ knobs }: { knobs: Knobs }) {
  const sim = useMemo(() => simulateKnobs(knobs), [knobs]);
  const hours = sim.t.map((d) => d * 24);

  return (
    <div className="view">
      <div className="cqa-row">
        {DEFAULT_SPECS.map((s) => (
          <CQACard
            key={s.key}
            label={s.label}
            value={sim.harvest[s.key]}
            lo={s.lo}
            hi={s.hi}
            color={CQA_COLOR[s.key]}
          />
        ))}
      </div>

      <div className="panel-grid">
        <div className="panel">
          <div className="panel-title">Glycan CQA trajectory</div>
          <Plot
            height={280}
            data={DEFAULT_SPECS.map((s) => ({
              x: hours, y: sim.cqaT[s.key], name: s.label, mode: 'lines',
              line: { color: CQA_COLOR[s.key], width: 2 },
            }))}
            layout={{ ...PLOT_LAYOUT, xaxis: { ...PLOT_LAYOUT.xaxis, title: 'Cell culture duration (h)' },
              yaxis: { ...PLOT_LAYOUT.yaxis, title: '% of glycans' } }}
          />
        </div>

        <div className="panel">
          <div className="panel-title">Dissolved CO₂ → Golgi pH</div>
          <Plot
            height={280}
            data={[
              { x: hours, y: sim.pCO2, name: 'pCO₂ (mmHg)', mode: 'lines', line: { color: '#e8a04d', width: 2 } },
              { x: hours, y: sim.cqaT.pH_golgi, name: 'Golgi pH', mode: 'lines', yaxis: 'y2',
                line: { color: '#5aa9ff', width: 2 } },
            ]}
            layout={{ ...PLOT_LAYOUT, xaxis: { ...PLOT_LAYOUT.xaxis, title: 'Cell culture duration (h)' },
              yaxis: { ...PLOT_LAYOUT.yaxis, title: 'pCO₂ (mmHg)' },
              yaxis2: { title: 'Golgi pH', overlaying: 'y', side: 'right', gridcolor: 'transparent',
                color: '#5a6b83' } }}
          />
        </div>

        <div className="panel">
          <div className="panel-title">Growth &amp; titer</div>
          <Plot
            height={280}
            data={[
              { x: hours, y: sim.Xv, name: 'Viable cells (×10⁶/mL)', mode: 'lines', line: { color: '#7fd0a8', width: 2 } },
              { x: hours, y: sim.mAb, name: 'mAb (mg/L)', mode: 'lines', yaxis: 'y2', line: { color: '#f2c14e', width: 2 } },
            ]}
            layout={{ ...PLOT_LAYOUT, xaxis: { ...PLOT_LAYOUT.xaxis, title: 'Cell culture duration (h)' },
              yaxis: { ...PLOT_LAYOUT.yaxis, title: 'VCD (×10⁶/mL)' },
              yaxis2: { title: 'Titer (mg/L)', overlaying: 'y', side: 'right', gridcolor: 'transparent', color: '#5a6b83' } }}
          />
        </div>

        <div className="panel">
          <div className="panel-title">Metabolites</div>
          <Plot
            height={280}
            data={[
              { x: hours, y: sim.Glc, name: 'Glucose', mode: 'lines', line: { color: '#5aa9ff', width: 2 } },
              { x: hours, y: sim.Lac, name: 'Lactate', mode: 'lines', line: { color: '#e8685f', width: 2 } },
              { x: hours, y: sim.Amm, name: 'Ammonia', mode: 'lines', line: { color: '#d8b6e0', width: 2 } },
            ]}
            layout={{ ...PLOT_LAYOUT, xaxis: { ...PLOT_LAYOUT.xaxis, title: 'Cell culture duration (h)' },
              yaxis: { ...PLOT_LAYOUT.yaxis, title: 'mM' } }}
          />
          <div className="panel-note met-note">
            <b>Why only these three?</b> The model tracks the species that mechanistically drive the glycan:
            <b> glucose/glutamine</b> → nucleotide-sugar precursors, <b>lactate/ammonia</b> → Golgi-pH &amp; inhibition,
            <b> dissolved CO₂</b> → Golgi pH, <b>DO</b> → sialylation energy. Others you asked about act <i>through</i>
            these same levers and are handled as follows:
            <ul className="met-list">
              <li><b>Glutamate</b> — downstream of glutamine; folded into the glutamine/ammonia arm.</li>
              <li><b>pO₂ / DO</b> — present as the DO knob (drives oxidative CMP-NeuAc → sialylation).</li>
              <li><b>pCO₂</b> — a state variable already (the master Golgi-pH lever).</li>
              <li><b>Osmolality, Na⁺, K⁺</b> — act on growth/productivity and, at high osmolality, on specific
                productivity; a second-order glycan effect. Add via the recalibrate skill if your product shows it.</li>
              <li><b>Mn²⁺, Ca²⁺</b> — Mn²⁺ is an explicit knob (GalT/SiaT cofactor); Ca²⁺ is a minor cofactor not
                separately resolved.</li>
            </ul>
            The principle: adding more state variables without product-specific data adds parameters, not predictive
            power. The recalibrate skill is where product-specific couplings belong.
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Nucleotide-sugar donor pools (the substrate lever)</div>
          <Plot
            height={280}
            data={[
              { x: hours, y: sim.poolsT.UDPGlcNAc, name: 'UDP-GlcNAc → antennae', mode: 'lines', line: { color: '#2563eb', width: 2 } },
              { x: hours, y: sim.poolsT.UDPGal, name: 'UDP-Gal → galactose', mode: 'lines', line: { color: '#eab308', width: 2 } },
              { x: hours, y: sim.poolsT.GDPFuc, name: 'GDP-Fuc → core fucose', mode: 'lines', line: { color: '#dc2626', width: 2 } },
              { x: hours, y: sim.poolsT.CMPNeuAc, name: 'CMP-NeuAc → sialic acid', mode: 'lines', line: { color: '#9333ea', width: 2 } },
            ]}
            layout={{ ...PLOT_LAYOUT, xaxis: { ...PLOT_LAYOUT.xaxis, title: 'Cell culture duration (h)' },
              yaxis: { ...PLOT_LAYOUT.yaxis, title: 'pool (relative to baseline = 1.0)' } }}
          />
          <div className="panel-note met-note">
            <b>The second control lever.</b> Glycan CQAs are set by <i>enzyme activity × donor availability</i>. The
            enzymes are shown in the Cell Biology tab; <b>these are the substrates</b> — the nucleotide-sugar donors fed
            by central metabolism (glucose/glutamine/asparagine and, for UDP-Gal, extracellular galactose). A fully-active
            transferase adds nothing if its donor pool is depleted, so watch how feed and metabolic state move these
            traces: they set the ceiling on galactosylation (UDP-Gal), sialylation (CMP-NeuAc, DO-gated), and
            fucosylation (GDP-Fuc). Values are normalized to the baseline operating point.
          </div>
        </div>
      </div>
    </div>
  );
}

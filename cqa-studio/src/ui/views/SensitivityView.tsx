import { useMemo, useState } from 'react';
import { sensitivity, interactions, DEFAULT_SPECS } from '../../model/analysis';
import type { CQAKey } from '../../model/analysis';
import type { Knobs } from '../../model/types';
import { KNOBS } from '../config';
import { Plot, PLOT_LAYOUT } from '../components';

/** Tornado sensitivity: rank knobs by the CQA swing they produce at ±frac. */
export function SensitivityView({ knobs }: { knobs: Knobs }) {
  const [cqa, setCqa] = useState<CQAKey>('galactosylation');
  const [frac, setFrac] = useState(15);

  const allKnobs = KNOBS.map((k) => k.key);
  const sens = useMemo(
    () => sensitivity(knobs, cqa, allKnobs, frac / 100),
    [knobs, cqa, frac, allKnobs],
  );
  const label = (k: string) => KNOBS.find((d) => d.key === k)?.label ?? k;

  // Two-factor interactions over the top-6 knobs by tornado range (keeps the grid fast + readable).
  const inter = useMemo(() => {
    const top = sens.slice(0, 6).map((s) => s.knob);
    return interactions(knobs, cqa, top, frac / 100);
  }, [knobs, cqa, frac, sens]);
  const interLabels = inter.keys.map((k) => label(k));

  return (
    <div className="view">
      <div className="controls-bar">
        <label>CQA
          <select value={cqa} onChange={(e) => setCqa(e.target.value as CQAKey)}>
            {DEFAULT_SPECS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <label>Perturbation
          <select value={frac} onChange={(e) => setFrac(Number(e.target.value))}>
            {[5, 10, 15, 25].map((v) => <option key={v} value={v}>±{v}%</option>)}
          </select>
        </label>
      </div>

      <div className="panel">
        <div className="panel-title">
          Tornado — knob impact on {DEFAULT_SPECS.find((s) => s.key === cqa)!.label} (±{frac}% each)
        </div>
        <Plot
          height={520}
          data={[
            { type: 'bar', orientation: 'h', name: `−${frac}%`,
              y: sens.map((s) => label(s.knob)), x: sens.map((s) => s.low),
              marker: { color: '#5aa9ff' } },
            { type: 'bar', orientation: 'h', name: `+${frac}%`,
              y: sens.map((s) => label(s.knob)), x: sens.map((s) => s.high),
              marker: { color: '#e8a04d' } },
          ]}
          layout={{ ...PLOT_LAYOUT, barmode: 'overlay',
            xaxis: { ...PLOT_LAYOUT.xaxis, title: `Δ ${DEFAULT_SPECS.find((s) => s.key === cqa)!.label} (percentage points)` },
            yaxis: { ...PLOT_LAYOUT.yaxis, automargin: true },
            legend: { orientation: 'h', y: 1.08, font: { color: '#5a6b83' } } }}
        />
        <div className="panel-note">
          Knobs are ranked by the CQA swing they produce. The longest bars are the dominant control levers for
          this attribute; near-zero bars are not actionable handles for it.
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">
          Two-factor interactions — {DEFAULT_SPECS.find((s) => s.key === cqa)!.label} (top 6 knobs, ±{frac}%)
        </div>
        <Plot
          height={420}
          data={[
            { type: 'heatmap', x: interLabels, y: interLabels, z: inter.matrix,
              colorscale: 'RdBu', zmid: 0,
              colorbar: { title: 'interaction (pp)', titlefont: { color: '#5a6b83' }, tickfont: { color: '#5a6b83' } } },
          ]}
          layout={{ ...PLOT_LAYOUT,
            xaxis: { ...PLOT_LAYOUT.xaxis, automargin: true },
            yaxis: { ...PLOT_LAYOUT.yaxis, automargin: true } }}
        />
        <div className="panel-note">
          Off-diagonal cells are the <b>non-additive</b> part of two knobs' combined effect (mixed second difference,
          in percentage points). Near-zero (pale) = the two act independently, so you can tune them separately. Strong
          colour = <b>coupled CPPs</b> — their joint effect isn't the sum of the singles, so a one-factor-at-a-time
          sweep will mislead.
          {inter.pairs[0] && Math.abs(inter.pairs[0].value) > 0.05 && (
            <> Strongest here: <b>{label(inter.pairs[0].a)} × {label(inter.pairs[0].b)}</b>
              {' '}({inter.pairs[0].value >= 0 ? '+' : ''}{inter.pairs[0].value.toFixed(2)} pp).</>
          )}
        </div>
      </div>
    </div>
  );
}

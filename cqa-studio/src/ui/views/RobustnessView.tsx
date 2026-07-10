import { useMemo, useState } from 'react';
import { monteCarlo, DEFAULT_SPECS } from '../../model/analysis';
import type { CQAKey } from '../../model/analysis';
import type { Knobs } from '../../model/types';
import { KNOBS } from '../config';
import { Plot, PLOT_LAYOUT } from '../components';

const CQA_COLOR: Record<string, string> = {
  high_mannose: '#e8a04d', afucosylation: '#5aa9ff', galactosylation: '#7fd0a8',
  sialylation: '#d8b6e0', G0F: '#f2c14e',
};

/** Monte Carlo robustness: apply Gaussian CV to every knob, report CQA distributions + Cpk. */
export function RobustnessView({ knobs }: { knobs: Knobs }) {
  const [cv, setCv] = useState(5);   // percent CV on every knob
  const [n, setN] = useState(500);

  const mc = useMemo(() => {
    const cvPct = Object.fromEntries(KNOBS.map((k) => [k.key, cv])) as Record<keyof Knobs, number>;
    return monteCarlo(knobs, cvPct, DEFAULT_SPECS, n);
  }, [knobs, cv, n]);

  return (
    <div className="view">
      <div className="controls-bar">
        <label>Input CV (all knobs)
          <select value={cv} onChange={(e) => setCv(Number(e.target.value))}>
            {[2, 5, 10, 15].map((v) => <option key={v} value={v}>±{v}%</option>)}
          </select>
        </label>
        <label>Samples
          <select value={n} onChange={(e) => setN(Number(e.target.value))}>
            {[200, 500, 1000, 2000].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
      </div>

      <div className="cqa-row">
        {DEFAULT_SPECS.map((s) => {
          const st = mc.stats[s.key];
          const cpkClass = st.cpk >= 1.33 ? 'ok' : st.cpk >= 1.0 ? 'warn' : 'bad';
          return (
            <div className="cqa-card" key={s.key}>
              <div className="cqa-label">{s.label}</div>
              <div className="cqa-value">{st.mean.toFixed(1)}<span className="cqa-unit">%</span></div>
              <div className={`cqa-spec ${cpkClass}`}>Cpk {st.cpk.toFixed(2)}</div>
              <div className="cqa-sub">{st.inSpecPct.toFixed(1)}% in spec · SD {st.sd.toFixed(2)}</div>
            </div>
          );
        })}
      </div>

      <div className="panel-grid">
        {DEFAULT_SPECS.map((s) => (
          <div className="panel" key={s.key}>
            <div className="panel-title">{s.label} distribution — spec {s.lo}–{s.hi}%</div>
            <Plot
              height={240}
              data={[
                { type: 'histogram', x: mc.samples[s.key as CQAKey], marker: { color: CQA_COLOR[s.key] },
                  opacity: 0.85, nbinsx: 40 },
              ]}
              layout={{ ...PLOT_LAYOUT,
                xaxis: { ...PLOT_LAYOUT.xaxis, title: `${s.label} (%)` },
                yaxis: { ...PLOT_LAYOUT.yaxis, title: 'count' },
                shapes: [
                  { type: 'line', x0: s.lo, x1: s.lo, yref: 'paper', y0: 0, y1: 1, line: { color: '#e8685f', width: 2, dash: 'dash' } },
                  { type: 'line', x0: s.hi, x1: s.hi, yref: 'paper', y0: 0, y1: 1, line: { color: '#e8685f', width: 2, dash: 'dash' } },
                ] }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

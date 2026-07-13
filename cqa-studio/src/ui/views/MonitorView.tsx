import { useState, useMemo } from 'react';
import { monitor } from '../../model/monitor';
import type { Measurement } from '../../model/monitor';
import { Plot, PLOT_LAYOUT } from '../components';
import type { Knobs } from '../../model/types';

/**
 * Batch Monitor — the digital-twin view. Anchor the twin to a running batch by entering
 * the measurements taken so far; it shows plan-vs-actual, re-forecasts to harvest, and
 * raises a deviation alert with a suggested corrective move.
 */
export function MonitorView({ knobs }: { knobs: Knobs }) {
  const [day, setDay] = useState(7);
  const [vcd, setVcd] = useState<string>('');
  const [glc, setGlc] = useState<string>('');
  const [pco2, setPco2] = useState<string>('');
  const [gal, setGal] = useState<string>('');

  const meas: Measurement = {
    day,
    VCD: vcd === '' ? undefined : parseFloat(vcd),
    Glc: glc === '' ? undefined : parseFloat(glc),
    pCO2: pco2 === '' ? undefined : parseFloat(pco2),
    galactosylation: gal === '' ? undefined : parseFloat(gal),
  };
  const r = useMemo(() => monitor(knobs, meas, 13),
    [knobs, day, vcd, glc, pco2, gal]);

  const nomAt = (traj: number[]) => {
    let bi = 0, bd = Infinity;
    r.t.forEach((t, i) => { const d = Math.abs(t - day); if (d < bd) { bd = d; bi = i; } });
    return traj[bi];
  };

  // Display everything in culture HOURS. The model works in days internally (r.t, day),
  // so convert only at the plot/label boundary — the assimilation math is unchanged.
  const th = r.t.map((d) => d * 24);
  const dayH = day * 24;

  return (
    <div className="view mon">
      <div className="bio-legend">
        <span><b>Digital twin — live batch monitor.</b> This is what makes it a twin rather than a
        simulator: enter the offline samples taken from a <i>running</i> batch, and the model shows how
        far reality is from plan, re-forecasts the harvest CQA through your measurements, and flags a
        corrective move if the batch is drifting out of spec. Placeholders show the plan value at the
        selected day — overwrite with what you measured.</span>
      </div>

      <div className="mon-grid">
        <div className="panel mon-input">
          <div className="panel-title">Current batch reading</div>
          <label className="opt-row"><span>cell culture duration (h)</span>
            <input type="number" min={24} max={312} step={24} value={dayH}
              onChange={(e) => setDay(Math.max(1, Math.round((parseInt(e.target.value) || 24) / 24)))} />
          </label>
          <label className="opt-row"><span>VCD (1e6/mL)</span>
            <input type="number" step="0.1" placeholder={nomAt(r.nominal.Xv).toFixed(1)}
              value={vcd} onChange={(e) => setVcd(e.target.value)} />
          </label>
          <label className="opt-row"><span>glucose (g/L)</span>
            <input type="number" step="0.1" placeholder={nomAt(r.nominal.Glc).toFixed(1)}
              value={glc} onChange={(e) => setGlc(e.target.value)} />
          </label>
          <label className="opt-row"><span>pCO₂ (mmHg)</span>
            <input type="number" step="1" placeholder={nomAt(r.nominal.pCO2).toFixed(0)}
              value={pco2} onChange={(e) => setPco2(e.target.value)} />
          </label>
          <label className="opt-row"><span>galactosylation (%)</span>
            <input type="number" step="0.5" placeholder={nomAt(r.nominal.cqaT.galactosylation).toFixed(1)}
              value={gal} onChange={(e) => setGal(e.target.value)} />
          </label>
          <div className="mon-hint">Leave a field blank to trust the plan for that measurement.</div>
        </div>

        <div className="panel mon-status">
          <div className="panel-title">Forecast to harvest</div>
          <div className={`mon-verdict ${r.onTrack ? 'ok' : 'bad'}`}>
            {r.onTrack ? '● On track' : '▲ Deviation — action recommended'}
          </div>
          <div className="mon-forecast">
            <div className="mon-fc-row">
              <span>Plan harvest galactosylation</span><b>{r.nominalGal.toFixed(1)}%</b>
            </div>
            <div className="mon-fc-row">
              <span>Forecast (with your data)</span>
              <b className={r.onTrack ? '' : 'bad'}>{r.forecastGal.toFixed(1)}%</b>
            </div>
          </div>
          <div className="mon-residuals">
            {Object.entries(r.residuals).map(([k, v]) => (
              <div key={k} className="mon-res">
                <span>{k}</span>
                <span>plan {v.pred.toFixed(1)} · meas {v.meas.toFixed(1)} ·
                  <b className={Math.abs(v.resid) > 0.01 ? 'bad' : ''}> Δ{v.resid > 0 ? '+' : ''}{v.resid.toFixed(1)}</b>
                </span>
              </div>
            ))}
            {Object.keys(r.residuals).length === 0 && <div className="mon-res"><span>No measurements entered — showing plan.</span></div>}
          </div>
          <div className="mon-alerts">
            {r.alerts.map((a, i) => (
              <div key={i} className={`mon-alert ${r.onTrack ? 'ok' : 'warn'}`}>{a}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Plan vs. corrected forecast</div>
        <Plot
          data={[
            { x: th, y: r.nominal.Xv, name: 'VCD plan', line: { color: '#93a1b5', dash: 'dot' } },
            { x: th, y: r.VCD, name: 'VCD forecast', line: { color: '#2563eb' } },
          ]}
          layout={{ ...PLOT_LAYOUT, height: 240,
            xaxis: { ...PLOT_LAYOUT.xaxis, title: 'Cell culture duration (h)' },
            yaxis: { ...PLOT_LAYOUT.yaxis, title: 'VCD (1e6/mL)' },
            shapes: [{ type: 'line', x0: dayH, x1: dayH, y0: 0, y1: 1, yref: 'paper',
              line: { color: '#0ea5a4', width: 1.5, dash: 'dash' } }] }}
        />
        <Plot
          data={[
            { x: th, y: r.nominal.cqaT.galactosylation, name: 'Galactosylation plan', line: { color: '#93a1b5', dash: 'dot' } },
            { x: th, y: r.galactosylation, name: 'Galactosylation forecast', line: { color: '#0ea5a4' } },
          ]}
          layout={{ ...PLOT_LAYOUT, height: 240,
            xaxis: { ...PLOT_LAYOUT.xaxis, title: 'Cell culture duration (h)' },
            yaxis: { ...PLOT_LAYOUT.yaxis, title: 'Galactosylation (%)' },
            shapes: [{ type: 'line', x0: dayH, x1: dayH, y0: 0, y1: 1, yref: 'paper',
              line: { color: '#0ea5a4', width: 1.5, dash: 'dash' } }] }}
        />
        <div className="panel-note">Dotted = plan (no data). Solid = forecast after assimilating your
          measurements. Vertical line = today. The forecast carries the measured offset forward — a
          measurement update, not a re-fit of the mechanism (that is the recalibrate skill's job).</div>
      </div>

      {Object.keys(r.residuals).length > 0 && (
        <div className="panel">
          <div className="panel-title">Assimilation bias — measured − predicted (at day {day})</div>
          <Plot
            data={[{
              type: 'bar', orientation: 'h',
              y: Object.keys(r.residuals),
              x: Object.values(r.residuals).map((v) => v.resid),
              marker: { color: Object.values(r.residuals).map((v) => (v.resid >= 0 ? '#2563eb' : '#e8685f')) },
              text: Object.values(r.residuals).map((v) => `${v.resid >= 0 ? '+' : ''}${v.resid.toFixed(2)}`),
              textposition: 'outside',
            }]}
            layout={{ ...PLOT_LAYOUT, height: 200,
              xaxis: { ...PLOT_LAYOUT.xaxis, title: 'residual (measured − predicted)', zeroline: true, zerolinecolor: '#12161d' },
              yaxis: { ...PLOT_LAYOUT.yaxis, automargin: true },
              shapes: [{ type: 'line', x0: 0, x1: 0, y0: 0, y1: 1, yref: 'paper', line: { color: '#12161d', width: 1.5 } }] }}
          />
          <div className="panel-note">Each bar is how far a measured channel sits from the model's prediction at
            today. <b>Blue = above plan, red = below.</b> A non-zero bias is what the twin carries forward into the
            harvest forecast — a pCO₂ residual propagates through the model's <i>own</i> (small, buffered)
            pCO₂→galactosylation slope, not a hard-coded one. Bars near zero mean the batch is tracking the model.</div>
        </div>
      )}
    </div>
  );
}

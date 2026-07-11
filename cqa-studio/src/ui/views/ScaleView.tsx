import { simulateKnobs, defaultKnobs } from '../../model/engine';
import type { Knobs } from '../../model/types';
import { SCALE_PRESETS } from '../config';
import { Plot } from '../components';

/**
 * Scale comparison — lumped, scale-aware. Each scale is represented by an effective
 * kLa_CO2 (CO₂-stripping efficiency), the dominant documented scale-up effect on Fc
 * glycosylation. The honest result: pCO₂ rises with scale, titer drops, but the glycan
 * is robust (consistent with the published <5% pCO₂/pH/DO ceiling). This is a well-mixed
 * model — it does not resolve spatial gradients (that needs CFD/compartment coupling).
 */
export function ScaleView({ knobs }: { knobs: Knobs }) {
  const rows = SCALE_PRESETS.map((p) => {
    const k = { ...defaultKnobs(), ...knobs, ...p.knobs } as Knobs;
    const r = simulateKnobs(k, 13);
    return { name: p.name, desc: p.desc, kla: (p.knobs as any).kLa_CO2 as number,
      pCO2max: r.pCO2max, gal: r.harvest.galactosylation, sia: r.harvest.sialylation,
      hm: r.harvest.high_mannose, titer: r.titer };
  });
  const base = rows[0];
  const names = rows.map((r) => r.name);

  return (
    <div className="view scale">
      <div className="bio-legend">
        <span><b>Does the glycan hold across scale?</b> Yes — the scaling variable here is <b>effective CO₂-stripping
        (kLa_CO2)</b>, and <b>pCO₂max is the <i>result</i></b>, not an input. Larger vessels strip CO₂ less efficiently
        (lower kLa_CO2), so pCO₂ accumulates — that rise is what you read in the table. This is the dominant documented
        scale-up effect on Fc glycosylation. The model is <b>well-mixed</b>: it captures the average pCO₂ shift with
        scale, not spatial gradients (that would need CFD/compartment coupling).</span>
      </div>

      <div className="mol-grid">
        <div className="panel">
          <div className="panel-title">Predicted shift · bench → manufacturing</div>
          <table className="scale-tbl">
            <thead><tr><th>Scale</th><th>kLa_CO2</th><th>pCO₂max</th><th>Galactosylation</th><th>Sialylation</th><th>Titer</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td><b>{r.name}</b><div className="scale-desc">{r.desc}</div></td>
                  <td className="gov-mono">{r.kla.toFixed(2)}</td>
                  <td className="gov-mono">{r.pCO2max.toFixed(0)}</td>
                  <td className="gov-mono">{r.gal.toFixed(1)}%<span className="scale-delta">{fmtD(r.gal - base.gal)}</span></td>
                  <td className="gov-mono">{r.sia.toFixed(1)}%</td>
                  <td className="gov-mono">{r.titer.toFixed(0)}<span className="scale-delta">{fmtPct(r.titer, base.titer)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mol-note">
            <b>Read this carefully:</b> as scale increases, pCO₂ rises ({base.pCO2max.toFixed(0)}→{rows[rows.length - 1].pCO2max.toFixed(0)} mmHg)
            and <b>titer drops ({fmtPct(rows[rows.length - 1].titer, base.titer)})</b> — but galactosylation moves only
            {' '}{Math.abs(rows[rows.length - 1].gal - base.gal).toFixed(1)}%. The glycan is <b>robust to scale</b>, consistent with the
            published pCO₂/pH/DO effect ceiling (&lt;5%). The scale risk here is productivity, not glycan quality.
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Scale sweep</div>
          <Plot height={230}
            data={[{ x: names, y: rows.map((r) => r.pCO2max), type: 'bar', name: 'pCO₂max (mmHg)', marker: { color: '#b45309' } }]}
            layout={{ yaxis: { title: 'pCO₂max (mmHg)' } }} />
          <Plot height={230}
            data={[
              { x: names, y: rows.map((r) => r.gal), type: 'bar', name: 'Galactosylation (%)', marker: { color: '#eab308' } },
              { x: names, y: rows.map((r) => r.titer), type: 'scatter', yaxis: 'y2', name: 'Titer (mg/L)', line: { color: '#0f6e63' } },
            ]}
            layout={{ yaxis: { title: 'Galactosylation (%)' },
              yaxis2: { title: 'Titer (mg/L)', overlaying: 'y', side: 'right', showgrid: false } }} />
          <div className="mol-note">Galactosylation bars stay flat; titer (teal) falls. The scale-up decision the tool
            supports: hold pCO₂ with stripping/agitation to protect <i>titer</i>; the glycan is not the vulnerable attribute here.</div>
        </div>
      </div>

      <div className="panel guide-span" style={{ marginTop: 12 }}>
        <div className="panel-title">Gas strategy — why "kLa" is not one number</div>
        <p className="prov-note">Scale-up for glycan quality is a <b>CO₂-stripping problem disguised as an oxygen-transfer
        problem.</b> O₂ and CO₂ have <i>separate</i> transfer coefficients that scale differently — holding DO does not
        guarantee you are holding pCO₂, and pCO₂ (not O₂) is the scale-relevant Golgi gas. Its <i>net</i> effect on harvest
        galactosylation is small (buffered by the growth–residence offset); it surfaces mainly in titer and pH-sensitive dynamics.</p>
        <table className="scale-tbl">
          <thead><tr><th>Transfer process</th><th>Direction</th><th>Driven by</th><th>Scale-up behaviour</th><th>Glycan relevance</th></tr></thead>
          <tbody>
            <tr><td><b>kLa · O₂</b> (supply)</td><td>into broth</td><td>sparging + agitation (P/V, vs)</td>
              <td>O₂ is sparingly soluble → rate-limiting supply at high density; usually <i>maintainable</i> by sparging harder</td>
              <td>indirect — low DO trims sialylation (energy)</td></tr>
            <tr><td><b>kLa · CO₂</b> (stripping)</td><td>out of broth</td><td>total gas throughput carrying CO₂ away</td>
              <td>CO₂ is highly soluble and cell-produced → removal-limited; <b>fails first at large scale</b> (tall column, low surface:volume, sparge capped by shear/foam)</td>
              <td>the scale-relevant Golgi gas (pCO₂ → carbonic acid → lumen pH), but <b>net harvest galactosylation is buffered</b> — slower growth lengthens Golgi residence and offsets the pH drop; the cost shows up in <b>titer</b> and pH-sensitive dynamics</td></tr>
            <tr><td><b>Sparged (bottom) gas</b></td><td>both</td><td>rising bubbles, high interfacial area</td>
              <td>high kLa for O₂ <i>and</i> CO₂ — but foam/shear cap the rate; micro-spargers strip CO₂ <i>poorly</i> (tiny bubbles saturate)</td>
              <td>coarser bubbles strip CO₂ better; a real tradeoff vs O₂ supply</td></tr>
            <tr><td><b>Headspace overlay</b></td><td>both</td><td>gas swept over surface</td>
              <td>low kLa (small surface:volume) — negligible CO₂ stripping at large scale</td>
              <td>minor at scale; matters most in small vessels</td></tr>
          </tbody>
        </table>
        <p className="prov-note"><b>The asymmetry:</b> at 2000 L you often have <i>enough</i> O₂ kLa but <i>insufficient</i>
        CO₂ stripping — so DO holds while pCO₂ climbs to 80–150 mmHg, acidifying the medium and Golgi. That primarily costs
        <b>titer</b> and stresses pH control; harvest galactosylation stays robust (the growth–residence offset), so
        galactosylation control lives in <b>clone (B4GALT1) and media (Mn²⁺/galactose)</b>. The presets vary
        <code>kLa_CO2</code> because it is the gas that actually changes with scale.</p>
        <div className="panel-title" style={{ marginTop: 10 }}>Five levers for successful scale-up with good glycosylation</div>
        <ul className="guide-list">
          <li><b>Control pCO₂ directly, not just DO</b> — match effective CO₂ removal across scale, not only oxygen supply.</li>
          <li><b>Tune the sparger for stripping</b> — coarser bubbles / dedicated strip-gas flow strip CO₂ better; micro-spargers maximise O₂ kLa but trap CO₂.</li>
          <li><b>Manage the pH↔base↔osmolality coupling</b> — high pCO₂ drops pH → base addition → osmolality spikes; use a CO₂-aware pH deadband instead of fighting it.</li>
          <li><b>Compensate with temperature / Mn²⁺ / galactose</b> — if pCO₂ can't be fully held, a mild temp downshift (longer Golgi residence) or Mn²⁺/galactose feed recovers galactosylation. Test it in the Control and Cell Biology tabs.</li>
          <li><b>Make the scale-down model reproduce the large-scale pCO₂ profile</b> — not just DO — or process development misses the real stressor.</li>
        </ul>
        <p className="prov-note">Spatially, large vessels have CO₂-rich zones near the sparger and pH gradients cells
        circulate through — the well-mixed model captures the <i>average</i> pCO₂ shift, not the field. Resolving that
        distribution is where CFD/compartment coupling extends this tool.</p>
      </div>
    </div>
  );
}

function fmtD(d: number): string { return ` (${d >= 0 ? '+' : ''}${d.toFixed(1)})`; }
function fmtPct(v: number, b: number): string { const p = (v - b) / b * 100; return ` (${p >= 0 ? '+' : ''}${p.toFixed(0)}%)`; }

import { useMemo, useState } from 'react';
import { designSpace, DEFAULT_SPECS } from '../../model/analysis';
import type { CQAKey, KnobKey } from '../../model/analysis';
import type { Knobs } from '../../model/types';
import { KNOBS } from '../config';
import { Plot, PLOT_LAYOUT } from '../components';

/** ICH Q8 2-D design-space explorer: sweep two knobs, contour a CQA, shade the spec-compliant region. */
export function DesignSpaceView({ knobs }: { knobs: Knobs }) {
  const [xk, setXk] = useState<KnobKey>('Mn');
  const [yk, setYk] = useState<KnobKey>('Fgal');
  const [cqa, setCqa] = useState<CQAKey>('galactosylation');
  const [n, setN] = useState(21);

  const xDef = KNOBS.find((k) => k.key === xk)!;
  const yDef = KNOBS.find((k) => k.key === yk)!;
  const spec = DEFAULT_SPECS.find((s) => s.key === cqa)!;

  const ds = useMemo(
    () => designSpace(knobs, xk, [xDef.min, xDef.max], yk, [yDef.min, yDef.max], cqa, n, n),
    [knobs, xk, yk, cqa, n, xDef, yDef],
  );

  // spec-compliant mask as an overlay contour (PAR = proven acceptable range edge)
  const mask = ds.z.map((row) => row.map((v) => (v >= spec.lo && v <= spec.hi ? 1 : 0)));

  // NOR (Normal Operating Range): a tight ±band around the current knob setpoints, clamped to axis range.
  const norFrac = 0.10;
  const cx = (knobs as any)[xk] as number, cy = (knobs as any)[yk] as number;
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const norX0 = clamp(cx * (1 - norFrac), xDef.min, xDef.max), norX1 = clamp(cx * (1 + norFrac), xDef.min, xDef.max);
  const norY0 = clamp(cy * (1 - norFrac), yDef.min, yDef.max), norY1 = clamp(cy * (1 + norFrac), yDef.min, yDef.max);

  return (
    <div className="view">
      <div className="controls-bar">
        <label>X axis
          <select value={xk} onChange={(e) => setXk(e.target.value as KnobKey)}>
            {KNOBS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </label>
        <label>Y axis
          <select value={yk} onChange={(e) => setYk(e.target.value as KnobKey)}>
            {KNOBS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </label>
        <label>CQA
          <select value={cqa} onChange={(e) => setCqa(e.target.value as CQAKey)}>
            {DEFAULT_SPECS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <label>Grid
          <select value={n} onChange={(e) => setN(Number(e.target.value))}>
            {[15, 21, 31, 41].map((v) => <option key={v} value={v}>{v}×{v}</option>)}
          </select>
        </label>
      </div>

      <div className="panel">
        <div className="panel-title">
          {spec.label} across {xDef.label} × {yDef.label} — spec window {spec.lo}–{spec.hi}%
        </div>
        <Plot
          height={520}
          data={[
            { type: 'contour', x: ds.xs, y: ds.ys, z: ds.z, colorscale: 'Viridis',
              colorbar: { title: `${spec.label} (%)`, titlefont: { color: '#5a6b83' }, tickfont: { color: '#5a6b83' } },
              contours: { coloring: 'heatmap' } },
            { type: 'contour', x: ds.xs, y: ds.ys, z: mask, showscale: false,
              contours: { start: 0.5, end: 0.5, size: 1, coloring: 'lines' },
              line: { color: '#ffffff', width: 3 }, name: 'spec edge' },
          ]}
          layout={{ ...PLOT_LAYOUT,
            xaxis: { ...PLOT_LAYOUT.xaxis, title: `${xDef.label} ${xDef.unit ?? ''}` },
            yaxis: { ...PLOT_LAYOUT.yaxis, title: `${yDef.label} ${yDef.unit ?? ''}` },
            shapes: [
              // NOR: normal operating range box around the current setpoint
              { type: 'rect', x0: norX0, x1: norX1, y0: norY0, y1: norY1,
                line: { color: '#12161d', width: 1.6 }, fillcolor: '#12161d10' },
            ],
            annotations: [
              { x: (norX0 + norX1) / 2, y: norY1, text: 'NOR', showarrow: false,
                yshift: 9, font: { size: 11, color: '#12161d' } },
              { x: (norX0 + norX1) / 2, y: cy, text: '● setpoint', showarrow: false,
                font: { size: 9, color: '#12161d' } },
            ] }}
        />
        <div className="panel-note">
          <b>PAR (proven acceptable range)</b> — the white contour: everywhere the CQA meets the {spec.lo}–{spec.hi}%
          window; this is the ICH Q8 <i>design space</i>. <b>NOR (normal operating range)</b> — the dark box: the tight
          ±{(norFrac * 100).toFixed(0)}% band you actually run around the setpoint. A robust process keeps the NOR
          fully <i>inside</i> the PAR, with margin on every edge — if the NOR box touches or crosses the white
          boundary, normal variation can push a batch out of spec.
        </div>
      </div>
    </div>
  );
}

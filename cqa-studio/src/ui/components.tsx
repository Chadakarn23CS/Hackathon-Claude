/** Reusable presentational components. */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Plotly from 'plotly.js-dist-min';
import type { KnobDef } from './config';

export const PLOT_LAYOUT: Partial<Plotly.Layout> = {
  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
  font: { color: '#16202e', family: 'Inter, system-ui, sans-serif', size: 11 },
  margin: { l: 60, r: 18, t: 30, b: 78 },
  xaxis: { gridcolor: '#eef2f8', zerolinecolor: '#e2e8f2', linecolor: '#cbd5e6', tickfont: { color: '#5a6b83' },
    automargin: true, title: { standoff: 12 } },
  yaxis: { gridcolor: '#eef2f8', zerolinecolor: '#e2e8f2', linecolor: '#cbd5e6', tickfont: { color: '#5a6b83' },
    automargin: true, title: { standoff: 10 } },
  legend: { orientation: 'h', y: -0.42, yanchor: 'top', font: { size: 10, color: '#5a6b83' } },
  hovermode: 'closest',
};
// Show a minimal modebar: keep only the PNG snapshot button (hover to reveal),
// export at 2× for a crisp figure, and drop the Plotly logo + zoom/pan clutter
// so every chart can be saved as a .png without the toolbar getting in the way.
const CONFIG: Partial<Plotly.Config> = {
  responsive: true,
  displaylogo: false,
  displayModeBar: 'hover',
  modeBarButtonsToRemove: [
    'zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d',
    'autoScale2d', 'resetScale2d', 'toggleSpikelines',
    'hoverClosestCartesian', 'hoverCompareCartesian',
  ],
  toImageButtonOptions: { format: 'png', filename: 'glycotwin_chart', scale: 2 },
};

export function Plot({ data, layout, height = 260 }: {
  data: Plotly.Data[]; layout?: Partial<Plotly.Layout>; height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    // Deep-merge axis objects so per-plot layouts (which usually set only a title)
    // inherit the shared axis styling AND automargin, instead of replacing it.
    const L = layout ?? {};
    const hasY2 = !!(L as any).yaxis2; // a right-side second axis needs room on the right
    const merged: Partial<Plotly.Layout> = {
      ...PLOT_LAYOUT, ...L,
      xaxis: { ...PLOT_LAYOUT.xaxis, ...(L as any).xaxis },
      yaxis: { ...PLOT_LAYOUT.yaxis, ...(L as any).yaxis },
      // widen right margin + automargin when a y2 axis is present so its title never clips
      margin: { ...PLOT_LAYOUT.margin, ...(hasY2 ? { r: 62 } : {}), ...(L as any).margin },
      ...(hasY2 ? { yaxis2: { automargin: true, ...(L as any).yaxis2 } } : {}),
      height,
    };
    Plotly.react(ref.current, data, merged, CONFIG);
  }, [data, layout, height]);
  // Keep the plot sized to its container even when width changes *after* mount
  // (mobile sidebar collapse, orientation change, tab switch) — responsive:true
  // only reacts to window resize, which those don't always fire.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { try { Plotly.Plots.resize(el); } catch { /* not plotted yet */ } });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => { if (ref.current) Plotly.purge(ref.current); }, []);
  return <div className="chart" ref={ref} style={{ height }} />;
}

export function Info({ text }: { text: string }) {
  return <span className="info">i<span className="tip">{text}</span></span>;
}

/** A sidebar group with a clickable header that shows/hides its body. */
export function CollapsibleGroup({ label, color, defaultOpen = true, children }: {
  label: string; color?: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="group">
      <button className="glabel gtoggle" style={color ? { color } : undefined}
        aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={`chev ${open ? 'open' : ''}`} aria-hidden>▸</span>{label}
      </button>
      {open && <div className="gbody">{children}</div>}
    </div>
  );
}

export function Slider({ def, value, onChange }: {
  def: KnobDef; value: number; onChange: (v: number) => void;
}) {
  const fmt = def.fmt ?? ((v: number) => String(v));
  return (
    <div className="ctrl">
      <div className="row">
        <span className="name">{def.label}{def.info && <Info text={def.info} />}</span>
        <span className="val">{fmt(value)}{def.unit && <span className="unit">{def.unit}</span>}</span>
      </div>
      <input type="range" min={def.min} max={def.max} step={def.step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
      {def.hint && <div className="hint">{def.hint}</div>}
    </div>
  );
}

export function CQACard({ label, value, lo, hi, color }: {
  label: string; value: number; lo: number; hi: number; color: string;
}) {
  const pass = value >= lo && value <= hi;
  const scaleMax = Math.max(hi * 1.4, value * 1.1);
  const toPct = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%`;
  return (
    <div className={`card ${pass ? 'pass' : 'fail'}`}>
      <div className="flag" />
      <div className="cq">{label}</div>
      <div className="cv" style={{ color }}>{value.toFixed(1)}<span style={{ fontSize: 13, color: 'var(--faint)' }}>%</span></div>
      <div className="cs">spec {lo}–{hi}% · {pass ? 'in spec' : 'OUT'}</div>
      <div className="bar">
        <div className="spec" style={{ left: toPct(lo), width: `calc(${toPct(hi)} - ${toPct(lo)})` }} />
        <div className="fill" style={{ width: toPct(value), background: pass ? 'var(--good)' : 'var(--bad)' }} />
      </div>
    </div>
  );
}

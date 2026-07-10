import { useState, useRef, useEffect } from 'react';
import { bioView } from '../../model/engine';
import { Glycan } from '../glycan';
import { IGHG1, GLYCO_FEATURES, type GlycoFeature } from '../../model/domains';
import { DEFAULT_SPECS } from '../../model/analysis';
import { PDB_1HZH } from '../pdbData';
import type { Knobs } from '../../model/types';

declare global { interface Window { $3Dmol?: any; } }

/**
 * Molecule → antibody → CQA view. A Y-shaped IgG1 schematic with the Fc N-glycan
 * (Asn297, author-numbered 314 in PDB 1HZH) redrawing live from the model, plus an
 * on-demand 3D structure of a real intact IgG1 (PDB 1HZH) via 3Dmol.js.
 */
export function MoleculeView({ knobs }: { knobs: Knobs }) {
  const bv = bioView(knobs);
  const spec = (k: string) => { const s = DEFAULT_SPECS.find((d) => d.key === k)!; return [s.lo, s.hi] as [number, number]; };
  const [show3D, setShow3D] = useState(true);
  const [sel, setSel] = useState<GlycoFeature['key'] | null>(null);
  const selFeat = GLYCO_FEATURES.find((f) => f.key === sel) || null;

  return (
    <div className="view mol">
      <div className="bio-legend">
        <span><b>From molecule to quality attribute.</b> The product is a monoclonal IgG1 antibody. Every CQA this
        tool predicts is a property of the N-glycan on its Fc region (Asn297). Move any process knob and watch the
        glycan on this antibody — and its clinical function — change.</span>
      </div>

      <div className="mol-grid">
        {/* ---- Antibody schematic ---- */}
        <div className="panel">
          <div className="panel-title">Monoclonal IgG1 — the product molecule</div>
          <svg viewBox="0 0 420 360" width="100%" style={{ maxHeight: 380 }} role="img" aria-label="IgG1 antibody schematic">
            <defs>
              <linearGradient id="fabGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#dbe6fb" /><stop offset="1" stopColor="#c3d6f5" />
              </linearGradient>
              <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#e8eef8" /><stop offset="1" stopColor="#d3ddee" />
              </linearGradient>
            </defs>
            {/* Fab arms (Y upper) */}
            <g stroke="#5a7bb5" strokeWidth="1.2">
              <rect x="70" y="40" width="42" height="90" rx="18" fill="url(#fabGrad)" transform="rotate(-28 91 85)" />
              <rect x="308" y="40" width="42" height="90" rx="18" fill="url(#fabGrad)" transform="rotate(28 329 85)" />
              {/* light chains (outer tips) */}
              <rect x="70" y="34" width="20" height="46" rx="9" fill="#eaf1fc" transform="rotate(-28 80 57)" />
              <rect x="330" y="34" width="20" height="46" rx="9" fill="#eaf1fc" transform="rotate(28 340 57)" />
            </g>
            {/* hinge */}
            <path d="M180,150 L210,175 L240,150" fill="none" stroke="#5a7bb5" strokeWidth="3" />
            {/* Fc stem (Y lower) */}
            <rect x="188" y="172" width="44" height="96" rx="16" fill="url(#fcGrad)" stroke="#5a7bb5" strokeWidth="1.2" />
            {/* region labels */}
            <text x="60" y="30" className="svg-subtitle" textAnchor="middle">Fab</text>
            <text x="360" y="30" className="svg-subtitle" textAnchor="middle">Fab</text>
            <text x="118" y="150" className="svg-small" textAnchor="middle">antigen binding</text>
            <text x="210" y="286" className="svg-subtitle" textAnchor="middle">Fc</text>
            <text x="210" y="299" className="svg-small" textAnchor="middle">effector function</text>

            {/* glycosylation site marker on Fc */}
            <circle cx="232" cy="210" r="4" fill="#dc2626" />
            <line x1="236" y1="210" x2="286" y2="196" stroke="#c8623a" strokeWidth="1" strokeDasharray="3 3" />
            <text x="250" y="228" className="svg-tiny">Asn297 N-glycan</text>

            {/* the live glycan, rendered with the shared SNFG component, anchored right of the Fc */}
            <g transform="translate(286,150)">
              <foreignObject x="0" y="0" width="130" height="120">
                <div {...{ xmlns: 'http://www.w3.org/1999/xhtml' } as any}>
                  <Glycan dist={bv.glycan} width={130} height={110} />
                </div>
              </foreignObject>
            </g>
          </svg>
          <div className="mol-note">
            Four chains (2 heavy + 2 light) form the Y. The two <b>Fab</b> arms bind antigen; the <b>Fc</b> stem drives
            effector function — and carries the N-glycan the process controls.
          </div>
          <button className="btn" style={{ marginTop: 8 }} onClick={() => setShow3D((s) => !s)}>
            {show3D ? 'Hide' : 'Show'} real 3D structure (PDB 1HZH)
          </button>
          {show3D && <Mol3D />}

          {/* Real domain architecture from InterPro */}
          <div className="dom-strip">
            <div className="dom-strip-hd">Heavy-chain domain architecture
              <span className="dom-src">{IGHG1.source} · {IGHG1.interproEntry}</span></div>
            <svg viewBox={`0 0 ${IGHG1.length} 34`} width="100%" height="40" role="img" aria-label="IgG1 domain architecture">
              <line x1="0" y1="17" x2={IGHG1.length} y2="17" stroke="#cbd2dc" strokeWidth="1.5" />
              {IGHG1.domains.map((d) => (
                <g key={d.name}>
                  <rect x={d.start} y="7" width={d.end - d.start} height="20" rx="4"
                    fill={d.kind === 'glyco' ? '#0f6e63' : '#c3d0e2'}
                    stroke={d.kind === 'glyco' ? '#0b4f47' : '#93a1b5'} strokeWidth="1">
                    <title>{d.name} [{d.start}–{d.end}]: {d.note}</title>
                  </rect>
                  <text x={(d.start + d.end) / 2} y="21" textAnchor="middle"
                    fontSize="11" fill={d.kind === 'glyco' ? '#fff' : '#3a4658'} fontWeight="600">{d.name}</text>
                </g>
              ))}
              {/* Asn297 glyco-site marker on CH2 */}
              <circle cx={(IGHG1.domains[1].start + IGHG1.domains[1].end) / 2} cy="7" r="3.2" fill="#dc2626" />
            </svg>
            <div className="dom-note">The three C1-set Ig domains (CH1/CH2/CH3) are real InterPro annotations.
              <b> CH2 (teal)</b> carries the Asn297 N-glycan and is the FcγR/C1q effector surface — which is why every
              CQA here is a property of that one site.</div>
          </div>
        </div>

        {/* ---- CQA → clinical function ---- */}
        <div className="panel">
          <div className="panel-title">This glycan's quality attributes</div>
          <div className="mol-hint">Click a glycan feature to see its clinical function and the receptor it engages.</div>
          <div className="mol-cqa">
            {GLYCO_FEATURES.map((f) => {
              const v = (bv.harvest as unknown as Record<string, number>)[f.key];
              const [lo, hi] = spec(f.key);
              const on = sel === f.key;
              return (
                <button key={f.key} className={`cqa-btn ${on ? 'sel' : ''}`} onClick={() => setSel(on ? null : f.key)}
                  style={{ borderLeftColor: f.color }}>
                  <div className="cqa-btn-top"><SnfgGlyph symbol={f.symbol} color={f.color} />
                    <span className="cqa-btn-lbl">{f.label.replace(' (absence)', '')}</span></div>
                  <div className="cqa-btn-val" style={{ color: f.color }}>{v?.toFixed(1)}%</div>
                  <div className="cqa-btn-spec">spec {lo}–{hi}%</div>
                </button>
              );
            })}
          </div>

          {selFeat ? (
            <div className="mol-mech" style={{ borderLeftColor: selFeat.color }}>
              <div className="mol-mech-hd" style={{ color: selFeat.color }}>
                <SnfgGlyph symbol={selFeat.symbol} color={selFeat.color} size={18} /> {selFeat.label} → {selFeat.fn}</div>
              <div className="mol-mech-row"><span>Receptor / target</span><b>{selFeat.receptor}</b></div>
              <div className="mol-mech-body">{selFeat.direction}</div>
              <div className="mol-mech-live">Current value: <b>{((bv.harvest as unknown as Record<string, number>)[selFeat.key])?.toFixed(1)}%</b>
                {' '}— move a process knob and this changes, because the Golgi enzymes that build this feature respond to the microenvironment.</div>
            </div>
          ) : (
            <div className="mol-note">
              Dominant species now: <b>{dominantLabel(bv.glycan as unknown as Record<string, number>)}</b>. This is the single antibody molecule every other
              tab is ultimately describing — the bioreactor, Golgi and control views all converge on this glycan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** A single SNFG monosaccharide symbol (green circle = Man, yellow circle = Gal, red triangle = Fuc,
 * purple diamond = NeuAc, blue square = GlcNAc) — the standard glycan iconography. */
function SnfgGlyph({ symbol, color, size = 16 }: { symbol: string; color: string; size?: number }) {
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="snfg-glyph" aria-hidden="true">
      {symbol === 'circle' && <circle cx={c} cy={c} r={c - 2} fill={color} stroke="#12161d" strokeWidth="1" />}
      {symbol === 'square' && <rect x="2" y="2" width={size - 4} height={size - 4} fill={color} stroke="#12161d" strokeWidth="1" />}
      {symbol === 'triangle' && <path d={`M${c},2 L${size - 2},${size - 2} L2,${size - 2} Z`} fill={color} stroke="#12161d" strokeWidth="1" />}
      {symbol === 'diamond' && <path d={`M${c},2 L${size - 2},${c} L${c},${size - 2} L2,${c} Z`} fill={color} stroke="#12161d" strokeWidth="1" />}
    </svg>
  );
}

function dominantLabel(dist: Record<string, number>): string {
  let best = 'G0F', bv = -Infinity;
  Object.entries(dist).forEach(([k, v]) => { if (v > bv) { bv = v; best = k; } });
  return best;
}

/** Real 3D structure via 3Dmol.js (CDN loaded on demand; PDB text bundled offline). */
function Mol3D() {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('loading 3D engine…');
  useEffect(() => {
    let cancelled = false;
    const render = () => {
      if (cancelled || !ref.current || !window.$3Dmol) return;
      try {
        const v = window.$3Dmol.createViewer(ref.current, { backgroundColor: 'white' });
        v.addModel(PDB_1HZH, 'pdb');
        v.setStyle({}, { cartoon: { color: 'spectrum' } });
        // highlight the Fc N-glycan (het sugar residues) as sticks
        v.setStyle({ resn: ['NAG', 'BMA', 'MAN', 'GAL', 'FUC', 'SIA', 'NGA'] }, { stick: { colorscheme: 'yellowCarbon', radius: 0.3 } });
        v.zoomTo(); v.render(); setStatus('');
      } catch (e) { setStatus('3D render failed — the schematic above still reflects the model.'); }
    };
    if (window.$3Dmol) { render(); return; }
    const s = document.createElement('script');
    s.src = 'https://3Dmol.org/build/3Dmol-min.js';
    s.onload = render;
    s.onerror = () => setStatus('Could not load the 3D engine (offline). The schematic above is fully functional.');
    document.head.appendChild(s);
    return () => { cancelled = true; };
  }, []);
  return (
    <div style={{ marginTop: 8 }}>
      <div ref={ref} style={{ position: 'relative', width: '100%', height: 320, border: '1px solid var(--border)', borderRadius: 8 }} />
      {status && <div className="mol-note">{status}</div>}
      <div className="mol-note">Intact human IgG1 (PDB 1HZH). Ribbon = protein; yellow sticks = the Fc N-glycan (Asn297 / author-numbered 314).</div>
    </div>
  );
}

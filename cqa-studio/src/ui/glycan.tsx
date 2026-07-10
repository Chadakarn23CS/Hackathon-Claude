import type { GlycanDist } from '../model/types';

/**
 * Draw the dominant N-glycan structure in SNFG (Symbol Nomenclature for Glycans) monosaccharide symbols.
 * GlcNAc = blue square, Mannose = green circle, Galactose = yellow circle,
 * Fucose = red triangle, NeuAc (sialic acid) = purple diamond.
 * The structure shown is the single most abundant species in `dist`.
 */
const SNFG = {
  GlcNAc: '#2563eb', // blue square
  Man: '#16a34a',    // green circle
  Gal: '#eab308',    // yellow circle
  Fuc: '#dc2626',    // red triangle
  NeuAc: '#9333ea',  // purple diamond
};

function Sq({ x, y, c }: { x: number; y: number; c: string }) {
  return <rect x={x - 7} y={y - 7} width={14} height={14} fill={c} stroke="#0b1020" strokeWidth={0.6} />;
}
function Ci({ x, y, c }: { x: number; y: number; c: string }) {
  return <circle cx={x} cy={y} r={7.5} fill={c} stroke="#0b1020" strokeWidth={0.6} />;
}
function Tri({ x, y, c }: { x: number; y: number; c: string }) {
  return <path d={`M${x},${y - 8} L${x + 8},${y + 6} L${x - 8},${y + 6} Z`} fill={c} stroke="#0b1020" strokeWidth={0.6} />;
}
function Di({ x, y, c }: { x: number; y: number; c: string }) {
  return <path d={`M${x},${y - 8} L${x + 8},${y} L${x},${y + 8} L${x - 8},${y} Z`} fill={c} stroke="#0b1020" strokeWidth={0.6} />;
}
function Bond({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7b8aa3" strokeWidth={1.4} />;
}

function dominant(dist: GlycanDist): keyof GlycanDist {
  let best: keyof GlycanDist = 'G0F'; let bv = -1;
  (Object.keys(dist) as (keyof GlycanDist)[]).forEach((k) => { if (dist[k] > bv) { bv = dist[k]; best = k; } });
  return best;
}

// structure recipe per species: how many galactose/sialic acid arms, core fucose, high-mannose
function recipe(sp: keyof GlycanDist) {
  const s = String(sp);
  return {
    highMannose: s === 'Man5',
    fuc: s.includes('F'),
    gal: s.startsWith('G1') ? 1 : s.startsWith('G2') ? 2 : 0,
    sia: s.includes('S') ? (s.startsWith('G2') ? 2 : 1) : 0,
  };
}

export function Glycan({ dist, width = 300, height = 150 }: { dist: GlycanDist; width?: number; height?: number }) {
  const sp = dominant(dist);
  const r = recipe(sp);
  const pct = (dist[sp] * 100).toFixed(0);

  // layout: core from left, two antennae branching to upper/lower right
  const cx = 40, cy = height / 2;
  const dx = 34;
  // core: GlcNAc-GlcNAc-Man then branch to two Man
  const core = [
    { t: 'sq', x: cx, y: cy, c: SNFG.GlcNAc },              // reducing-end GlcNAc
    { t: 'sq', x: cx + dx, y: cy, c: SNFG.GlcNAc },
    { t: 'ci', x: cx + 2 * dx, y: cy, c: SNFG.Man },        // branching Man
  ];
  const branchY = [cy - 28, cy + 28];
  const els: JSX.Element[] = [];
  // core bonds
  els.push(<Bond key="b0" x1={core[0].x} y1={cy} x2={core[1].x} y2={cy} />);
  els.push(<Bond key="b1" x1={core[1].x} y1={cy} x2={core[2].x} y2={cy} />);

  if (r.highMannose) {
    // Man5: branch mannoses only
    branchY.forEach((by, i) => {
      els.push(<Bond key={`hb${i}`} x1={core[2].x} y1={cy} x2={core[2].x + dx} y2={by} />);
      els.push(<Ci key={`hm${i}`} x={core[2].x + dx} y={by} c={SNFG.Man} />);
      els.push(<Ci key={`hm2${i}`} x={core[2].x + 2 * dx} y={by} c={SNFG.Man} />);
      els.push(<Bond key={`hb2${i}`} x1={core[2].x + dx} y1={by} x2={core[2].x + 2 * dx} y2={by} />);
    });
  } else {
    // complex biantennary: each arm = Man-GlcNAc-(Gal)-(NeuAc)
    branchY.forEach((by, i) => {
      let x = core[2].x + dx;
      els.push(<Bond key={`br${i}`} x1={core[2].x} y1={cy} x2={x} y2={by} />);
      els.push(<Ci key={`am${i}`} x={x} y={by} c={SNFG.Man} />);
      els.push(<Bond key={`ab${i}`} x1={x} y1={by} x2={x + dx} y2={by} />);
      x += dx;
      els.push(<Sq key={`ag${i}`} x={x} y={by} c={SNFG.GlcNAc} />);
      if (r.gal > i) {
        els.push(<Bond key={`gb${i}`} x1={x} y1={by} x2={x + dx} y2={by} />);
        x += dx;
        els.push(<Ci key={`gal${i}`} x={x} y={by} c={SNFG.Gal} />);
        if (r.sia > i) {
          els.push(<Bond key={`sb${i}`} x1={x} y1={by} x2={x + dx} y2={by} />);
          x += dx;
          els.push(<Di key={`sia${i}`} x={x} y={by} c={SNFG.NeuAc} />);
        }
      }
    });
  }
  // core fucose (below reducing-end GlcNAc)
  if (r.fuc) {
    els.push(<Bond key="fb" x1={cx} y1={cy} x2={cx} y2={cy + 24} />);
    els.push(<Tri key="fuc" x={cx} y={cy + 26} c={SNFG.Fuc} />);
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxHeight: height }}>
        {els}
        {core.map((n, i) => (n.t === 'sq'
          ? <Sq key={`c${i}`} x={n.x} y={n.y} c={n.c} />
          : <Ci key={`c${i}`} x={n.x} y={n.y} c={n.c} />))}
      </svg>
      <div className="glycan-label"><b>{String(sp)}</b> — most abundant species, {pct}% of all glycans</div>
      <div className="snfg-key">
        <span><i style={{ background: SNFG.GlcNAc }} className="sq" />GlcNAc</span>
        <span><i style={{ background: SNFG.Man }} className="ci" />Man</span>
        <span><i style={{ background: SNFG.Gal }} className="ci" />Gal</span>
        <span><i style={{ background: SNFG.Fuc }} className="tri" />Fuc</span>
        <span><i style={{ background: SNFG.NeuAc }} className="di" />NeuAc</span>
      </div>
    </div>
  );
}

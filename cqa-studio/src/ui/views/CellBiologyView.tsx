import { useMemo } from 'react';
import { bioView } from '../../model/engine';
import type { Knobs } from '../../model/types';
import { Glycan } from '../glycan';

/** pH -> lumen colour: acidic (amber) to neutral (blue-green). */
function phColor(pH: number): string {
  const t = Math.max(0, Math.min(1, (pH - 6.0) / (7.0 - 6.0))); // 6.0..7.0
  // amber #d97706 -> teal #0ea5a4
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  const c1 = [217, 119, 6], c2 = [14, 165, 164];
  return `rgb(${lerp(c1[0], c2[0])},${lerp(c1[1], c2[1])},${lerp(c1[2], c2[2])})`;
}

const ENZ_COLOR: Record<string, string> = {
  MGAT: '#2563eb', FUT8: '#9333ea', B4GALT: '#0ea5a4', ST6GAL: '#d97706',
};

/** Interactive CHO cell-biology schematic: bioreactor -> cell -> Golgi enzymes -> glycan. */
export function CellBiologyView({ knobs }: { knobs: Knobs }) {
  const bv = useMemo(() => bioView(knobs), [knobs]);

  // Golgi cisternae positions (cis -> trans, left to right)
  const cisX = [290, 375, 460, 545];
  const enzOrder = ['MGAT', 'FUT8', 'B4GALT', 'ST6GAL'];
  const enzByKey = Object.fromEntries(bv.enzymes.map((e) => [e.key, e]));
  const lumen = phColor(bv.pHgolgi);

  return (
    <div className="view">
      <div className="bio-legend">
        <span><b>How to read this:</b> the N-glycan pathway runs <b>ER → cis-Golgi → trans-Golgi → secreted mAb</b>.
        Move any slider on the left — the Golgi lumen colour tracks pH, each enzyme station glows with its live
        activity, the nucleotide-sugar tanks show precursor supply, and the secreted antibody's glycan is redrawn
        from the model's harvest CQAs.</span>
      </div>

      <div className="panel bio-panel">
        <svg viewBox="0 0 820 470" width="100%" style={{ maxHeight: 520 }} role="img"
          aria-label="CHO cell glycosylation schematic">
          <defs>
            <linearGradient id="reactorGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eaf1fb" /><stop offset="100%" stopColor="#d7e5f8" />
            </linearGradient>
            <radialGradient id="cellGrad" cx="50%" cy="42%" r="65%">
              <stop offset="0%" stopColor="#fdfdff" /><stop offset="78%" stopColor="#eef3fa" /><stop offset="100%" stopColor="#e3ecf7" />
            </radialGradient>
            <radialGradient id="nucGrad" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#f6f2fb" /><stop offset="100%" stopColor="#e6e0f2" />
            </radialGradient>
            <marker id="arrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#93a1b5" />
            </marker>
          </defs>

          {/* ---- Bioreactor ---- */}
          <g>
            <rect x="24" y="70" width="150" height="300" rx="16" fill="url(#reactorGrad)"
              stroke="#c7d6ec" strokeWidth="1.5" />
            <text x="99" y="60" textAnchor="middle" className="svg-title">Bioreactor</text>
            {/* liquid + bubbles keyed to CO2 stripping */}
            <rect x="34" y="150" width="130" height="210" rx="10" fill="#dcebfb" opacity="0.7" />
            {[0, 1, 2, 3, 4].map((i) => (
              <circle key={i} cx={54 + i * 26} cy={340 - (i % 3) * 40} r={2.6 + (knobs.kLa_CO2 * 10)}
                fill="#9fc3ef" opacity={0.5 + knobs.kLa_CO2} />
            ))}
            <text x="99" y="120" textAnchor="middle" className="svg-metric">{bv.pCO2.toFixed(0)}</text>
            <text x="99" y="134" textAnchor="middle" className="svg-metriclbl">pCO₂ mmHg</text>
            <text x="99" y="352" textAnchor="middle" className="svg-small">VCD {bv.peakVCD.toFixed(0)}e6 · {bv.titer.toFixed(0)} mg/L</text>
          </g>
          <line x1="176" y1="220" x2="214" y2="220" stroke="#93a1b5" strokeWidth="1.6" markerEnd="url(#arrow)" />

          {/* ---- CHO cell ---- */}
          <g>
            {/* plasma membrane — organic blob outline with a double-membrane bilayer feel */}
            <ellipse cx="500" cy="235" rx="300" ry="205" fill="url(#cellGrad)" stroke="#9db6d8" strokeWidth="3" />
            <ellipse cx="500" cy="235" rx="293" ry="198" fill="none" stroke="#c7d6ec" strokeWidth="1.2" opacity="0.8" />
            <text x="500" y="52" textAnchor="middle" className="svg-title">CHO cell</text>
            {/* nucleus with nuclear envelope + nucleolus */}
            <ellipse cx="690" cy="150" rx="70" ry="52" fill="url(#nucGrad)" stroke="#b9a9d8" strokeWidth="1.8" />
            <ellipse cx="690" cy="150" rx="63" ry="45" fill="none" stroke="#cdc0e4" strokeWidth="0.9" opacity="0.7" />
            <circle cx="705" cy="158" r="13" fill="#d8cbec" opacity="0.85" />
            <text x="690" y="147" textAnchor="middle" className="svg-small">nucleus</text>
            <text x="690" y="162" textAnchor="middle" className="svg-tiny">FUT8 · B4GALT1 · ST6GAL1</text>
            <text x="690" y="175" textAnchor="middle" className="svg-tiny">(gene expression → Vmax)</text>

            {/* ---- Mitochondrion (energy / oxidative state) ---- */}
            {(() => {
              const mx = 660, my = 288, glow = 0.2 + 0.8 * bv.oxIndex;
              return (
                <g>
                  <ellipse cx={mx} cy={my} rx="52" ry="30" fill="#f9ede9"
                    stroke="#d99b7a" strokeWidth="1.4" opacity={0.55 + 0.45 * bv.oxIndex} />
                  {/* cristae, brightness = oxidative capacity */}
                  {[-30, -14, 2, 18, 34].map((dx, i) => (
                    <path key={i} d={`M${mx + dx},${my - 20} q 8,${my % 2 ? 20 : 20} 0,40`}
                      fill="none" stroke="#c8623a" strokeWidth="1.3" opacity={glow} />
                  ))}
                  <text x={mx} y={my - 38} textAnchor="middle" className="svg-subtitle">mitochondrion</text>
                  <text x={mx} y={my + 46} textAnchor="middle" className="svg-tiny">
                    oxidative {(bv.oxIndex * 100).toFixed(0)}% · DO {bv.DO.toFixed(0)}%</text>
                  <text x={mx} y={my + 57} textAnchor="middle" className="svg-tiny">
                    lactate {bv.lactate.toFixed(1)} g/L</text>
                  {/* oxidative energy feeds CMP-NeuAc synthesis (4th tank at x=620) */}
                  <line x1={mx - 10} y1={my + 24} x2="608" y2="360" stroke="#c8623a"
                    strokeWidth="1.2" strokeDasharray="3 3" opacity={0.4 + 0.5 * bv.oxIndex} markerEnd="url(#arrow)" />
                </g>
              );
            })()}

            {/* ---- Endoplasmic reticulum (N-glycosylation STARTS here) ---- */}
            <g>
              {/* rough-ER cisternae: a few stacked wavy ribbons */}
              {[0, 1, 2].map((i) => (
                <path key={i} d={`M312,${120 + i * 8} q 15,-5 30,0 q 15,5 30,0`}
                  fill="none" stroke="#7ea6c8" strokeWidth="2" opacity="0.7" />
              ))}
              <text x="357" y="106" textAnchor="middle" className="svg-subtitle">ER (rough)</text>
              <text x="357" y="152" textAnchor="middle" className="svg-tiny">precursor → Man₉₋₈</text>
              {/* flow ER -> cis-Golgi */}
              <line x1="330" y1="158" x2="298" y2="176" stroke="#7ea6c8" strokeWidth="1.2"
                strokeDasharray="3 3" markerEnd="url(#arrow)" opacity="0.75" />
            </g>

            {/* ---- Golgi stack ---- */}
            <text x="470" y="120" textAnchor="middle" className="svg-subtitle">Golgi apparatus</text>
            <text x="470" y="133" textAnchor="middle" className="svg-tiny">lumen pH {bv.pHgolgi.toFixed(2)} · transit τ {bv.tau.toFixed(0)} min</text>

            {cisX.map((x, i) => (
              <g key={i}>
                {/* cisterna disc, filled by lumen pH colour */}
                <ellipse cx={x} cy="235" rx="34" ry="66" fill={lumen} opacity="0.20"
                  stroke={lumen} strokeWidth="1.4" />
                {(() => {
                  const e = enzByKey[enzOrder[i]];
                  const glow = 0.25 + 0.75 * e.activity;
                  return (
                    <>
                      <circle cx={x} cy="235" r={11 + 9 * e.activity} fill={ENZ_COLOR[e.key]}
                        opacity={glow} />
                      <circle cx={x} cy="235" r="6" fill={ENZ_COLOR[e.key]} />
                      <text x={x} y="312" textAnchor="middle" className="svg-enz">{e.label}</text>
                      <text x={x} y="325" textAnchor="middle" className="svg-tiny">
                        {(e.activity * 100).toFixed(0)}% active</text>
                    </>
                  );
                })()}
              </g>
            ))}
            {/* cis->trans transit arrow through the stack */}
            <line x1="255" y1="168" x2="580" y2="168" stroke="#b9c6dc" strokeWidth="1.2"
              strokeDasharray="4 4" markerEnd="url(#arrow)" />
            <text x="278" y="160" className="svg-tiny">cis</text>
            <text x="560" y="160" className="svg-tiny">trans</text>

            {/* ---- Nucleotide-sugar supply tanks (inside the cytoplasm) ---- */}
            <text x="470" y="352" textAnchor="middle" className="svg-subtitle">Nucleotide-sugar pools (cytoplasm → Golgi)</text>
            {(['UDPGlcNAc', 'GDPFuc', 'UDPGal', 'CMPNeuAc'] as const).map((nsd, i) => {
              const v = (bv.pools as unknown as Record<string, number>)[nsd];
              const x = 392 + i * 72; const base = 398; const h = 32 * Math.max(0.05, Math.min(1.15, v));
              const col = ENZ_COLOR[enzOrder[i]];
              return (
                <g key={nsd as string}>
                  <rect x={x - 24} y={base - 40} width="48" height="40" rx="5" fill="#f1f4f9" stroke="#dde5f0" />
                  <rect x={x - 24} y={base - h} width="48" height={h} rx="5" fill={col} opacity="0.55" />
                  <text x={x} y="410" textAnchor="middle" className="svg-tiny">{nsd} {(v * 100).toFixed(0)}%</text>
                </g>
              );
            })}
          </g>

          {/* ---- Secreted antibody + glycan ---- */}
          <line x1="800" y1="300" x2="800" y2="300" stroke="none" />
        </svg>
      </div>

      {/* Glycan output card row */}
      <div className="bio-output">
        <div className="panel bio-glycan">
          <div className="panel-title">Secreted antibody N-glycan (harvest)</div>
          <Glycan dist={bv.glycan} width={300} height={150} />
          <div className="panel-note">
            Dominant species drawn in SNFG symbols from the model's harvest distribution. This is what a released
            batch's glycan map would show.
          </div>
        </div>
        <div className="panel bio-cqa">
          <div className="panel-title">What changed &amp; why</div>
          <ul className="bio-why">
            <li><b>ER — where it starts:</b> N-glycosylation begins co-translationally in the endoplasmic
              reticulum, where a pre-assembled Glc₃Man₉GlcNAc₂ precursor is transferred onto Asn297 and trimmed to
              Man₉₋₈. The glycoprotein then moves to the <i>cis</i>-Golgi, where the enzyme train below builds the
              mature, process-sensitive structure. The ER step is high-fidelity and largely invariant, so the CQAs
              you tune are set downstream in the Golgi — but the pathway starts here.</li>
            <li><b>Golgi lumen pH {bv.pHgolgi.toFixed(2)}</b> vs <b>bulk broth pH ~7.0</b> — related, but not the
              same value. Broth pH (~6.9–7.1) is the extracellular setpoint your probe measures; the <b>Golgi lumen</b>
              is a separate, actively-acidified compartment (~6.0–6.5) inside the cell where the transferases work.
              They're coupled through <b>dissolved CO₂</b>: CO₂ is carbonic acid in solution, so it moves broth pH
              <i>and</i> diffuses across the membrane to acidify the lumen ({bv.pCO2.toFixed(0)} mmHg here, Villiger
              relation). In a real bioreactor the pH loop even <b>sparges CO₂ to pull an alkaline broth pH down</b> — the
              same CO₂ pool that then feeds the lumen. So the glycan tracks Golgi lumen pH, driven by CO₂, which is in
              turn coupled to broth pH — not broth pH acting directly on the enzymes.</li>
            <li><b>Transit time {bv.tau.toFixed(0)} min</b> — faster growth or a temperature up-shift shortens
              residence, so glycans exit less mature (more Man5 / G0F).</li>
            <li><b>Mn²⁺ {bv.Mn.toFixed(2)} — why it gets its own knob:</b> it is the <i>catalytic cofactor</i> in the
              active site of galactosyl- (B4GALT1) and sialyltransferase — these enzymes are metal-dependent and
              can't transfer the sugar without it. Supplementing Mn²⁺ raises galactosylation/sialylation; depleting it
              caps them <b>regardless of how much galactose you feed</b>. That direct, documented, actionable effect
              makes it a primary media CPP — the same tier as the galactose feed — unlike Na⁺/K⁺/osmolality which act
              indirectly on growth.</li>
            <li><b>Precursor supply</b> — glucose/glutamine/asparagine feed the nucleotide-sugar tanks; deplete them
              and the antennae/caps cannot be added even when the enzymes are active.</li>
            <li><b>Mitochondrion (oxidative {(bv.oxIndex * 100).toFixed(0)}%)</b> — O₂-driven oxidative metabolism
              supplies the energy for CMP-sialic-acid synthesis; low DO or a lactate-heavy glycolytic shift starves
              sialylation. This is the Golgi↔mitochondria link — energy state, not a direct enzyme.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

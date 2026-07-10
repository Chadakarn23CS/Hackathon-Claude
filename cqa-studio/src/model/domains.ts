/**
 * Real domain architecture of the human IgG1 heavy-chain constant region.
 * Source: InterPro (EBI), UniProt P01857 (IGHG1_HUMAN), fetched via the
 * protein-annotation connector. The C1-set immunoglobulin domain (IPR003597)
 * occurs three times — the three constant domains CH1/CH2/CH3. The Fc N-glycan
 * attaches at Asn297 (EU numbering), which sits in the CH2 domain — the reason
 * every glycan CQA in this tool is a property of that one residue's sugar.
 */
export interface Domain { name: string; start: number; end: number; kind: 'variable' | 'constant' | 'glyco'; note: string; }

export const IGHG1 = {
  uniprot: 'P01857',
  source: 'InterPro / UniProt P01857 (IGHG1_HUMAN)',
  interproEntry: 'IPR003597 (Immunoglobulin C1-set domain)',
  length: 399,        // constant region as annotated by InterPro
  glycoSite: 297,     // Asn297, EU numbering — the Fc N-glycosylation site
  // C1-set fragment coordinates as returned by InterPro (IPR003597)
  domains: [
    { name: 'CH1', start: 8, end: 93, kind: 'constant', note: 'pairs with the light-chain constant domain (CL) — part of the Fab' },
    { name: 'CH2', start: 123, end: 214, kind: 'glyco', note: 'carries the Asn297 N-glycan; the FcγR / C1q binding surface — the effector domain' },
    { name: 'CH3', start: 231, end: 318, kind: 'constant', note: 'CH3–CH3 dimer interface; FcRn binding (half-life)' },
  ] as Domain[],
};

/** SNFG glycan feature → clinical function map (the "understand biology" layer). */
export interface GlycoFeature {
  key: 'galactosylation' | 'afucosylation' | 'sialylation' | 'high_mannose';
  label: string; color: string; symbol: 'circle' | 'triangle' | 'diamond' | 'square';
  fn: string; receptor: string; direction: string;
}
export const GLYCO_FEATURES: GlycoFeature[] = [
  { key: 'afucosylation', label: 'Core fucose (absence)', color: '#dc2626', symbol: 'triangle',
    fn: 'Antibody-dependent cell-mediated cytotoxicity (ADCC)', receptor: 'FcγRIIIa (CD16) on NK cells',
    direction: 'Removing core fucose (afucosylation ↑) sharply increases FcγRIIIa affinity → stronger ADCC. The basis of glyco-engineered oncology mAbs.' },
  { key: 'galactosylation', label: 'Terminal galactose', color: '#eab308', symbol: 'circle',
    fn: 'Complement-dependent cytotoxicity (CDC)', receptor: 'C1q',
    direction: 'Higher terminal galactose raises C1q binding → more CDC, and is a key batch-to-batch consistency CQA.' },
  { key: 'sialylation', label: 'Sialic-acid caps', color: '#9333ea', symbol: 'diamond',
    fn: 'Anti-inflammatory character & serum half-life', receptor: 'FcγR / sialic-acid receptors',
    direction: 'Terminal sialylation dampens effector function and confers anti-inflammatory activity (the IVIG mechanism).' },
  { key: 'high_mannose', label: 'High mannose', color: '#16a34a', symbol: 'circle',
    fn: 'Clearance rate (a CQA to minimize)', receptor: 'Mannose receptor (CD206)',
    direction: 'High-mannose glycans are cleared faster via the mannose receptor → shorter half-life; usually minimized.' },
];

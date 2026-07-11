/**
 * Type definitions for the CHO fed-batch -> Golgi N-glycosylation -> CQA model.
 * Ported from the validated Python reference (cho_cqa_model.py).
 */

/** Bioreactor ODE parameters (fed-batch CHO). */
export interface BioParams {
  mu_max: number; mu_d: number; Kglc: number; Kgln: number;
  KIlac: number; KIamm: number; KICO2: number; pCO2_tox: number;
  pH_opt: number; pH_sig: number; pH_set: number; kpH_CO2: number;
  qglc: number; qgln: number; Ylac_glc: number; klac_up: number;
  Yamm_gln: number; kgln_deg: number; m_resp: number;
  kCO2_prod: number; kLa_CO2: number; pCO2_strip: number;
  qmab: number; a_nongrowth: number; kd_CO2: number; kd_amm: number;
  Fglc: number; Fgln: number; Fgal: number; feed_start: number;
  Vfeed_rate: number; kgal_up: number; Gal0: number;
}

/** Golgi glycosylation-network parameters. */
export interface GlyParams {
  pH_set: number; tauG: number; ktau_mu: number; mu_max: number;
  k_gnt: number; k_gal: number; gal2_rel: number; k_fut: number; k_sia: number;
  K_glcnac: number; K_gal: number; K_fuc: number; K_neu: number; KMn: number;
}

/** Enzyme-expression multipliers (cell-line / genome layer). */
export interface Expression {
  MGAT: number; B4GALT: number; FUT8: number; ST6GAL: number;
}

/** Instantaneous state fed to the glycosylation network. */
export interface GlyState {
  pCO2: number; Amm?: number; mu: number; Mn: number;
  UDPGlcNAc: number; UDPGal: number; GDPFuc: number; CMPNeuAc: number;
  MGAT: number; B4GALT: number; FUT8: number; ST6GAL: number;
}

/** Full glycan distribution (fractions, sum to 1). */
export interface GlycanDist {
  Man5: number; G0: number; G0F: number; G1: number; G1F: number;
  G2: number; G2F: number; G2S: number; G2FS: number;
}

/** Rolled-up critical quality attributes (percentages). */
export interface CQA {
  high_mannose: number; afucosylation: number; galactosylation: number;
  sialylation: number; G0F: number; pH_golgi: number; tau: number;
}

/** State-vector index map for the ODE integrator. */
export const S = {
  Xv: 0, Glc: 1, Gln: 2, Lac: 3, Amm: 4, mAb: 5, pCO2: 6, V: 7, Gal: 8,
} as const;

/** Nucleotide-sugar precursor pools (relative). */
export interface Pools {
  UDPGlcNAc: number; UDPGal: number; GDPFuc: number; CMPNeuAc: number;
}

/** Result of a full coupled simulation. */
export interface SimResult {
  t: number[];
  Xv: number[]; Glc: number[]; Gln: number[]; Lac: number[];
  Amm: number[]; mAb: number[]; pCO2: number[]; Gal: number[];
  mu: number[];
  cqaT: Record<'high_mannose' | 'afucosylation' | 'galactosylation' | 'sialylation' | 'G0F' | 'pH_golgi', number[]>;
  glycanT: GlycanDist[];
  poolsT: Record<'UDPGlcNAc' | 'UDPGal' | 'GDPFuc' | 'CMPNeuAc', number[]>;
  harvest: Record<'high_mannose' | 'afucosylation' | 'galactosylation' | 'sialylation' | 'G0F', number>;
  titer: number; peakVCD: number; pCO2max: number;
}

/** Manufacturing knobs surfaced in the UI (CPPs + cell-line + medium). */
export interface Knobs {
  kLa_CO2: number; pH_set: number; mu_max: number;
  Fglc: number; Fgln: number; Fgal: number; Mn: number;
  MGAT: number; B4GALT: number; FUT8: number; ST6GAL: number;
  // Extended inputs (bounded modifiers; reduce to baseline at defaults).
  Tset: number;       // culture temperature, degC  (default 37 -> tau x1)
  DO: number;         // dissolved O2, % air sat     (default 50 -> factor 1)
  asn_level: number;  // asparagine availability 0..1 (default 1 -> UDP-GlcNAc x1)
}

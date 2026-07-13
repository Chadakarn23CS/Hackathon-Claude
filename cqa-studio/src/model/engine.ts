/**
 * Coupled CHO fed-batch -> Golgi N-glycosylation -> CQA engine.
 *
 * Ported 1:1 from the validated Python reference. The bioreactor ODE is
 * integrated with fixed-step RK4 (h = 1 h). Verified against harvest- and
 * trajectory-level fixtures from the Python reference (cho_cqa_model.py,
 * LSODA) across 13 scenarios in engine.test.ts: measured maximum relative
 * error 0.17 % (worst case: asn_low, high-mannose). The test suite (36 tests)
 * also checks integrator non-negativity and the core mechanistic monotonicities.
 *
 * Parameters are literature-directed and calibrated to reproduce canonical
 * CHO fed-batch behaviour and established glycosylation responses. This is a
 * mechanistic exploration model, not a process-specific fitted digital twin.
 */
import type {
  BioParams, GlyParams, GlyState, GlycanDist, CQA, Pools, SimResult, Knobs, Expression,
} from './types';
// (Pools imported above; used in the coupled loop below.)
import { S } from './types';

export const michaelis = (x: number, K: number): number => x / (K + x);

export function defaultBioParams(): BioParams {
  return {
    mu_max: 0.0265, mu_d: 0.0018, Kglc: 0.6, Kgln: 0.12,
    KIlac: 38.0, KIamm: 14.0, KICO2: 95.0, pCO2_tox: 125.0,
    pH_opt: 7.05, pH_sig: 0.28, pH_set: 7.05, kpH_CO2: 0.22,
    qglc: 0.016, qgln: 0.0030, Ylac_glc: 0.90, klac_up: 0.012,
    Yamm_gln: 0.55, kgln_deg: 0.0035, m_resp: 0.004,
    kCO2_prod: 14.0, kLa_CO2: 0.11, pCO2_strip: 30.0,
    qmab: 2.4, a_nongrowth: 0.55, kd_CO2: 0.0006, kd_amm: 0.0022,
    Fglc: 0.20, Fgln: 0.035, Fgal: 0.0, feed_start: 3.0,
    Vfeed_rate: 0.003, kgal_up: 0.004, Gal0: 0.0,
  };
}

export function defaultGlyParams(): GlyParams {
  return {
    pH_set: 7.05, tauG: 40.0, ktau_mu: 1.0, mu_max: 0.0265,
    k_gnt: 0.32, k_gal: 0.052, gal2_rel: 0.42, k_fut: 0.205, k_sia: 0.024,
    K_glcnac: 0.5, K_gal: 0.5, K_fuc: 0.5, K_neu: 0.5, KMn: 0.5,
  };
}

export function defaultKnobs(): Knobs {
  const b = defaultBioParams();
  return {
    kLa_CO2: b.kLa_CO2, pH_set: 7.05, mu_max: b.mu_max,
    Fglc: b.Fglc, Fgln: b.Fgln, Fgal: 0.0, Mn: 0.5,
    MGAT: 1.0, B4GALT: 1.0, FUT8: 1.0, ST6GAL: 1.0,
    Tset: 37.0, DO: 50.0, asn_level: 1.0,
  };
}

/**
 * Bounded, literature-directed modifiers for the extended inputs (temperature,
 * DO, asparagine). Each reduces to 1.0 at default settings, so the validated
 * baseline is preserved exactly. Directions: cooler -> longer Golgi residence
 * (tau) -> more mature glycans; lower DO -> reduced sialic-acid/galactose
 * precursor supply; asparagine depletion -> reduced UDP-GlcNAc -> more high-mannose.
 */
// Temperature modifier only: asparagine and dissolved O2 now enter through nucPools
// (rate-limiting precursor supply), so glyMods carries just the Golgi-residence effect
// of a temperature shift (downshift lengthens residence -> more mature glycans).
export interface GlyMods { asn_level: number; DO: number; tau_f: number; }
export function glyMods(k: Pick<Knobs, 'Tset' | 'DO' | 'asn_level'>): GlyMods {
  return {
    asn_level: Math.max(0, Math.min(1, k.asn_level)),
    DO: k.DO,
    tau_f: Math.exp(-0.045 * (k.Tset - 37.0)),
  };
}

const feed = (t: number, p: BioParams): number => (t >= p.feed_start ? 1.0 : 0.0);

/** Right-hand side of the 9-state fed-batch ODE. */
export function bioRHS(t: number, y: number[], p: BioParams): number[] {
  let Xv = Math.max(y[S.Xv], 0);
  const Glc = Math.max(y[S.Glc], 0), Gln = Math.max(y[S.Gln], 0);
  const Lac = Math.max(y[S.Lac], 0), Amm = Math.max(y[S.Amm], 0);
  const pCO2 = Math.max(y[S.pCO2], 0), Gal = y[S.Gal];
  const f = feed(t, p);
  const pH = p.pH_set - p.kpH_CO2 * (pCO2 - 40) / 40;
  let mu = p.mu_max * michaelis(Glc, p.Kglc) * michaelis(Gln, p.Kgln)
    * (p.KIlac / (p.KIlac + Lac)) * (p.KIamm / (p.KIamm + Amm))
    * (p.KICO2 / (p.KICO2 + Math.max(pCO2 - 40, 0)));
  mu *= Math.exp(-((pH - p.pH_opt) ** 2) / (2 * p.pH_sig ** 2));
  const mud = p.mu_d + p.kd_CO2 * Math.max(pCO2 - p.pCO2_tox, 0) + p.kd_amm * Math.max(Amm - 5, 0);
  const qglc = p.qglc * michaelis(Glc, p.Kglc);
  const qgln = p.qgln * michaelis(Gln, p.Kgln);
  return [
    (mu - mud) * Xv,
    -qglc * Xv + p.Fglc * f,
    -qgln * Xv + p.Fgln * f - p.kgln_deg * Gln,
    p.Ylac_glc * qglc * Xv - p.klac_up * Lac * Xv * (Glc < 1.5 ? 1 : 0),
    p.Yamm_gln * qgln * Xv + p.kgln_deg * Gln - 0.0015 * Amm,
    p.qmab * (p.a_nongrowth + (mu / p.mu_max) * (1 - p.a_nongrowth)) * Xv,
    p.kCO2_prod * (mu + p.m_resp) * Xv - p.kLa_CO2 * (pCO2 - p.pCO2_strip),
    f * p.Vfeed_rate,
    p.Fgal * f - p.kgal_up * Gal * Xv,
  ];
}

/** Fixed-step RK4 integration of the bioreactor ODE. */
export function integrate(p: BioParams, days = 13): { t: number[]; y: number[][] } {
  const N = days * 24, h = 1.0;
  let y: number[] = [0.4, 7.0, 4.5, 0, 0, 0, 40.0, 1.0, p.Gal0 ?? 0.0];
  const t: number[] = [];
  const cols: number[][] = Array.from({ length: 9 }, () => []);
  for (let i = 0; i <= N; i++) {
    const ti = i * h;
    t.push(ti / 24);
    for (let j = 0; j < 9; j++) cols[j].push(y[j]);
    if (i === N) break;
    const k1 = bioRHS(ti, y, p);
    const k2 = bioRHS(ti + h / 2, y.map((v, j) => v + h / 2 * k1[j]), p);
    const k3 = bioRHS(ti + h / 2, y.map((v, j) => v + h / 2 * k2[j]), p);
    const k4 = bioRHS(ti + h, y.map((v, j) => v + h * k3[j]), p);
    y = y.map((v, j) => v + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
  }
  return { t, y: cols };
}

// ---- Golgi glycosylation network ----
// Golgi lumen pH: acidified vs bulk (offset), further by dissolved CO2, and
// ALKALINIZED by elevated ammonia (Villiger 2016 Part II, Henderson-Hasselbalch:
// NH3 raises luminal pH -> transferases off-optimum -> less galactose; Part I:
// high ammonia -> nearly nongalactosylated glycans). Anchored at 8.5 mM (just above
// the baseline ammonia peak ~8.1) so the calibrated baseline is unchanged; saturating,
// capped +0.9 pH over Villiger's ~30 mM range.
export const golgiPH = (pCO2: number, pH_set: number, Amm = 0): number =>
  (pH_set - 0.55) - 0.0045 * Math.max(pCO2 - 40, 0)
    + 0.9 * (1 - Math.exp(-Math.max(Amm - 8.5, 0) / 12));
const enzPH = (pH: number, opt: number): number => Math.exp(-((pH - opt) ** 2) / (2 * 0.75 ** 2));

/** Advance a glycan cohort through the Golgi enzyme train; return distribution + CQAs. */
export function glyco(st: GlyState, p: GlyParams): { g: GlycanDist; cqa: CQA } {
  const pH = golgiPH(st.pCO2, p.pH_set, st.Amm ?? 0);
  const tau = p.tauG / (1 + p.ktau_mu * st.mu / p.mu_max);
  const cofMn = 0.4 + 0.6 * michaelis(st.Mn, p.KMn);
  const act = (b: number, e: number, o: number, sub: number, K: number, c = 1.0) =>
    b * e * enzPH(pH, o) * michaelis(sub, K) * c;
  const a_gnt = act(p.k_gnt, st.MGAT, 6.5, st.UDPGlcNAc, p.K_glcnac, cofMn);
  const a_gal1 = act(p.k_gal, st.B4GALT, 6.4, st.UDPGal, p.K_gal, cofMn);
  const a_gal2 = a_gal1 * p.gal2_rel;
  const a_fut = act(p.k_fut, st.FUT8, 6.7, st.GDPFuc, p.K_fuc);
  const a_sia = act(p.k_sia, st.ST6GAL, 6.2, st.CMPNeuAc, p.K_neu, cofMn);
  const conv = (a: number) => 1 - Math.exp(-a * tau);
  const pGnt = conv(a_gnt), pGal1 = conv(a_gal1), pGal2 = conv(a_gal2);
  const pFut = conv(a_fut), pSia = conv(a_sia);
  const Man5 = 1 - pGnt, proc = pGnt;
  const G0 = proc * (1 - pGal1), G1 = proc * pGal1 * (1 - pGal2);
  let G2 = proc * pGal1 * pGal2;
  const G2S = G2 * pSia; G2 -= G2S;
  const fuc = pFut;
  const raw: GlycanDist = {
    Man5, G0: G0 * (1 - fuc), G0F: G0 * fuc, G1: G1 * (1 - fuc), G1F: G1 * fuc,
    G2: G2 * (1 - fuc), G2F: G2 * fuc, G2S: G2S * (1 - fuc), G2FS: G2S * fuc,
  };
  const tot = Object.values(raw).reduce((a, b) => a + b, 0);
  const g = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v / tot])) as unknown as GlycanDist;
  const fucFrac = g.G0F + g.G1F + g.G2F + g.G2FS;
  return {
    g,
    cqa: {
      high_mannose: 100 * g.Man5,
      afucosylation: 100 * (1 - fucFrac),
      galactosylation: 100 * (g.G1 + g.G1F + g.G2 + g.G2F + g.G2S + g.G2FS),
      sialylation: 100 * (g.G2S + g.G2FS),
      G0F: 100 * g.G0F, pH_golgi: pH, tau,
    },
  };
}

/** Metabolic state -> relative nucleotide-sugar pools. */
// Baseline operating point (production-weighted) for supply normalization.
const GLC0 = 27.4, GLN0 = 3.95;
function nucRef() {
  const fglc = michaelis(GLC0, 22.0), fgln = michaelis(GLN0, 3.5);
  const amino = 0.5 * fgln + 0.5 * 1.0, doF = michaelis(50.0, 20.0);
  return { UDPGlcNAc: fglc * amino, UDPGal: fglc * 1.0, GDPFuc: fglc, CMPNeuAc: fglc * amino * doF };
}
const _NUC_REF = nucRef();

/**
 * Rate-limiting nucleotide-sugar precursor supply, normalized to 1.0 at the baseline
 * operating point (Glc~27, Gln~4, asn replete, DO 50%). Km values sit in the culture
 * operating range so feed / amino-acid / DO changes propagate to the glycan CQAs.
 *   UDP-GlcNAc : hexosamine pathway = hexose x amino donor (Gln + Asn)
 *   UDP-Gal    : UDP-Glc epimerization (hexose) + galactose feed
 *   GDP-Fuc    : GDP-mannose pathway (hexose)
 *   CMP-NeuAc  : from UDP-GlcNAc, with O2-dependent oxidative steps
 */
export function nucPools(Glc: number, Gln: number, GalExt: number, asn_level = 1.0, DO = 50.0): Pools {
  const fglc = michaelis(Glc, 22.0), fgln = michaelis(Gln, 3.5);
  const amino = 0.5 * fgln + 0.5 * Math.max(0, Math.min(1, asn_level));
  const doF = michaelis(DO, 20.0);
  const raw = {
    UDPGlcNAc: fglc * amino,
    UDPGal: fglc * 1.0 + 0.5 * GalExt,
    GDPFuc: fglc,
    CMPNeuAc: fglc * amino * doF,
  };
  return {
    UDPGlcNAc: Math.max(raw.UDPGlcNAc / _NUC_REF.UDPGlcNAc, 0.03),
    UDPGal: Math.max(raw.UDPGal / _NUC_REF.UDPGal, 0.03),
    GDPFuc: Math.max(raw.GDPFuc / _NUC_REF.GDPFuc, 0.03),
    CMPNeuAc: Math.max(raw.CMPNeuAc / _NUC_REF.CMPNeuAc, 0.03),
  };
}

/** Full coupled simulation: bioreactor trajectory -> per-hour CQAs -> harvest rollup. */
export function simulate(
  bio: BioParams, gly: GlyParams, Mn: number, expr: Expression, days = 13,
  mods: GlyMods = { asn_level: 1, DO: 50, tau_f: 1 },
): SimResult {
  const glyM: GlyParams = { ...gly, tauG: gly.tauG * mods.tau_f };
  const R = integrate(bio, days);
  const n = R.t.length;
  const Xv = R.y[S.Xv], Glc = R.y[S.Glc], Gln = R.y[S.Gln], Lac = R.y[S.Lac];
  const Amm = R.y[S.Amm], mAb = R.y[S.mAb], pCO2 = R.y[S.pCO2], Gal = R.y[S.Gal];
  const mu = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    const dln = Math.log(Math.max(Xv[i1], 1e-3)) - Math.log(Math.max(Xv[i0], 1e-3));
    const dt = (R.t[i1] - R.t[i0]) * 24;
    mu[i] = Math.min(Math.max(dln / dt + bio.mu_d, 0), bio.mu_max);
  }
  const cqaT: SimResult['cqaT'] = {
    high_mannose: [], afucosylation: [], galactosylation: [], sialylation: [], G0F: [], pH_golgi: [],
  };
  const glycanT: GlycanDist[] = [];
  const poolsT: SimResult['poolsT'] = { UDPGlcNAc: [], UDPGal: [], GDPFuc: [], CMPNeuAc: [] };
  const dmab = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const pools: Pools = nucPools(Glc[i], Gln[i], Gal[i], mods.asn_level, mods.DO);
    poolsT.UDPGlcNAc.push(pools.UDPGlcNAc); poolsT.UDPGal.push(pools.UDPGal);
    poolsT.GDPFuc.push(pools.GDPFuc); poolsT.CMPNeuAc.push(pools.CMPNeuAc);
    const st: GlyState = {
      pCO2: pCO2[i], Amm: Amm[i], mu: mu[i], Mn, ...pools,
      MGAT: expr.MGAT, B4GALT: expr.B4GALT, FUT8: expr.FUT8, ST6GAL: expr.ST6GAL,
    };
    const r = glyco(st, glyM);
    cqaT.high_mannose.push(r.cqa.high_mannose);
    cqaT.afucosylation.push(r.cqa.afucosylation);
    cqaT.galactosylation.push(r.cqa.galactosylation);
    cqaT.sialylation.push(r.cqa.sialylation);
    cqaT.G0F.push(r.cqa.G0F);
    cqaT.pH_golgi.push(r.cqa.pH_golgi);
    glycanT.push(r.g);
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    dmab[i] = Math.max((mAb[i1] - mAb[i0]) / ((R.t[i1] - R.t[i0]) * 24), 0);
  }
  const W = dmab.reduce((a, b) => a + b, 0) || 1;
  const wsum = (arr: number[]) => arr.reduce((a, v, i) => a + v * dmab[i], 0) / W;
  return {
    t: R.t, Xv, Glc, Gln, Lac, Amm, mAb, pCO2, Gal, mu, cqaT, glycanT, poolsT,
    harvest: {
      high_mannose: wsum(cqaT.high_mannose), afucosylation: wsum(cqaT.afucosylation),
      galactosylation: wsum(cqaT.galactosylation), sialylation: wsum(cqaT.sialylation),
      G0F: wsum(cqaT.G0F),
    },
    titer: mAb[n - 1], peakVCD: Math.max(...Xv), pCO2max: Math.max(...pCO2),
  };
}

/** Convenience: run from UI knobs. */
export function simulateKnobs(k: Knobs, days = 13): SimResult {
  const bio: BioParams = {
    ...defaultBioParams(),
    kLa_CO2: k.kLa_CO2, pH_set: k.pH_set, mu_max: k.mu_max,
    Fglc: k.Fglc, Fgln: k.Fgln, Fgal: k.Fgal, Gal0: 0,
  };
  const gly: GlyParams = { ...defaultGlyParams(), pH_set: k.pH_set, mu_max: k.mu_max };
  const mods = glyMods(k);
  return simulate(bio, gly, k.Mn, { MGAT: k.MGAT, B4GALT: k.B4GALT, FUT8: k.FUT8, ST6GAL: k.ST6GAL }, days, mods);
}

/** Enzyme metadata for the biology view (pH optima match the glyco() engine). */
export const GOLGI_ENZYMES = [
  { key: 'MGAT', label: 'GnT I/II', full: 'N-acetylglucosaminyltransferase', phOpt: 6.5,
    nsd: 'UDPGlcNAc', product: 'antennae (adds GlcNAc)' },
  { key: 'FUT8', label: 'FUT8', full: 'α-1,6-fucosyltransferase', phOpt: 6.7,
    nsd: 'GDPFuc', product: 'core fucose' },
  { key: 'B4GALT', label: 'β4GalT', full: 'β-1,4-galactosyltransferase', phOpt: 6.4,
    nsd: 'UDPGal', product: 'galactose caps' },
  { key: 'ST6GAL', label: 'ST6Gal', full: 'α-2,6-sialyltransferase', phOpt: 6.2,
    nsd: 'CMPNeuAc', product: 'sialic acid' },
] as const;

export interface BioViewEnzyme {
  key: string; label: string; full: string; phOpt: number; nsd: string; product: string;
  activity: number;   // 0..1 relative to its own max (pH x cofactor x substrate)
  phFactor: number;   // pH suitability 0..1
  supply: number;     // relative nucleotide-sugar pool feeding this enzyme
}
export interface BioView {
  pCO2: number; Amm: number; pHgolgi: number; tau: number; Mn: number;
  DO: number; lactate: number; oxIndex: number; // mitochondrial / energy state
  pools: Pools;
  enzymes: BioViewEnzyme[];
  glycan: GlycanDist;
  harvest: SimResult['harvest'];
  titer: number; peakVCD: number;
}

/**
 * Production-weighted "snapshot" of the Golgi for the biology diagram.
 * Uses the same golgiPH / enzPH / michaelis / cofactor terms as glyco(), so the
 * enzyme activity bars and lumen pH shown to the user are the model's real values.
 */
export function bioView(k: Knobs, days = 13): BioView {
  const sim = simulateKnobs(k, days);
  const p = { ...defaultGlyParams(), pH_set: k.pH_set, mu_max: k.mu_max };
  const n = sim.t.length;
  // production (dmAb/dt) weights
  const w = sim.mAb.map((_, i) => {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    return Math.max((sim.mAb[i1] - sim.mAb[i0]) / ((sim.t[i1] - sim.t[i0]) * 24), 0);
  });
  const W = w.reduce((a, b) => a + b, 0) || 1;
  const wmean = (arr: number[]) => arr.reduce((a, v, i) => a + v * w[i], 0) / W;

  const pCO2 = wmean(sim.pCO2);
  const mu = wmean(sim.mu);
  const Glc = wmean(sim.Glc), Gln = wmean(sim.Gln), Gal = wmean(sim.Gal);
  const lactate = wmean(sim.Lac);
  // Mitochondrial oxidative-capacity index (display): O2 supply for oxidative
  // phosphorylation (michaelis in DO) discounted by the glycolytic/Warburg shift
  // that lactate accumulation signals. 1.0 at DO 50% and low lactate.
  const doF_ox = michaelis(k.DO, 20.0) / michaelis(50.0, 20.0);
  const oxIndex = Math.max(0, Math.min(1.2, doF_ox * (1 / (1 + lactate / 40))));
  const mods = glyMods(k);
  const pools = nucPools(Glc, Gln, Gal, mods.asn_level, mods.DO);
  const Amm = wmean(sim.Amm);
  const pH = golgiPH(pCO2, p.pH_set, Amm);
  const tau = (p.tauG / (1 + p.ktau_mu * mu / p.mu_max)) * mods.tau_f;
  const cofMn = 0.4 + 0.6 * michaelis(k.Mn, p.KMn);
  const enzPHf = (opt: number) => Math.exp(-((pH - opt) ** 2) / (2 * 0.75 ** 2));

  const spec: Record<string, { base: number; expr: number; K: number; nsd: keyof Pools; mn: number }> = {
    MGAT: { base: p.k_gnt, expr: k.MGAT, K: p.K_glcnac, nsd: 'UDPGlcNAc', mn: cofMn },
    FUT8: { base: p.k_fut, expr: k.FUT8, K: p.K_fuc, nsd: 'GDPFuc', mn: 1.0 },
    B4GALT: { base: p.k_gal, expr: k.B4GALT, K: p.K_gal, nsd: 'UDPGal', mn: cofMn },
    ST6GAL: { base: p.k_sia, expr: k.ST6GAL, K: p.K_neu, nsd: 'CMPNeuAc', mn: cofMn },
  };
  // normalize each enzyme's activity to its own default-condition maximum for a 0..1 bar
  const kd = defaultKnobs();
  const enzymes: BioViewEnzyme[] = GOLGI_ENZYMES.map((e) => {
    const s = spec[e.key];
    const sub = pools[s.nsd];
    const activityRaw = s.base * s.expr * enzPHf(e.phOpt) * michaelis(sub, s.K) * s.mn;
    // reference: same enzyme at default knobs, ideal pH, replete pool
    const refMn = 0.4 + 0.6 * michaelis(kd.Mn, p.KMn);
    const refExpr = (kd as unknown as Record<string, number>)[e.key];
    const ref = s.base * refExpr * 1.0 * michaelis(1.0, s.K) * (e.key === 'FUT8' ? 1.0 : refMn);
    return {
      ...e,
      activity: Math.max(0, Math.min(1.2, activityRaw / (ref || 1e-9))),
      phFactor: enzPHf(e.phOpt),
      supply: sub,
    };
  });

  return {
    pCO2, Amm, pHgolgi: pH, tau, Mn: k.Mn, DO: k.DO, lactate, oxIndex, pools, enzymes,
    glycan: sim.glycanT[n - 1], harvest: sim.harvest,
    titer: sim.titer, peakVCD: sim.peakVCD,
  };
}

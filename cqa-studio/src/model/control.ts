/**
 * Closed-loop process control on the digital twin.
 *
 * The bioreactor ODE makes dissolved CO2 a controllable state:
 *   d(pCO2)/dt = kCO2_prod*(mu + m_resp)*Xv  -  kLa_CO2*(pCO2 - pCO2_strip)
 * so the CO2-stripping coefficient kLa_CO2 (gas flow / sparge proxy) is a real
 * manipulated variable (MV). Because pCO2 sets Golgi pH and therefore
 * galactosylation, holding pCO2 at a setpoint stabilizes a glycan CQA.
 *
 * We implement a discrete PID (hourly, matching the RK4 step) that adjusts
 * kLa_CO2 to track a pCO2 setpoint, and run it against the same bioRHS the rest
 * of the app uses. This is a demonstration of a model-based controller closing
 * the loop on a mechanistic twin — the pattern a real soft-sensor / APC would use.
 */
import { bioRHS, defaultBioParams, defaultGlyParams, glyMods, golgiPH, glyco, nucPools } from './engine';
import type { BioParams, Knobs } from './types';

export interface PIDConfig {
  sp: number;        // pCO2 setpoint (mmHg)
  Kp: number;        // proportional gain (mmHg^-1)
  Ti: number;        // integral time (h); large = weak integral
  Td: number;        // derivative time (h)
  mvMin: number;     // kLa_CO2 lower bound
  mvMax: number;     // kLa_CO2 upper bound
  mvBias: number;    // nominal kLa_CO2
}
export function defaultPID(): PIDConfig {
  return { sp: 45, Kp: 0.010, Ti: 24, Td: 2, mvMin: 0.02, mvMax: 0.45, mvBias: 0.11 };
}

const S = { Xv: 0, Glc: 1, Gln: 2, Lac: 3, Amm: 4, mAb: 5, pCO2: 6, V: 7, Gal: 8 };

export interface ControlResult {
  t: number[]; sp: number[]; pCO2: number[]; mv: number[];
  Xv: number[]; mAb: number[]; galactosylation: number[]; pHgolgi: number[];
  harvest: { high_mannose: number; afucosylation: number; galactosylation: number; sialylation: number; G0F: number };
  titer: number; iae: number;  // integral absolute error (control quality)
}

/** One RK4 hour-step of the bioreactor with a (possibly overridden) kLa_CO2. */
function step(p: BioParams, y: number[], ti: number, h: number): number[] {
  const k1 = bioRHS(ti, y, p);
  const k2 = bioRHS(ti + h / 2, y.map((v, j) => v + (h / 2) * k1[j]), p);
  const k3 = bioRHS(ti + h / 2, y.map((v, j) => v + (h / 2) * k2[j]), p);
  const k4 = bioRHS(ti + h, y.map((v, j) => v + h * k3[j]), p);
  return y.map((v, j) => v + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
}

/**
 * Closed-loop (PID) OR open-loop (fixed kLa_CO2) run.
 * Reverse-acting loop: raising kLa_CO2 lowers pCO2, so a positive (PV-SP) error
 * must raise the MV — the controller adds gain on (PV - SP).
 */
/** Optional CO₂ disturbance: a stripping-efficiency loss (pCO2_strip rises) over a day window. */
export interface Disturbance { startDay: number; endDay: number; deltaStrip: number; }

export function simulateControl(knobs: Knobs, pid: PIDConfig | null, days = 13, disturb: Disturbance | null = null): ControlResult {
  const p: BioParams = {
    ...defaultBioParams(),
    kLa_CO2: knobs.kLa_CO2, pH_set: knobs.pH_set, mu_max: knobs.mu_max,
    Fglc: knobs.Fglc, Fgln: knobs.Fgln, Fgal: knobs.Fgal, Gal0: 0,
  };
  const gp = { ...defaultGlyParams(), pH_set: knobs.pH_set, mu_max: knobs.mu_max };
  const mods = glyMods(knobs);
  const N = days * 24, h = 1.0;
  let y = [0.4, 7.0, 4.5, 0, 0, 0, 40.0, 1.0, 0.0];

  // ---- Pass 1: integrate the (closed- or open-loop) ODE, recording states + MV ----
  const tt: number[] = [], sp: number[] = [], pCO2: number[] = [], mv: number[] = [];
  const XvA: number[] = [], mAbA: number[] = [], GlcA: number[] = [], GlnA: number[] = [], GalA: number[] = [];
  let integ = 0, ePrev = 0, iae = 0;

  const baseStrip = p.pCO2_strip;
  for (let i = 0; i <= N; i++) {
    const ti = i * h;
    const dayNow = ti / 24;
    // apply CO₂ disturbance: raise pCO2_strip target (stripping loss) inside the window
    p.pCO2_strip = (disturb && dayNow >= disturb.startDay && dayNow <= disturb.endDay)
      ? baseStrip + disturb.deltaStrip : baseStrip;
    const pv = Math.max(y[S.pCO2], 0);
    if (pid && i > 12) {
      const e = pv - pid.sp;               // reverse-acting: PV above SP -> strip harder
      integ += e * h;
      const deriv = (e - ePrev) / h; ePrev = e;
      let u = pid.mvBias + pid.Kp * (e + integ / pid.Ti + pid.Td * deriv);
      if (u > pid.mvMax) { u = pid.mvMax; integ -= e * h; } // anti-windup
      if (u < pid.mvMin) { u = pid.mvMin; integ -= e * h; }
      p.kLa_CO2 = u;
      iae += Math.abs(e) * h;
    }
    tt.push(ti / 24); sp.push(pid ? pid.sp : NaN); pCO2.push(pv); mv.push(p.kLa_CO2);
    XvA.push(Math.max(y[S.Xv], 1e-3)); mAbA.push(y[S.mAb]);
    GlcA.push(Math.max(y[S.Glc], 0)); GlnA.push(Math.max(y[S.Gln], 0)); GalA.push(y[S.Gal]);
    if (i === N) break;
    y = step(p, y, ti, h);
  }

  // ---- Pass 2: production-weighted glyco, with mu from d(ln Xv)/dt (matches bioView/fixtures) ----
  const n = tt.length;
  const mu = XvA.map((_, i) => {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    const g = (Math.log(XvA[i1]) - Math.log(XvA[i0])) / ((tt[i1] - tt[i0]) * 24) + p.mu_d;
    return Math.max(0, Math.min(p.mu_max, g));
  });
  const dmab = mAbA.map((_, i) => {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    return Math.max((mAbA[i1] - mAbA[i0]) / (tt[i1] - tt[i0]), 0);
  });
  const W = dmab.reduce((a, b) => a + b, 0) || 1;

  const galT: number[] = [], pHgT: number[] = [];
  const keys = ['high_mannose', 'afucosylation', 'galactosylation', 'sialylation', 'G0F'] as const;
  const acc: Record<string, number> = { high_mannose: 0, afucosylation: 0, galactosylation: 0, sialylation: 0, G0F: 0 };
  for (let i = 0; i < n; i++) {
    const pools = nucPools(GlcA[i], GlnA[i], GalA[i], mods.asn_level, mods.DO);
    const st = { pCO2: pCO2[i], mu: mu[i], Mn: knobs.Mn, ...pools,
      MGAT: knobs.MGAT, B4GALT: knobs.B4GALT, FUT8: knobs.FUT8, ST6GAL: knobs.ST6GAL };
    const { cqa } = glyco(st, { ...gp, tauG: gp.tauG * mods.tau_f });
    galT.push(cqa.galactosylation); pHgT.push(golgiPH(pCO2[i], gp.pH_set));
    keys.forEach((kk) => { acc[kk] += dmab[i] * cqa[kk]; });
  }
  const harvest = {
    high_mannose: acc.high_mannose / W, afucosylation: acc.afucosylation / W,
    galactosylation: acc.galactosylation / W, sialylation: acc.sialylation / W, G0F: acc.G0F / W,
  };
  return { t: tt, sp, pCO2, mv, Xv: XvA, mAb: mAbA, galactosylation: galT, pHgolgi: pHgT,
    harvest, titer: mAbA[n - 1], iae };
}

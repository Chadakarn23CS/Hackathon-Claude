/**
 * Batch Monitor — the digital-twin assimilation layer.
 *
 * A twin (vs. a simulator) is anchored to a *running batch*: you enter the offline
 * measurements taken so far, and the twin (a) shows how far its nominal prediction is
 * from reality at the current day, (b) applies a light bias correction so the forecast
 * passes through the measurements, and (c) re-projects to harvest with a corrected CQA.
 *
 * The correction is deliberately conservative: it does NOT refit mechanistic parameters
 * (that is the recalibrate skill's job, and needs a full dataset). It nudges the forecast
 * by the measured-minus-predicted residual at the current day, decaying toward harvest —
 * a standard measurement-update / bias-correction, honest about being data-anchored
 * interpolation rather than a re-identified model.
 */
import type { Knobs, SimResult } from './types';
import { simulateKnobs } from './engine';

export interface Measurement {
  day: number;           // culture day the sample was taken
  VCD?: number;          // 1e6 cells/mL
  Glc?: number;          // g/L
  pCO2?: number;         // mmHg
  galactosylation?: number; // % (an at-line glycan reading)
}

export interface MonitorResult {
  nominal: SimResult;                 // the twin's prior (no measurements)
  t: number[];                        // days
  // corrected forecast trajectories (bias-adjusted toward the measurements)
  VCD: number[]; Glc: number[]; pCO2: number[]; galactosylation: number[];
  currentDay: number;
  residuals: Record<string, { pred: number; meas: number; resid: number } >;
  forecastGal: number;                // corrected harvest galactosylation
  nominalGal: number;                 // uncorrected harvest galactosylation
  onTrack: boolean;                   // is corrected harvest within +/-1.5% of nominal
  alerts: string[];
}

/** nearest trajectory index for a given culture day */
function idxForDay(t: number[], day: number): number {
  let best = 0, bd = Infinity;
  for (let i = 0; i < t.length; i++) {
    const d = Math.abs(t[i] - day);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

/**
 * Assimilate measurements into the twin. `knobs` are the believed operating conditions;
 * `meas` is the latest available sample (typically the current culture day).
 */
export function monitor(knobs: Knobs, meas: Measurement, days = 13): MonitorResult {
  const nominal = simulateKnobs(knobs, days);
  const t = nominal.t;
  const n = t.length;
  const di = idxForDay(t, meas.day);
  const cur = t[di];

  // residual = measured - predicted at the current day, per available channel
  const residuals: MonitorResult['residuals'] = {};
  const chan: { key: keyof Measurement; traj: number[]; label: string }[] = [
    { key: 'VCD', traj: nominal.Xv, label: 'VCD' },
    { key: 'Glc', traj: nominal.Glc, label: 'Glucose' },
    { key: 'pCO2', traj: nominal.pCO2, label: 'pCO2' },
  ];
  // build corrected trajectories: from the measurement day onward, carry the residual
  // FORWARD as a persistent bias (a measurement update pins 'now' and propagates the
  // offset to the forecast — if the batch is off-plan today it is likely off-plan later).
  // The model still owns the *shape*; the measurement owns the *level* from now on.
  const correct = (traj: number[], resid: number): number[] =>
    traj.map((v, i) => (i < di ? v : v + resid)); // past = prior, future = prior + bias

  let VCD = nominal.Xv.slice(), Glc = nominal.Glc.slice(), pCO2 = nominal.pCO2.slice();
  for (const c of chan) {
    const m = meas[c.key] as number | undefined;
    if (m == null || Number.isNaN(m)) continue;
    const pred = c.traj[di];
    const resid = m - pred;
    residuals[c.label] = { pred, meas: m, resid };
    if (c.key === 'VCD') VCD = correct(nominal.Xv, resid);
    if (c.key === 'Glc') Glc = correct(nominal.Glc, resid);
    if (c.key === 'pCO2') pCO2 = correct(nominal.pCO2, resid);
  }

  // galactosylation forecast: pCO2 is the causal lever (pCO2 -> Golgi pH -> galactosylation),
  // so a pCO2 residual propagates to the CQA forecast. If the user gave a direct glycan
  // reading, pin to it; otherwise infer from the pCO2 correction sensitivity.
  const galTraj = nominal.cqaT.galactosylation.slice();
  const nominalGal = nominal.harvest.galactosylation;
  let galResid = 0;
  if (meas.galactosylation != null && !Number.isNaN(meas.galactosylation)) {
    galResid = meas.galactosylation - galTraj[di];
    residuals['Galactosylation'] = { pred: galTraj[di], meas: meas.galactosylation, resid: galResid };
  } else if (residuals['pCO2']) {
    // Model-DERIVED local sensitivity d(harvest galactosylation)/d(pCO2), via a small kLa_CO2
    // perturbation (kLa_CO2 is what moves pCO2). Using the model's own slope keeps the twin
    // consistent with it — the net harvest effect is small/buffered (Golgi acidification is
    // offset by slower-growth-extended residence), not the large negative a hard-coded slope implies.
    const up = simulateKnobs({ ...knobs, kLa_CO2: knobs.kLa_CO2 * 0.9 }, days); // less stripping → higher pCO2
    const dn = simulateKnobs({ ...knobs, kLa_CO2: knobs.kLa_CO2 * 1.1 }, days); // more stripping → lower pCO2
    const dPco2 = up.pCO2max - dn.pCO2max;
    const slope = Math.abs(dPco2) > 1e-6
      ? (up.harvest.galactosylation - dn.harvest.galactosylation) / dPco2 : 0;
    galResid = slope * residuals['pCO2'].resid;
  }
  const galCorr = correct(galTraj, galResid);
  // corrected harvest = nominal harvest shifted by the persisted galactosylation bias.
  // A DIRECT at-line glycan reading is trusted strongly (it measures the CQA itself);
  // a bias INFERRED from a pCO2 residual is discounted by how much culture remains.
  const directGlycan = meas.galactosylation != null && !Number.isNaN(meas.galactosylation);
  const forwardWeight = directGlycan ? 0.85 : (n - di) / n;
  const correctedHarvestGal = nominalGal + galResid * forwardWeight;

  const onTrack = Math.abs(correctedHarvestGal - nominalGal) <= 1.5;
  const alerts: string[] = [];
  if (residuals['VCD'] && Math.abs(residuals['VCD'].resid) > 3)
    alerts.push(`VCD is ${residuals['VCD'].resid > 0 ? 'above' : 'below'} plan by ${Math.abs(residuals['VCD'].resid).toFixed(1)}e6 at day ${meas.day}.`);
  if (residuals['pCO2'] && Math.abs(residuals['pCO2'].resid) > 8)
    alerts.push(`pCO2 is ${residuals['pCO2'].resid > 0 ? 'high' : 'low'} by ${Math.abs(residuals['pCO2'].resid).toFixed(0)} mmHg — Golgi pH and galactosylation will drift.`);
  if (!onTrack)
    alerts.push(`Forecast harvest galactosylation ${correctedHarvestGal.toFixed(1)}% vs plan ${nominalGal.toFixed(1)}% — ${correctedHarvestGal < nominalGal ? 'below' : 'above'} target; consider a corrective move (CO2 stripping / galactose feed).`);
  if (alerts.length === 0)
    alerts.push('Batch tracking the plan within tolerance. Forecast on target.');

  return {
    nominal, t, VCD, Glc, pCO2, galactosylation: galCorr,
    currentDay: cur, residuals, forecastGal: correctedHarvestGal, nominalGal,
    onTrack, alerts,
  };
}

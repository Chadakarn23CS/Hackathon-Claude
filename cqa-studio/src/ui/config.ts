/** UI configuration: knob metadata, groups, presets. */
import type { Knobs } from '../model/types';
import type { KnobKey } from '../model/analysis';

export interface KnobDef {
  key: KnobKey; label: string; min: number; max: number; step: number;
  unit?: string; fmt?: (v: number) => string; group: string; hint?: string; info?: string;
}

export const GROUPS = [
  { id: 'co2', label: 'Bioreactor / CO₂', color: 'var(--env)' },
  { id: 'feed', label: 'Feed & amino acids', color: 'var(--met)' },
  { id: 'env', label: 'Physical environment', color: 'var(--in)' },
  { id: 'gene', label: 'Cell line / genome', color: 'var(--gene)' },
];

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const x = (v: number) => `${v.toFixed(2)}×`;

export const KNOBS: KnobDef[] = [
  { key: 'kLa_CO2', label: 'CO₂ stripping (kLa_CO2)', min: 0.04, max: 0.30, step: 0.005, group: 'co2',
    unit: 'h⁻¹', fmt: (v) => v.toFixed(3), hint: 'Higher = more CO₂ removed by sparging/agitation',
    info: 'Volumetric CO₂ mass-transfer coefficient (units 1/h). Low values let dissolved pCO₂ accumulate, acidifying the Golgi. This is the lumped term a CFD surrogate would replace with a scale-dependent field.' },
  { key: 'pH_set', label: 'pH setpoint', min: 6.8, max: 7.4, step: 0.01, group: 'co2',
    unit: 'pH', fmt: (v) => v.toFixed(2), info: 'Culture pH setpoint (dimensionless pH units). Sets the baseline from which pCO₂ excursions perturb Golgi pH.' },
  { key: 'mu_max', label: 'Max growth rate μmax', min: 0.018, max: 0.038, step: 0.001, group: 'co2',
    unit: 'h⁻¹', fmt: (v) => v.toFixed(3), info: 'Cell-line/medium growth capacity (specific growth rate, 1/h). Faster growth shortens Golgi residence → less mature glycans.' },

  { key: 'Fglc', label: 'Glucose feed', min: 0.0, max: 0.6, step: 0.01, group: 'feed',
    unit: 'g L⁻¹ h⁻¹', fmt: (v) => v.toFixed(2), hint: 'Feed rate (normalized model units)',
    info: 'Glucose feed rate in normalized model units (≈ g L⁻¹ h⁻¹ on the reference basis). Sustains nucleotide-sugar precursor pools. Baseline 0.20.' },
  { key: 'Fgln', label: 'Glutamine feed', min: 0.0, max: 0.12, step: 0.005, group: 'feed',
    unit: 'mM h⁻¹', fmt: (v) => v.toFixed(3), hint: 'Feed rate (normalized model units)',
    info: 'Glutamine feed rate in normalized model units (≈ mM h⁻¹ on the reference basis). N source; drives ammonia and part of the UDP-GlcNAc pool. Baseline 0.035.' },
  { key: 'Fgal', label: 'Galactose feed', min: 0.0, max: 0.25, step: 0.01, group: 'feed',
    unit: 'mM h⁻¹', fmt: (v) => v.toFixed(2), hint: 'Classic galactosylation booster (normalized units)',
    info: 'Galactose supplementation rate in normalized model units (≈ mM h⁻¹ on the reference basis) raises the UDP-Gal pool → higher galactosylation (with uridine + Mn²⁺ in practice). Baseline 0.' },
  { key: 'asn_level', label: 'Asparagine availability', min: 0.1, max: 1.0, step: 0.05, group: 'feed',
    unit: '% of nominal', fmt: pct, hint: 'Depletion → high-mannose rises',
    info: 'Asparagine availability as a fraction of the nominal medium level (100% = baseline). Feeds the hexosamine pathway → UDP-GlcNAc; depletion late in culture is a documented driver of rising high-mannose.' },

  { key: 'Tset', label: 'Temperature', min: 30, max: 37.5, step: 0.5, group: 'env', unit: '°C',
    fmt: (v) => v.toFixed(1), hint: 'Downshift → longer Golgi residence → more mature',
    info: 'Culture temperature (°C). A 37→33 °C downshift slows growth, lengthens effective Golgi residence, and raises galactosylation/sialylation (temperature-shift strategy).' },
  { key: 'DO', label: 'Dissolved O₂', min: 5, max: 100, step: 5, group: 'env', unit: '% air sat.',
    fmt: (v) => v.toFixed(0), hint: 'Low DO reduces sialylation',
    info: 'Dissolved oxygen (% of air saturation). Low DO shifts metabolism and reduces oxidative precursor supply (CMP-sialic acid, UDP-Gal), lowering sialylation.' },

  { key: 'Mn', label: 'Mn²⁺ level', min: 0.0, max: 3.0, step: 0.1, group: 'gene',
    unit: '× baseline', fmt: x, hint: 'Divalent-metal cofactor for GalT/SiaT',
    info: 'Manganese level as a multiple of the baseline medium concentration (1× = baseline). Dominant divalent-metal cofactor for β-1,4-galactosyltransferase; primary galactosylation-tuning lever (trace-metal drift is a real lot-to-lot CMC issue).' },
  { key: 'MGAT', label: 'MGAT expression', min: 0.2, max: 3.0, step: 0.1, group: 'gene',
    unit: '× WT', fmt: x, hint: 'Relative to wild-type expression',
    info: 'GlcNAc-transferase (GnTI/II) expression relative to wild-type (1× = WT). Gates entry into the complex pathway; low MGAT raises high-mannose.' },
  { key: 'B4GALT', label: 'B4GALT1 expression', min: 0.2, max: 4.0, step: 0.1, group: 'gene',
    unit: '× WT', fmt: x, hint: 'Relative to wild-type expression',
    info: 'β-1,4-galactosyltransferase expression relative to wild-type (1× = WT). Overexpression raises galactosylation (→ CDC potency).' },
  { key: 'FUT8', label: 'FUT8 expression', min: 0.0, max: 2.0, step: 0.05, group: 'gene',
    unit: '× WT', fmt: x, hint: 'Knockdown → afucosylation → ADCC',
    info: 'α-1,6-fucosyltransferase (core fucose) expression relative to wild-type (1× = WT). Knockout/knockdown is the classic route to afucosylated, high-ADCC antibodies.' },
  { key: 'ST6GAL', label: 'ST6GAL1 expression', min: 0.2, max: 5.0, step: 0.1, group: 'gene',
    unit: '× WT', fmt: x, hint: 'Relative to wild-type expression',
    info: 'α-2,6-sialyltransferase expression relative to wild-type (1× = WT). Overexpression raises sialylation (→ serum half-life, anti-inflammatory).' },
];

export interface Preset { name: string; desc: string; knobs: Partial<Knobs>; }
export const PRESETS: Preset[] = [
  { name: 'Baseline', desc: 'Calibrated reference process', knobs: {} },
  { name: 'Poor CO₂ stripping', desc: 'Large-scale mixing limitation', knobs: { kLa_CO2: 0.06 } },
  { name: 'High-ADCC (FUT8 KD)', desc: 'Afucosylation for potency', knobs: { FUT8: 0.25 } },
  { name: 'High galactosylation', desc: 'Mn²⁺ + galactose feed', knobs: { Mn: 2.5, Fgal: 0.18 } },
  { name: 'High sialylation', desc: 'ST6GAL1 up, galactose feed', knobs: { ST6GAL: 3.5, Fgal: 0.15, Mn: 1.5 } },
  { name: 'Temp-shift strategy', desc: '37→33 °C downshift', knobs: { Tset: 33 } },
  { name: 'Asn depletion', desc: 'Late-culture high-mannose', knobs: { asn_level: 0.25 } },
];

/**
 * Scale presets — a lumped, scale-aware comparison. The dominant, well-documented
 * scale-up effect on Fc glycosylation is pCO₂ accumulation from reduced CO₂-stripping
 * efficiency in large vessels (lower effective kLa_CO2). Values are ILLUSTRATIVE,
 * from typical published ranges (see SOURCES) — not calibrated to any specific process.
 * This is a well-mixed model: it represents each scale by an effective kLa_CO2, not a
 * spatial gradient field (that would require CFD/compartment coupling).
 */
export const SCALE_PRESETS: Preset[] = [
  { name: 'Bench (2–5 L)', desc: 'Efficient stripping · low pCO₂', knobs: { kLa_CO2: 0.11 } },
  { name: 'Pilot (50–200 L)', desc: 'Moderate stripping', knobs: { kLa_CO2: 0.08 } },
  { name: 'Manufacturing (2000 L)', desc: 'Stripping-limited · pCO₂ accumulates', knobs: { kLa_CO2: 0.05 } },
];

/**
 * Provenance ledger. Every parameter and structure in GlycoTwin traces to a public,
 * published source. There is NO proprietary or company-specific data in this model —
 * it is a generic, literature-parameterized digital twin. Product-specific calibration
 * (if a user has their own fed-batch + glycan data) happens locally via the
 * cho-cqa-recalibrate skill and is never baked into this open build.
 */
export interface SourceRow { area: string; item: string; source: string; kind: 'equation' | 'database' | 'validation'; }

export const SOURCES: SourceRow[] = [
  { area: 'Bioreactor kinetics', item: 'Fed-batch growth / metabolism / pCO₂ ODEs',
    source: 'Standard fed-batch CHO mass-balance equations (e.g. bit.25450, 2015)', kind: 'equation' },
  { area: 'Golgi glycosylation', item: 'N-glycan processing network & transferase kinetics',
    source: 'Jimenez del Val 2011 (btpr.688); Villiger 2016 (btpr.2305 / btpr.2315)', kind: 'equation' },
  { area: 'Golgi network scale', item: 'Reaction network / compartment structure reference',
    source: 'CHOGlycoNET, Metabolic Engineering 2023 (ymben.2022.12.009)', kind: 'equation' },
  { area: 'Antibody molecule', item: 'IgG1 3D structure',
    source: 'PDB 1HZH (public)', kind: 'database' },
  { area: 'Antibody domains', item: 'Heavy-chain domain architecture (CH1/CH2/CH3)',
    source: 'InterPro / UniProt P01857 (IGHG1_HUMAN), fetched from EBI', kind: 'database' },
  { area: 'Glycan → function', item: 'Fucose→ADCC, galactose→CDC, sialylation→half-life',
    source: 'Established Fc-glycobiology (e.g. jps.24444, 2015; jmb.2016.02.030)', kind: 'equation' },
  { area: 'Process validation', item: 'pCO₂ / pH / DO effect ceiling (<5%)',
    source: 'Bravo-Venegas et al. 2026 meta-analysis, open access (doi:10.1080/19420862.2026.2643039)', kind: 'validation' },
  { area: 'Scale presets', item: 'Large-scale pCO₂ accumulation / kLa stripping limitation',
    source: 'Illustrative values from published large-scale bioreactor pCO₂ literature — not process-specific', kind: 'validation' },
];

/** One-line provenance statement shown wherever a "no proprietary data" claim is useful. */
export const PROVENANCE_NOTE =
  'GlycoTwin is parameterized entirely from public, published sources. It contains no proprietary or ' +
  'company-specific data. It reproduces its own literature calibration point, not any confidential dataset.';

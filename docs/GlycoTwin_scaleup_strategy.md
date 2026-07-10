# GlycoTwin — Scale-Up Strategy for Glycan Quality

## Core insight
**Scale-up for glycosylation is a CO₂-stripping problem disguised as an oxygen-transfer problem.**
Holding dissolved oxygen (DO) constant does NOT guarantee you are holding dissolved CO₂ (pCO₂)
constant — and it is pCO₂, not DO, that primarily moves the Fc glycan.

## "kLa" is not one number — the transfer processes differ
kLa (volumetric mass-transfer coefficient) is specific to each gas AND to how the gas is delivered.

| Process | Direction | Driven by | Scale-up behaviour | Glycan relevance |
|---|---|---|---|---|
| kLa · O₂ (supply) | into broth | sparging + agitation (P/V, vs) | O₂ sparingly soluble → supply-limited at high density; usually maintainable by sparging harder | Indirect — low DO trims sialylation (oxidative energy for CMP-NeuAc) |
| kLa · CO₂ (stripping) | out of broth | total gas throughput carrying CO₂ away | CO₂ highly soluble + cell-produced → removal-limited; FAILS FIRST at large scale (tall column, low surface:volume, sparge capped by shear/foam) | DIRECT — master lever: pCO₂ → carbonic acid → Golgi lumen pH → galactosylation/sialylation |
| Sparged (bottom) gas | both | rising bubbles, high interfacial area | high kLa for O₂ and CO₂, but foam/shear cap rate; micro-spargers strip CO₂ POORLY (tiny bubbles saturate) | coarser bubbles strip CO₂ better — real tradeoff vs O₂ supply |
| Headspace overlay | both | gas swept over surface | low kLa (small surface:volume) — negligible CO₂ stripping at scale | minor at scale; matters in small vessels |

## The scale-up asymmetry
O₂ demand and CO₂ removal scale differently. At 2000 L you often have ENOUGH O₂ kLa (can sparge
harder) but INSUFFICIENT CO₂ stripping (tall liquid column, low surface:volume, sparge rate limited
by shear/foam). Result: DO holds, but pCO₂ climbs from ~30–50 mmHg (bench) to 80–150 mmHg (large
scale), acidifying medium and Golgi lumen, pushing transferases off their pH optimum. Galactosylation
and sialylation drift down; osmolality rises from base added to counter the CO₂-driven pH drop.

Magnitude (per the model and the literature ceiling): the glycan is ROBUST BUT NOT IMMUNE — the shift
is real but bounded (typically a few % on galactosylation), while titer takes the larger hit (~20%).

## Five levers for successful scale-up with good glycosylation
1. Control pCO₂ directly, not just DO — match effective CO₂ removal across scale.
2. Tune the sparger for stripping — coarser bubbles / dedicated strip-gas flow; micro-spargers
   maximise O₂ kLa but trap CO₂.
3. Manage the pH↔base↔osmolality coupling — high pCO₂ → low pH → base addition → osmolality spike;
   use a CO₂-aware pH deadband rather than fighting CO₂ with base.
4. Compensate with temperature / Mn²⁺ / galactose — a mild temp downshift (longer Golgi residence)
   or Mn²⁺/galactose feed recovers galactosylation if pCO₂ can't be fully held.
5. Make the scale-down model reproduce the large-scale pCO₂ profile — not just DO — or process
   development misses the real stressor.

## Connection to the research question (spatial gradients)
The well-mixed model captures the AVERAGE pCO₂ shift with scale (via effective kLa_CO2). It does NOT
resolve the SPATIAL field: large vessels have CO₂-rich zones near the sparger and pH gradients that
cells circulate through on the mixing timescale. Turning the lumped kLa_CO2 into a spatially-resolved
pCO₂/pH field the cells actually experience — via CFD or a compartment model coupled to the Golgi
kinetics — is the natural, and genuinely novel, extension of this tool.

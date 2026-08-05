# Self-weight compaction, spatially varying density, and particle degradation from re-handling

Research pass, 2026-08-04. Persisted before any implementation decision, per the standing rule that a
plan is built from sources on disk rather than from memory.

**The question asked.** `docs/methods/18_material.md` states, as an honest limit, that compaction is a
scalar and not a field, and that the placed density should therefore not be used for a survey
reconciliation. Self-weight compaction, a spatially varying density and particle degradation from
re-handling are all absent from the engine. Are they worth implementing?

---

## Verdict, before the evidence

| effect | magnitude on THIS pile | changes a verdict the product reports? | action |
|---|---|---|---|
| self-weight compaction | mass-weighted mean volumetric strain **1.5 %**; density field spanning **+0.7 % to +3.3 %** from surface to the deepest point | **No.** Worst-case effect on VRR is **+1.2 % relative**, against a seed-to-seed 5th-95th band of roughly **±49 % relative** | **Keep as a stated limit.** Sharpen the wording with the number and the reason |
| spatially varying density for reconciliation | the pile would settle **1174 m3 of 79 325**, and the crest column by **0.30 m** | **No, and worse: it would be a false precision.** The engine's OWN scalar compaction parameter carries a published band of 5 to 15 %, three to ten times the entire self-weight signal | **Keep as a stated limit.** Say explicitly that the scalar's uncertainty dominates the field |
| particle degradation from re-handling | plausibly **-0.02 to -0.08** on the coarse fraction over the build, **spatially correlated with the dozed surfaces** | **Yes.** The whole segregation signal the product reports is a toe-minus-apex delta of **+0.037 to +0.067** | **This one is real.** But see the defect below before modelling anything |
| (found while measuring) `take_from_top` drops `coarse_fraction` | thickness-weighted coarse fraction in the baked reference case is **0.2093** against **0.3500** placed, a **40 % deficit** in coarse species mass | **Yes, today, silently** | **Fix first.** No degradation model can be calibrated against a ledger that is already losing 40 % of the coarse species |

The short version: **compaction on a 14 m ROM pile is a 1 to 3 percent density effect that changes no
number this product reports, and the right action is to keep it as a stated limit rather than
implement it badly.** Degradation is the one of the three that actually matters, and it matters
because it is a *confound for the segregation result*, not because it changes tonnage.

---

## 0. What the engine and the baked data actually are

Measured from `data/derived/single/` on 2026-08-04, not assumed:

| quantity | value | where |
|---|---|---|
| pad | 60 x 60 cells at 2.5 m = **150 x 150 m** | `field.json`, `manifest.json:pad` |
| dumping area referenced in method 15 | 36 x 36 cells = 90 x 90 m (1296 cells) | `docs/methods/15_dozer.md` |
| voxel grid | 2.5 x 2.5 x **0.5 m**, `nz = 28` (14.0 m) | `volume.json` |
| cells carrying material | **2886** of 3600 | computed |
| placed volume | **79 325 m3** | computed; `manifest.build.volume_m3 = 79 329.8` |
| peak | **13.71 m** | `manifest.build.peak_m` |
| mean thickness over occupied cells | **4.40 m** (median 3.79, p75 7.64, p99 10.97) | computed |
| loose density | **1.957 t/m3** (`manifest.material`), but `BlockModel.bulk_density_t_m3` defaults to **1.900** | `manifest.json`, `blocks.py:84` |
| pile mass at 1.957 | **155 240 t** | computed |
| dozer passes / loads placed | 56 / 744 | `manifest.build` |
| tonnage-weighted mean displacement | **19.52 m** | `manifest.build.mean_displacement_m` |
| reclaim | 24 cuts of 3000 t | `cuts.json` |

Two things follow immediately and both cut against implementing compaction.

**The pile is not 14 m tall, it is 4.4 m tall with a 13.71 m peak.** The mass-weighted mean depth
below the free surface is **3.30 m**, so the mass-weighted mean vertical stress is **63.4 kPa**. Only
a handful of columns ever see the 263 kPa at the deepest point. Any self-weight model is being asked
to act mostly on material under half an atmosphere of overburden.

**The density used to convert volume to tonnes is not even self-consistent today.** `material.py`
gives 1.957 t/m3 through the swell chain; `BlockModel` defaults to 1.900. That is a **2.9 %**
discrepancy inside the engine, which is *larger than the entire mass-weighted self-weight effect
computed below*. Adding a spatial field on top of that inconsistency would be decoration.

---

## 1. Self-weight compaction of coarse rockfill and ROM

### 1.1 The equations

**(E1) The e-log sigma form the question asked for.** For one-dimensional compression, the standard
Terzaghi/Casagrande form, applied to rockfill by Marsal and used throughout the rockfill-dam
literature:

```
e(sigma_v) = e_0 - C_c * log10( sigma_v / sigma_ref )
```

| symbol | meaning | units |
|---|---|---|
| `e` | void ratio, volume of voids over volume of solids | dimensionless |
| `e_0` | void ratio at the reference stress | dimensionless |
| `C_c` | compression index, the slope of the e-log10(sigma) line | dimensionless |
| `sigma_v` | vertical effective stress | kPa |
| `sigma_ref` | reference stress at which `e = e_0` | kPa |

Volumetric strain and dry density follow:

```
eps_v = (e_0 - e) / (1 + e_0)          rho(sigma_v) = rho_0 / (1 - eps_v) = G_s * rho_w / (1 + e)
```

with `G_s` the specific gravity of the solids (dimensionless, 2.70 here) and `rho_w = 1.0 t/m3`.

**(E2) The Janbu tangent-modulus form, which is the one that actually behaves at low stress.** The
e-log form has a pathology exactly where this pile lives: it is singular as `sigma_v -> 0`, and the
top metre of a stockpile is at 5 to 20 kPa. Janbu's stress-dependent constrained modulus does not
have that problem and is the standard for granular fills:

```
M(sigma_v) = m_j * p_a * ( sigma_v / p_a )^(1 - a)

eps_v(sigma_v) = integral_0^sigma_v  d(sigma) / M(sigma)
               = ( 1 / (m_j * a) ) * ( sigma_v / p_a )^a          for a > 0
```

| symbol | meaning | units |
|---|---|---|
| `M` | constrained (oedometric) tangent modulus, `d(sigma_v)/d(eps_v)` | kPa |
| `m_j` | modulus number | dimensionless |
| `p_a` | atmospheric reference pressure, 100 | kPa |
| `a` | stress exponent; `a = 0.5` for coarse granular soils and rockfill | dimensionless |
| `eps_v` | volumetric (= vertical, 1-D) strain | dimensionless |

**(E3) Oldecop and Alonso's two-regime rockfill compressibility, which is why the answer for a 14 m
pile is "small".** Rockfill compressibility is not a single index. It splits into an instantaneous,
essentially rearrangement-driven part and a clastic part that only switches on when particles start
to break:

```
lambda_t(psi) = lambda_i + lambda_d(psi)
```

| symbol | meaning | units |
|---|---|---|
| `lambda_t` | total compressibility index in the `e` vs `ln(sigma)` plane | dimensionless |
| `lambda_i` | instantaneous (rearrangement) compressibility, humidity-independent | dimensionless |
| `lambda_d` | time-dependent clastic compressibility, driven by subcritical crack growth | dimensionless |
| `psi` | total suction / relative humidity of the air in the voids | MPa |

The operationally important consequence, and the single most decisive fact in this dossier, is
**clastic yield**: below a yield stress the material is in the `lambda_i` regime and is stiff; above
it the `lambda_d` regime opens and compressibility jumps. Maurer, Ovalle and Saez measured that yield
directly in a 300 mm oedometer on dry quarry rockfill poured without compaction at `e_0 = 0.6`:

> "The 2 laboratory tests exhibit similar behavior until the yielding point, at approximately
> sigma = 800 kPa. Beyond yielding, compressibility increases significantly, presumably due to
> particle breakage."

**The deepest point of this pile is at 263 kPa. That is a factor of three below the stress at which
rockfill compressibility becomes interesting.** The pile lives entirely in the stiff pre-yield branch.

**(E4) The empirical stiffness law fitted in this session to a published open dataset.** The Ovalle
et al. (2020) database is 158 large drained triaxial tests on 33 rockfill and mine-waste materials,
1 m diameter samples, `d_max` 100 to 200 mm, released open under CC-BY at
[doi:10.5281/zenodo.3625778](https://doi.org/10.5281/zenodo.3625778). Downloaded and fitted here
(n = 121 tests with both `sigma_3` and `E_50` reported):

```
E_50(sigma_3) = 14.3 MPa * ( sigma_3 / 100 kPa )^0.518
```

| symbol | meaning | units |
|---|---|---|
| `E_50` | secant Young's modulus at 50 % of peak deviator stress | MPa |
| `sigma_3` | effective confining stress | kPa |

Converted to a constrained modulus with `M = E * (1-nu) / ((1+nu)(1-2nu))`, `nu = 0.30`, giving
`M = 1.35 E_50`, and to a vertical stress with `K_0 = 1 - sin(phi)`, `phi = 45 deg` (the database's
own low-stress friction angles run 46 to 49 deg), so `K_0 = 0.293`.

This is a fit performed here, not a published constant. It is reported as such.

### 1.2 Published constants, with sources

| constant | value | units | material / conditions | source |
|---|---|---|---|---|
| clastic yield stress | **~800** | kPa | dry quarry rockfill, `d_max` 25 mm, `Cu` 2.7, poured uncompacted to `e_0 = 0.6`, 300 mm oedometer, steps 10-25-50-100-200-400-800-1600-3200 kPa | Maurer, Ovalle & Saez (2025), Geo Manitoba, open PDF, read in full |
| `E_50 = 14.3 (sigma_3/100 kPa)^0.518` | 14.3 MPa / 0.518 | MPa, - | 121 large triaxial tests, 33 rockfill and mine-waste materials | fitted here to Ovalle et al. (2020), Zenodo 3625778 |
| `E_50` at `sigma_3 = 100 kPa`, ROM waste rock | **12.0** | MPa | "ROM waste rock", `e_0 = 0.459`, `d_max` 200 mm | Bard et al. (2012), in Ovalle et al. (2020) database, row-level |
| `E_50` at `sigma_3 = 98 kPa`, natural waste rock | **13.6** | MPa | "Natural waste rock", `e_0 = 0.50` | Contreras (2011), same database |
| `E_50` at `sigma_3 = 100 kPa`, Chuquicamata waste | **13.3** | MPa | "CAD waste, parallel PSD", `e_0 = 0.45` | Linero et al. (2007), same database |
| initial void ratio of real ROM waste rock | **0.44 to 0.50** | - | four independent Chilean mine-waste materials at `d_max` 152 to 200 mm | Bard 2012, Contreras 2011, Linero 2007, Palma 2009, same database |
| `a` (Janbu stress exponent) | **0.5** | - | coarse granular soils and rockfill | Janbu (1963); reproduced by the 0.518 exponent fitted above, independently |
| compaction achievable under traffic | **5 to 15** | % of loose volume | mine waste dumps under 20 to 30 passes of a 20 t compactor or haul truck | already in `material.py:48`, `COMPACTION_BAND` |
| swell, hard rock | **30 to 45** | % | blasted hard rock | already in `material.py:44` |

**No credible published `C_c` for a ROM pile at 0 to 260 kPa was found, and that absence is itself
informative.** The rockfill literature does not tabulate `C_c` in this stress range because the
material is pre-yield there and the compression curve is not a straight line in `e`-log(sigma). Every
tabulated rockfill compressibility index found in this pass is either post-yield (above ~1 MPa) or is
a `lambda_i`/`lambda_d` pair from a suction-controlled programme, not a single `C_c`. Quoting a `C_c`
for this pile would be inventing a constant. The equivalent `C_c` back-calculated from the Janbu
integration below is **0.014 to 0.021**, and it is reported as back-calculated.

### 1.3 The magnitude for THIS geometry

Computed on the real thickness field of `data/derived/single/`, `rho = 1957 kg/m3`, `g = 9.81`,
integrating (E2)/(E4) voxel by voxel:

| depth below surface | `sigma_v` | `M` | `eps_v` | density | vs 1.957 |
|---|---|---|---|---|---|
| 0.5 m | 9.6 kPa | 3.03 MPa | 0.651 % | 1.9698 t/m3 | +0.65 % |
| 1 m | 19.2 kPa | 4.33 MPa | 0.912 % | 1.9750 | +0.92 % |
| 2 m | 38.4 kPa | 6.21 MPa | 1.276 % | 1.9823 | +1.29 % |
| 5 m | 96.0 kPa | 9.98 MPa | 1.984 % | 1.9966 | +2.02 % |
| 10 m | 192.0 kPa | 14.29 MPa | 2.772 % | 2.0128 | +2.85 % |
| 13.71 m (deepest) | 263.2 kPa | 16.82 MPa | 3.227 % | 2.0223 | +3.33 % |

Aggregates over the whole pile:

- mass-weighted mean depth below surface: **3.30 m**
- mass-weighted mean vertical stress: **63.4 kPa**
- **mass-weighted mean volumetric strain: 1.48 %**
- total settlement: **1174 m3 of 79 325 m3 (1.48 %)**
- settlement of the tallest column: **0.295 m of 13.71 m (2.2 %)**
- **full spatial spread of the density field: 1.970 to 2.022 t/m3, a range of 2.7 %**

Cross-check with (E1) over 10 to 263 kPa (1.42 log cycles), `e_0 = 0.3797`:

| `C_c` | `Delta e` | `eps_v` | density gain |
|---|---|---|---|
| 0.01 | 0.0142 | 1.03 % | +1.04 % |
| **0.02** | 0.0284 | **2.06 %** | **+2.10 %** |
| 0.03 | 0.0426 | 3.09 % | +3.19 % |
| 0.05 | 0.0710 | 5.15 % | +5.43 % |

The two estimators agree at the base of the pile within a factor well under two. **The honest answer
is 1 to 3 percent, and 1.5 percent on a mass-weighted basis.**

### 1.4 The adversarial case, stated plainly

1. **The signal is smaller than the parameter uncertainty already in the engine.** `material.py`
   carries `COMPACTION_BAND = (0.05, 0.15)` for traffic compaction, sourced and correct. Self-weight
   contributes 1.5 % mass-weighted. Modelling a 1.5 % field on top of a scalar whose own published
   band is 10 percentage points wide is adding a decimal place to a number whose first digit is
   uncertain.
2. **The signal is smaller than an existing internal inconsistency.** 1.957 in `material.py` against
   1.900 in `blocks.py` is 2.9 %. Fixing that one line is worth more than a compaction field.
3. **The pile never reaches clastic yield.** 263 kPa against ~800 kPa measured. The mechanism that
   makes rockfill compressibility large is not active anywhere in this pile.
4. **A spatial density field would not make the reconciliation claim safe, it would make it
   *sound* safe.** The dominant errors in a stockpile survey reconciliation are the loose density
   itself (swell 30 to 45 % is a 12 % spread in `rho_loose`), the traffic compaction scalar
   (10 percentage points), and moisture. Self-weight is fourth on that list by an order of magnitude.
   The honest-limit sentence in method 18 is correct today and would still be correct after
   implementing self-weight; only its *reason* would change, for the worse.

**Where the argument is weakest, and I should say so.** Coal-pile inventory practice *does* measure
density against depth: ASTM D6347/D6347M-05(2018) exists precisely to log a stockpile's bulk density
"throughout the depth of the stockpile under test", and TVA built the practice after inventory
discrepancies of 272 kt to 907 kt across 12 stockpiles, finding in-situ densities that sometimes
exceeded the assumed 1.2 t/m3. So the effect is real and the industry pays for it. Two reasons that
does not transfer: coal at 1.2 t/m3 with `e_0` near 1 is far more compressible than hard-rock ROM at
`e_0 = 0.38 to 0.50`, and utility coal piles are 15 to 30 m of a soft, size-degradable material,
whereas this pile averages 3.3 m of overburden. The TVA discrepancy was also dominated by *bookkeeping
and volume survey* error, not by a depth gradient. The transfer is directional, not quantitative.

---

## 2. Particle degradation from re-handling

### 2.1 The equations, with every symbol

**(E5) Marsal's breakage factor `B_g` (1967).** The index the rockfill literature actually uses, and
the one an independent five-index comparison found "best described the breakage behavior of rockfill
materials":

```
Delta W_k = W_ki - W_kf
B_g = sum over k of Delta W_k  for all k with Delta W_k > 0      [percent]
```

| symbol | meaning | units |
|---|---|---|
| `W_ki` | percentage by dry mass retained on sieve `k` BEFORE the event | % |
| `W_kf` | percentage by dry mass retained on sieve `k` AFTER the event | % |
| `Delta W_k` | change in percentage retained on sieve `k` | percentage points |
| `B_g` | breakage factor: the total mass fraction that moved to a smaller sieve class | % (0 to 100) |

Because `sum_k Delta W_k = 0` identically, the positive sum equals the magnitude of the negative sum.
`B_g` is therefore exactly *the percentage of the sample mass that crossed at least one sieve boundary
downward*. That interpretation is what makes it usable for a two-species coarse/fine model.

**(E6) Hardin's relative breakage `B_r` (1985).** Plot percent passing against `log10(d)`.

```
B_p = area between the INITIAL gradation curve and the vertical line d = 0.074 mm
B_t = area between the INITIAL and the FINAL gradation curves (over the same region)
B_r = B_t / B_p                                                  [0 to 1]
```

| symbol | meaning | units |
|---|---|---|
| `B_p` | breakage potential: how much breakage the material could still undergo | dimensionless area |
| `B_t` | total breakage: how much it actually underwent | dimensionless area |
| `B_r` | relative breakage | dimensionless, 0 to 1 |
| `d` | particle size; 0.074 mm is the silt cut-off below which Hardin assumes no further breakage | mm |

**(E7) Einav's fractal-limit relative breakage `B_E` (2007).** Replaces Hardin's arbitrary 0.074 mm
line with a fractal ultimate distribution, which matters for a broad ROM gradation:

```
B_E = (S_1 - S_0) / (S_2 - S_0)          with the ultimate grading  P(d) = (d / d_max)^(3 - D)
```

| symbol | meaning | units |
|---|---|---|
| `S_0`, `S_1` | area under the initial and the post-event gradation curves | dimensionless |
| `S_2` | area under the ultimate (fractal) gradation curve | dimensionless |
| `D` | fractal dimension of the ultimate distribution, typically 2.5 to 2.7 | dimensionless |
| `P(d)` | cumulative fraction finer than `d` | dimensionless |

**(E8) Indraratna's ballast breakage index `BBI` (2005)**, the repeated-trafficking analogue:

```
BBI = A / (A + B)
```

with `A` the area between the initial and post-loading gradation curves and `B` the area between the
post-loading curve and the maximum-breakage reference line, both on the percent-passing vs `log(d)`
plane. Dimensionless, 0 to 1. Included because it is the only index defined for *cyclic* rather than
monotonic loading, which is what repeated dozer passes are.

**(E9) Lee and Farhoomand's `B_15`**, the cheapest to compute and the one a two-species model could
track directly: `B_15 = d_15i / d_15f`, dimensionless, `>= 1`.

**(E10) The Tavares UFRJ damage-accumulation model, the only mechanistic per-handling-event model
found.** This is the one that would let the engine charge degradation to an *event* rather than to a
calendar. Particle fracture energies are lognormally distributed and a sub-fracture impact does not
break the particle, it *damages* it:

```
E'_f = E_f * (1 - D)

D = [ 2*gamma / (2*gamma - 5*D + 5) * (e * E_k / E_f) ]^(2*gamma/5)

E_50(d_p) = [ E_inf / (1 + k_p/k_s) ] * [ 1 + (d_0 / d_p)^phi ]

t_10 = A * [ 1 - exp( -b * (e * E_k / E_f) ) ]
```

| symbol | meaning | units | published range |
|---|---|---|---|
| `E_k` | stressing (collision) energy | J | - |
| `E_f`, `E'_f` | particle fracture energy before / after the event | J | - |
| `D` | accumulated damage | dimensionless, 0 to 1 | - |
| `gamma` | damage accumulation coefficient, the model's only fitting parameter | dimensionless | **3 to 5.4** |
| `e` | energy allocation factor, `1/(1 + k_p/k_s)`; 0.5 for two identical particles | dimensionless | 0 to 1 |
| `E_50` | median mass-specific fracture energy of the size class | J/kg | - |
| `E_inf` | residual fracture energy of very large particles | J/kg | material constant |
| `d_0` | characteristic size | mm | material constant |
| `d_p` | representative particle diameter | mm | - |
| `phi` | size exponent | dimensionless | **0.45 to 2.3** |
| `k_p`, `k_s` | particle and contacting-surface stiffness (`k_s` = 230 GPa for steel) | Pa | - |
| `t_10` | mass fraction of progeny finer than 1/10 of the parent size | % | - |
| `A` | maximum breakage parameter, the `t_10` asymptote | % | **38.8 to 76.3** |
| `b` | breakage rate parameter | dimensionless | **0.0115 to 0.0932** |

This is exactly the structure a per-pass degradation model in `bedblend` would need: an event carries
an energy, the energy accumulates damage on the parcel, and the damage converts into a `t_10` and
hence a shift in the size split. The parameter ranges above are the published material database
ranges, not values for any specific ore.

### 2.2 Published magnitudes

| what was measured | value | conditions | source |
|---|---|---|---|
| `B_g`, ROM waste rock | **6.3 %** at `sigma_3 = 100 kPa`; **7.6 %** at 200 kPa | large triaxial to failure, `d_max` 200 mm, `e_0 = 0.459` | Bard et al. (2012), in Ovalle et al. (2020) DB |
| `B_g`, Chuquicamata CAD waste | **6.4 %** at 100 kPa; **7.7 %** at 200 kPa | large triaxial to failure, parallel-graded, `d_max` 200 mm | Linero et al. (2007), same DB |
| `B_g`, natural waste rock | **6.5 %** at 98 kPa; **7.5 %** at 196 kPa | large triaxial to failure | Contreras (2011), same DB |
| `B_g`, all rockfill, `sigma_3 < 100 kPa` | median **7.7 %**, range **2.1 to 10.8** (n = 11) | large triaxial to failure | computed here over Ovalle et al. (2020) DB |
| `B_g`, all rockfill, `sigma_3` 100 to 300 kPa | median **7.7 %**, range **2.2 to 13.6** (n = 19) | large triaxial to failure | same |
| `B_g`, all rockfill, `sigma_3` 1 to 2 MPa | median **19.0 %**, range 8.1 to 43.2 (n = 30) | large triaxial to failure | same |
| coal, re-handling | **-4 mm rose from 19 % to 26 %** over **5 cycles**, i.e. +7 percentage points, +34 % relative | 80 t loaded by wheel loader and passed through a screening plant five times; described as "soft" re-handling | Wirtgen, AT Mineral Processing 06/2016 |
| sedimentary ore, re-handling | fine fraction **+24 %** over 5 cycles | same programme, -1 mm threshold | same |
| weathered coal, drops | fines generation rises with weathering age, saturating at ~6 months; **drops above 3 m should be avoided** | drop apparatus, South Blackwater coal, Gladstone port | Sahoo & Roach (2005), Powder Technology 152, 1-8 |
| iron ore pellets, repeated drops | fines accumulate to about **10 % after five drops** | single-pellet repeated drop tests | Cavalcanti et al. (2021), Powder Technology 378, 795-807 (magnitude taken from a secondary summary, **not** verified against the paper text) |
| ore degradation model validated against | repeated drops of **125-63 mm iron ore lumps** against a steel plate | continuum damage mechanics, predicts full progeny size distribution for any drop sequence | Tavares & de Carvalho (2011), Int. J. Miner. Process. 101, 21-27 |

**The key inferential step, and it is an inference, not a measurement.** `B_g` counts mass crossing
*any* sieve boundary downward. A two-species model cares only about mass crossing *one* boundary, the
coarse/fine split. For a ROM gradation spread over roughly 8 to 10 sieve classes with the split near
the middle, and one-class downshifts dominating, the fraction of `B_g` that crosses the specific split
is of order `1/8` to `1/4`. With `B_g` of 6 to 8 % per severe shear event that gives

```
Delta(coarse fraction) ~ -0.008 to -0.020   per severe shear event
```

**UNVERIFIED as a quantitative conversion.** It is a bounded order-of-magnitude argument from a
verified index, and it must be labelled as derived if it is ever used.

### 2.3 How many degradation events does this pile actually see?

From the engine, not from an assumption:

- `mean_displacement_m = 19.52` over the whole ledger; the 24 reclaim cuts carry 22.9 to 24.9 m.
- Relaxation transfers move material between *adjacent* cells only (`relax.py:neighbour_table`), so a
  hop is 2.5 m orthogonal or 3.54 m diagonal.
- Dozer `level` relays "through intermediate cells" and donors are the *nearest* cells above target
  (`docs/methods/15_dozer.md`), so most dozer hops are also cell-scale; `DEFAULT_PUSH_M = 40.0` is an
  upper bound on a single push, not a typical one.

So 19.52 m of accumulated displacement corresponds to **between about 1 event (if every metre were one
40 m push) and about 8 events (if every hop were one cell)**. The structure of both operators says the
truth is near the upper end. Taking 4 to 8 events and `-0.008 to -0.020` per event:

```
cumulative Delta(coarse fraction) over the build  ~  -0.03 to -0.16,   central estimate  -0.06
```

Sanity check against a completely independent measurement: the Wirtgen re-handling programme gives
+1.4 percentage points of -4 mm per cycle for coal, i.e. roughly 1.4 % of the mass crossing a *fine*
threshold per cycle. Five cycles moved 7 percentage points. That is the same order as the estimate
above, from a soft handling chain (loader plus screen, no blade under a tracked dozer).

---

## 3. The coupling that matters here

### 3.1 Does compaction change the tonnage a cut delivers enough to change VRR? **No.**

Computed on the baked reference case:

```
var_in  (900 offered loads, unweighted)  = 0.02728884     [manifest.stream.var_in = 0.02873124]
var_out (24 cuts x 3000 t, tonnage-weighted) = 0.00016833
VRR = 0.00617        E = 1/sqrt(VRR) = 12.73
```

Now perturb every cut's tonnage by the density anomaly a self-weight field would produce, relative to
the pile mean: **-0.8 % at the crest to +1.8 % at the deepest point**.

| perturbation | effect on `var_out`, hence on VRR |
|---|---|
| **worst case**, anomaly deliberately correlated with `(g - g_bar)^2` to maximise the shift | **+1.23 % relative** |
| uncorrelated (2000 draws), which is the physical case since depth and grade are independent here | median **-0.003 %**, 5th-95th **-0.52 % to +0.49 %** |

Against what? A variance estimated from `n = 24` cuts has a sampling standard deviation of
`sqrt(2/(n-1)) = 29.5 %` relative, so the 5th-to-95th seed band on VRR is roughly **±49 % relative**.
The self-weight effect is **40 times below the noise floor of the metric it would perturb**, and in
the physical (uncorrelated) case it is 100 times below.

On tonnage: a fixed-volume cut at the base of the pile would carry **+54 t** on a 3000 t cut, one at
the crest **-24 t**. Real, measurable, and irrelevant to every verdict this product reports.

**Verdict: implementing self-weight compaction cannot change a single VRR number the product
publishes.** It can only change the fourth significant figure of a tonnage.

### 3.2 Does degradation shift the coarse fraction enough to change the segregation result? **Yes, and it is worse than "yes".**

The segregation signal the product reports (`docs/methods/04_segregation.md`, measured on the
strong-sieving case):

```
toe-minus-apex coarse-fraction delta:  -0.010 at Sr = 0,  +0.037 at Sr = 0.5,  +0.067 at Sr = 1.0,
                                        saturating near +0.09
```

The degradation estimate above is **-0.03 to -0.16 cumulative, central -0.06**, on a coarse fraction
placed at 0.35. That is **the same size as the entire segregation signal**.

And the exposure is not uniform. It is **spatially correlated with the signal, in the same direction**:

- Dozer passes act on the working platform and the crest. That is where `level`, `push_to_crest`,
  `build_berm` and `build_ramp` all operate.
- Material that cascaded down the face to the toe is, by construction, material that *left* the dozed
  surface. It receives relaxation transfers, which are avalanches, not blade shear.

So degradation removes coarse from the crest preferentially and leaves the toe comparatively coarse.
**That is the same sign as kinetic sieving.** A degradation model added naively would *inflate* the
toe-minus-apex delta, and the product would be reporting a segregation number that is partly a
handling artefact. Conversely, *not* modelling degradation means the product currently reports a
segregation delta that a real pile would exceed for a reason that has nothing to do with Gray and
Thornton.

This is the one genuine finding of this pass. It is an honesty problem about method 4, not a tonnage
problem about method 18.

### 3.3 A defect found while measuring, which must be fixed before any of the above

`BlockModel.take_from_top` (`bedblend/blocks.py:165-187`) splits a straddling parcel like this:

```python
out.append(
    Parcel(cut, p.z1_m, p.grade, p.source_block, p.event_id, p.lift, p.area,
           p.grade_uncertainty, p.displacement_m)
)
```

`Parcel`'s field order is `..., area, grade_uncertainty, displacement_m, coarse_fraction`. The call
passes nine positional arguments and stops at `displacement_m`, so **`coarse_fraction` falls back to
its default of 0.0 on every split slice.** Reproduced by execution:

```
before: one parcel, 2.00 m thick, coarse_fraction 0.35   ->  coarse species mass 0.700
after take_from_top(1.0 m):
  moved slice : 1.00 m, coarse_fraction 0.0000
  remaining   : 1.00 m, coarse_fraction 0.3500
  coarse species mass 0.350        <- half of it is gone
```

Consequence in the baked reference case, measured on `field.json`:

```
thickness-weighted mean coarse fraction in the pile : 0.2093
material.coarse_fraction as placed                  : 0.3500
coarse-species deficit                              : 40.2 %
```

Note also that the *grade* survives the split (grade is positional argument 3) and thickness survives,
so `assert_consistent` passes, the provenance fractions still sum to 1 to 1e-12, and every gate the
product runs stays green. This is exactly the class of defect the memory note *"Audit claims vs the
engine, not just cross-page consistency"* describes: the coarse field is internally consistent
everywhere and still wrong.

It also invalidates the honest-sounding sentence in method 18 that the coarse fraction "spans 0.000 to
0.483 rather than sitting at a uniform value: only the loads that cascaded were sorted". The measured
range in the reference case is 0.000 to 0.451, and **the zeros are not unsorted loads, they are split
slices with their size information deleted.**

**Nothing about degradation can be calibrated, tested or believed until this is fixed.** A degradation
model of the right magnitude (-0.06) would be indistinguishable from, and would partly cancel, an
existing bug of the wrong magnitude (-0.14).

---

## 4. Recommendation

1. **Fix `take_from_top` to carry `coarse_fraction` through the split.** One line, plus a species-mass
   conservation test of the form `sum(thickness * coarse) is invariant under apply_transfers`. This is
   not optional and it is not part of the compaction question; it just happened to be found here.
2. **Reconcile the two densities.** `BlockModel.bulk_density_t_m3 = 1.9` should come from
   `Material.loose_density_t_m3`, not be an independent literal. The 2.9 % discrepancy is larger than
   the whole self-weight effect.
3. **Do NOT implement self-weight compaction or a spatial density field.** Rewrite the honest-limit
   paragraph in `docs/methods/18_material.md` so that it states the *measured* reason rather than a
   generic one. Proposed replacement content, transcribed from this dossier:
   - the pile's mass-weighted mean overburden is 3.3 m, 63 kPa, and its deepest point is 263 kPa;
   - published rockfill clastic yield is around 800 kPa, so the pile is entirely pre-yield;
   - the self-weight density field would run +0.7 % to +3.3 %, mass-weighted mean 1.5 %, total
     settlement 1.5 % of volume and 0.30 m at the crest;
   - the scalar traffic compaction the model already carries has a published band of 5 to 15 %, which
     dominates it, and the swell band of 30 to 45 % dominates that;
   - therefore the placed density still must not be used for a survey reconciliation, and adding a
     self-weight field would not change that, it would only hide which term is actually limiting.
4. **Treat degradation as a stated limit on METHOD 4, not on method 18, and state it quantitatively.**
   The sentence that belongs in `04_segregation.md` is roughly: *a real pile also loses coarse
   fraction to handling, of order 0.01 to 0.02 per severe shear event and plausibly 0.03 to 0.16 over
   a build of this displacement, concentrated on the dozed crest and platform; that is the same sign
   and the same magnitude as the sieving signal reported here, so the toe-minus-apex delta this
   product reports is a lower bound on what a survey would find and cannot be attributed to kinetic
   sieving alone.*
5. **If degradation is ever implemented**, do it as a per-transfer event charge with the Tavares
   damage structure (E10), driven by the transfer distance and the blade energy already available in
   `dozer.py`, with `B_g` as the calibration target and the conversion from `B_g` to the two-species
   split declared as a derived assumption. Do not implement it as a time decay or a per-lift constant;
   both would be unfalsifiable.

---

## 5. Risks and what would falsify this

- **The `E_50`-to-constrained-modulus conversion is a surrogate.** `E_50` is a triaxial secant
  deviatoric modulus; a first-loading oedometric modulus on freshly tipped material is softer. If the
  true `M` is half the value used, the mass-weighted strain becomes ~3 % rather than 1.5 %, and the
  base value ~6 %. That still does not move VRR outside the noise floor (the worst-case shift roughly
  doubles to +2.5 % relative against a ±49 % band), so the verdict is robust to a factor of two.
- **Creep is not in the estimate.** Rockfill settles logarithmically with time from delayed particle
  crushing (Sowers et al. 1965; Oldecop & Alonso 2007; Osses et al. 2024). A stockpile that sits for
  months settles more than the instantaneous estimate. Method 18 already lists "time is not modelled"
  as a limit; this dossier does not change that and does not quantify it.
- **Wetting collapse is not in the estimate and is the one mechanism that could break the verdict.**
  Oldecop and Alonso's whole point is that `lambda_d` is a function of relative humidity: rockfill
  that is wetted under load collapses. A ROM pile that sits through a wet season could settle by
  substantially more than 1.5 %, and the collapse would be *transient and spatially patchy*, which is
  a different and more interesting modelling problem than a monotonic depth gradient. Not researched
  in this pass; flagged.
- **The `B_g`-to-split conversion (section 2.2) is derived, not measured.** No source found gives the
  size-distribution shift per dozer pass on a ROM stockpile. If someone measures it and it comes out
  at -0.001 per event rather than -0.01, the degradation coupling collapses to noise as well and the
  right action becomes "state it and move on" there too.
- **The 8-hop estimate is inferred from a mean displacement, not counted.** The engine could count
  transfers per parcel directly and should, before any degradation model is calibrated. If the true
  count is 1 to 2, the cumulative shift falls to -0.01 to -0.04 and becomes comparable to the weakest
  segregation case rather than to the strongest.
- **`var_in` recomputed here (0.02728884) does not match `manifest.stream.var_in` (0.02873124),** a
  5 % discrepancy. Probably a different weighting or a different load subset. Not chased; noted
  because it is the base of every VRR the product reports and it should be reconciled.

---

## 6. Sources

Resolved live against Crossref, Zenodo, Unpaywall, or the publisher, on 2026-08-04.

| source | DOI / URL | what it gives | resolved |
|---|---|---|---|
| Ovalle, C., Linero, S., Dano, C., Bard, E., Hicher, P.-Y., Osses, R. (2020). Data compilation from large drained compression triaxial tests on coarse crushable rockfill materials. *J. Geotech. Geoenviron. Eng.* 146(9) | [10.1061/(ASCE)GT.1943-5606.0002314](https://doi.org/10.1061/(ASCE)GT.1943-5606.0002314) | the 158-test database; the paper itself paywalled | citation only |
| Ovalle et al. (2020). *Database rockfills* [dataset], CC-BY | [10.5281/zenodo.3625778](https://doi.org/10.5281/zenodo.3625778) | **downloaded and analysed here.** `B_g`, `sigma_3`, `E_50`, `e_0`, `d_max` for 158 tests on 33 materials including ROM waste rock, Chuquicamata CAD waste, Andina waste rock | yes, full data |
| Maurer, C., Ovalle, C., Saez, E. (2025). Testing and modeling the compressibility of crushable rockfill based on particle scale descriptors. 78th CGS Conf. (Geo Manitoba 2025), Winnipeg, 7 pp. | https://publications.polymtl.ca/70079/ | **read in full.** 300 mm oedometer, dry quarry rockfill poured to `e_0 = 0.6`, clastic yield at ~800 kPa | yes, full text |
| Marsal, R.J. (1967). Large scale testing of rockfill materials. *J. Soil Mech. Found. Div.* 93(SM2), 27-43 | [10.1061/JSFEAQ.0000958](https://doi.org/10.1061/JSFEAQ.0000958) | the `B_g` definition | citation only |
| Hardin, B.O. (1985). Crushing of soil particles. *J. Geotech. Eng.* 111(10), 1177-1192 | [10.1061/(ASCE)0733-9410(1985)111:10(1177)](https://doi.org/10.1061/(ASCE)0733-9410(1985)111:10(1177)) | `B_r = B_t / B_p` | citation only |
| Einav, I. (2007). Breakage mechanics, Part I: Theory. *J. Mech. Phys. Solids* 55(6), 1274-1297 | [10.1016/j.jmps.2006.11.003](https://doi.org/10.1016/j.jmps.2006.11.003) | fractal-limit relative breakage | citation only |
| Indraratna, B., Lackenby, J., Christie, D. (2005). Effect of confining pressure on the degradation of ballast under cyclic loading. *Geotechnique* 55(4), 325-328 | [10.1680/geot.2005.55.4.325](https://doi.org/10.1680/geot.2005.55.4.325) | `BBI`, the cyclic-loading breakage index | citation only |
| Li, X. et al. (2025). The influence pattern of scale effect on coarse-grained soil particle breakage. *Front. Mater.* 12:1593845 | [10.3389/fmats.2025.1593845](https://doi.org/10.3389/fmats.2025.1593845) | **read.** Explicit equation statements for `B_g`, `B_r`, `B_E`, `B_15`, `B_w`, with symbols | yes, full text |
| Khonji, A., Bagherzadeh-Khalkhali, A., Aghaei-Araei, A. (2020). Experimental investigation of rockfill particle breakage under large-scale triaxial tests using five different breakage factors. *Powder Technol.* 363, 473-487 | [10.1016/j.powtec.2020.01.032](https://doi.org/10.1016/j.powtec.2020.01.032) | **abstract read.** Marsal's index best describes rockfill breakage among five | abstract |
| Oldecop, L.A., Alonso, E.E. (2001). A model for rockfill compressibility. *Geotechnique* 51(2), 127-139 | [10.1680/geot.2001.51.2.127](https://doi.org/10.1680/geot.2001.51.2.127) | `lambda_i` / `lambda_d` two-regime compressibility, humidity control | citation only |
| Oldecop, L.A., Alonso, E.E. (2007). Theoretical investigation of the time dependent behaviour of rockfill. *Geotechnique* 57(3), 289-301 | [10.1680/geot.2007.57.3.289](https://doi.org/10.1680/geot.2007.57.3.289) | delayed crushing as the creep mechanism | citation only |
| Osses, R., Pineda, J., Ovalle, C., Linero, S., Saez, E. (2024). Scale and suction effects on compressibility and time-dependent deformation of mine waste rock material. *Eng. Geol.* 340, 107668 | [10.1016/j.enggeo.2024.107668](https://doi.org/10.1016/j.enggeo.2024.107668) | mine waste rock compressibility and creep. **Publisher blocked retrieval (403); no number in this dossier comes from it** | citation only |
| Osses, R., Majdanishabestari, K., Ovalle, C., Pineda, J. (2021). Testing and modelling total suction effects on compressibility and creep of crushable granular material. *Soils Found.* 61, 1581-1596 | [10.1016/j.sandf.2021.09.006](https://doi.org/10.1016/j.sandf.2021.09.006) | **abstract read.** Compressibility and creep both increase with stress and humidity | abstract |
| Sowers, G.F., Williams, R.C., Wallace, T.S. (1965). Compressibility of broken rock and the settlement of rockfills. *Proc. 6th ICSMFE*, Toronto, Vol. 2, 561-565 | https://www.issmge.org/publications/publication/compressibility-of-broken-rock-and-the-settlement-of-rockfills | the original log-time rockfill settlement law | citation only |
| Janbu, N. (1963). Soil compressibility as determined by oedometer and triaxial tests. *Proc. ECSMFE*, Wiesbaden, Vol. 1, 19-25 | (no DOI) | the tangent-modulus form (E2), `a = 0.5` for granular | citation only |
| Bagster, D.F. (1977). The effect of compressibility on the assessment of the contents of a stockpile. *Powder Technol.* 16(2), 193-196 | [10.1016/0032-5910(77)87006-X](https://doi.org/10.1016/0032-5910(77)87006-X) | **the closest published statement of exactly this question.** Paywalled; no number taken from it | citation only |
| Ou, T., Chen, W., Liu, J., Zhang, W., Yuan, Chen, Xue, J. (2026). On the bulk compressibility of natural iron ore fines and its impact on stockpile density. *Powder Technol.* 467, 121566 | [10.1016/j.powtec.2025.121566](https://doi.org/10.1016/j.powtec.2025.121566) | stockpile stress and density distribution vs consolidation stress and moisture, framed as a production-accounting problem. Paywalled; abstract fragments only | citation + partial abstract |
| Tavares, L.M., King, R.P. (2002). Modeling of particle fracture by repeated impacts using continuum damage mechanics. *Powder Technol.* 123(2-3), 138-146 | [10.1016/S0032-5910(01)00438-7](https://doi.org/10.1016/S0032-5910(01)00438-7) | the damage-accumulation law | citation only |
| Tavares, L.M. (2009). Analysis of particle fracture by repeated stressing as damage accumulation. *Powder Technol.* 190(3), 327-339 | [10.1016/j.powtec.2008.08.011](https://doi.org/10.1016/j.powtec.2008.08.011) | `gamma` and its size/shape dependence | citation only |
| Tavares, L.M., de Carvalho, R.M. (2011). Modeling ore degradation during handling using continuum damage mechanics. *Int. J. Miner. Process.* 101(1-4), 21-27 | [10.1016/j.minpro.2010.07.008](https://doi.org/10.1016/j.minpro.2010.07.008) | the handling-chain degradation model, validated on repeated drops of 125-63 mm iron ore lumps | citation + abstract summary |
| Altair EDEM documentation, *The Tavares UFRJ Breakage Model* | https://help.altair.com/edem/topics/creator_tree_physics/the_tavares_ufrj_breakage_model_r.htm | **read in full.** Complete equation set and published parameter ranges for `gamma`, `phi`, `A`, `b` | yes, full text |
| Sahoo, R., Roach, D. (2005). Degradation behaviour of weathered coal during handling for the COREX process of iron making. *Powder Technol.* 152(1-3), 1-8 | [10.1016/j.powtec.2005.02.001](https://doi.org/10.1016/j.powtec.2005.02.001) | **abstract read.** Drop-height threshold of 3 m, weathering dependence, cushioning by pre-existing fines | abstract |
| Sahoo, R. (2007). Degradation characteristics of steel making materials during handling. *Powder Technol.* 176(2-3), 77-87 | [10.1016/j.powtec.2007.02.013](https://doi.org/10.1016/j.powtec.2007.02.013) | degradation across a full handling chain | citation only |
| Cavalcanti, P.P., Petit, H.A., Thomazini, A.D. et al. (2021). Modeling of degradation by impact of individual iron ore pellets. *Powder Technol.* 378, 795-807 | [10.1016/j.powtec.2020.10.037](https://doi.org/10.1016/j.powtec.2020.10.037) | repeated-drop pellet degradation; the "~10 % fines after five drops" figure is from a secondary summary and is **not verified** | citation only |
| Wirtgen / *AT Mineral Processing* 06/2016, "Maximizing coal recovery by minimizing fines" | https://www.at-minerals.com/en/artikel/at_Wirtgen_Surface_Mining_Maximizing_coal_recovery_by_minimizing_fines-2598247.html | **read.** 80 t re-handled five times by wheel loader and screening plant: coal -4 mm 19 % to 26 %; sedimentary ore fines +24 %. Vendor source, not peer-reviewed | yes, full text |
| ASTM D6347/D6347M-05(2018). Standard Test Method for Determination of Bulk Density of Coal Using Nuclear Backscatter Depth Density Methods | https://store.astm.org/d6347_d6347m-05r18.html | **scope read.** The industry does measure stockpile density through the full depth, for inventory | scope only |
| Smith, S.R., Voorhis, W.M., Young, J.D. (1981). Coal pile density studies for inventory control. TVA/OP/FHP-84/6, CONF-810203-21 | https://www.osti.gov/biblio/5194498 | **abstract read.** TVA inventory discrepancies of 272 kt to 907 kt across 12 stockpiles; measured densities exceeding the assumed 1.2 t/m3 | abstract |
| Loubser, Z., de Korte, J. (2015). Investigation of factors influencing blending efficiency on circular stockpiles. *J. S. Afr. Inst. Min. Metall.* 115(8), 773-780 | [10.17159/2411-9717/2015/v115n8a15](https://doi.org/10.17159/2411-9717/2015/v115n8a15) | the VRR direction the product already pins | citation only |

### Reproducibility

The database analysis, the stress and strain integration on the real thickness field, the VRR
perturbation and the parcel-split reproduction were all run on 2026-08-04. Working files in
`E:\_Temp\stocktwin-research\` (`rockfills.xlsx` from Zenodo, `maurer2025.pdf` from PolyPublie).
Every number in sections 0, 1.3, 3.1, 3.2 and 3.3 is computed from `data/derived/single/` or from the
Zenodo dataset, not quoted.

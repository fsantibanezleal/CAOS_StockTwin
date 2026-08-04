# Method 1: mass-conserving relaxation with an imposed angle of repose

**Family:** geometry · **Rung:** classical · **Tier:** precomputed · `bedblend/relax.py`

## What it computes

A height field receives material at a point and relaxes until no local slope exceeds a critical value.
The toppling rule is the one Bak, Tang and Wiesenfeld introduced for the sandpile automaton.

## What it does NOT claim

Bak, Tang and Wiesenfeld's model describes the STATISTICS of avalanche sizes under self-organized
criticality, in which the critical slope is a free parameter of the automaton and the interesting
result is a power law. None of that is claimed. Here the critical slope is IMPOSED as the material's
angle of repose, taken from published handbook ranges, and the toppling rule is used only as a
mass-conserving relaxation solver. Avalanche statistics are out of scope.

## The equations

A cell topples exactly to its repose surface in one step. Giving away a total `T` split as
`t_k = max(0, d_k - T)` over its over-steep neighbours satisfies every constraint simultaneously and
overshoots none, and `T` solves the water-filling equation

    T = sum_k max(0, d_k - T)

which, for the `k` largest excesses, is `T = (sum of those k) / (k + 1)`. The excess to neighbour `k`
is `d_k = h_c - h_k - D_k`, and the admissible drop scales with the horizontal distance between cell
centres, because repose is a SLOPE:

    D_orth = dx tan(theta_r),        D_diag = sqrt(2) dx tan(theta_r)

Using one drop for both is the mistake that makes a relaxed cone come out square.

## Why the ordering matters

The highest unstable cell topples first, so the returned transfers are in downslope order, and that
order IS the avalanche path the segregation solver marches along. Methods 1, 4 and 8 are coupled
through this function's return value.

## Constants

Angle of repose: published handbook values for ores run from about 34 degrees (copper, Norway) to
about 60 (copper, Peru), and the value moves with size, moisture and time since dumping. The product
defaults to 37 degrees and exposes it as a control.

## Invariants, enforced by tests

* mass is conserved to machine precision, because every transfer subtracts and adds the same float;
* after convergence no local slope exceeds the imposed repose angle beyond `1e-9` m;
* a steeper material builds a measurably taller cone from the same spike;
* the first transfer of a cascade leaves the apex.

## Where it fails

Cohesive or wet material can hold local slopes above the dry repose angle, which is why the ingestion
contract flags rows above 20 percent moisture. Self-weight compaction and particle degradation from
re-handling are not modelled at all. The pad edge is a wall, so a pile that reaches the boundary is
flagged rather than losing tonnes over the edge.

## References

Bak, P., Tang, C. and Wiesenfeld, K. (1987). Self-organized criticality: an explanation of the 1/f
noise. Physical Review Letters 59(4), 381-384. doi:10.1103/PhysRevLett.59.381

Samadani, A. and Kudrolli, A. (2001). Angle of repose and segregation in cohesive granular matter.
Physical Review E 64(5), 051301. doi:10.1103/PhysRevE.64.051301

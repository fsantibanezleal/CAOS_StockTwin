# Guide: the architecture modal

The header carries an always-visible information button that opens a tabbed modal pairing one
hand-authored theme-aware SVG with a bilingual explanation, at complete depth. It is what lets a reader
SEE that the app is a real system rather than a demo.

## The five tabs

1. what the app is, plus the design-build flow
2. the lanes: what runs live in the browser, what is offline precompute, what is replay
3. the web-app flow
4. the science, with the real equations at each step
5. the two data contracts, the cases by category, and the lane gate

## How the diagrams are made

`scripts/make_arch_svgs.py` generates all five from one style vocabulary. A generator rather than five
hand-written files, because the style floor is a shared class vocabulary, a typography scale, labelled
flows and structured bands, and writing that five times guarantees the fifth drifts from the first.

## The colour rule, enforced by the generator

ZERO hardcoded colour. Every fill and stroke is a CSS variable token of the app's palette, because the
shell FETCHES and INLINES these files so they follow the theme; an `<img>` would not inherit the
variables, and a single hex would break one theme. The generator scans its own output and fails the
build if it finds one, so the rule is structural rather than a matter of discipline.

```bash
python scripts/make_arch_svgs.py
# colour guard: OK, 5 diagrams, every colour a palette token
```

## Verifying

The product gate opens the modal, asserts a dialog appeared, and asserts at least one inlined `<svg>`
rather than an `<img>`. Beyond that, look at the rendered tabs in both themes: text that leaves its box
or a muted-on-muted label is the classic failure and no predicate catches it.

#!/usr/bin/env python3
"""Generate the five ADR-0058 architecture SVGs from one style vocabulary.

WHY A GENERATOR RATHER THAN FIVE HAND-WRITTEN FILES. The ADR's style floor is a shared class
vocabulary, a typography scale, labelled flows and structured bands. Writing that out five times
guarantees the fifth one drifts from the first, and the drift is exactly what makes a diagram set look
improvised. One generator holds the vocabulary once and the five diagrams are content.

THE HARD RULE THE GENERATOR ENFORCES: ZERO HARDCODED COLOUR. Every fill and stroke is a CSS variable
token of the app's palette, because the shell FETCHES and INLINES these files so they follow the
theme; an `<img>` would not inherit the variables, and a single hex would break one theme. The only
`#` characters allowed in the output are the two marker `url(#...)` references and the fallback inside
`var(--x, #hex)`, which only applies when the variable is genuinely absent.

    python scripts/make_arch_svgs.py
"""
from __future__ import annotations

import pathlib
import sys

OUT = pathlib.Path(__file__).resolve().parent.parent / "frontend" / "public" / "svg" / "tech"

STYLE = """  <style>
    .bx  { fill: var(--color-surface-2, var(--color-surface)); stroke: var(--color-border); stroke-width: 1; }
    .bx-hi   { fill: var(--color-surface-2, var(--color-surface)); stroke: var(--color-accent); stroke-width: 1.6; }
    .bx-web  { fill: var(--color-surface-2, var(--color-surface)); stroke: var(--color-good, #3fb950); stroke-width: 1.4; }
    .bx-off  { fill: var(--color-surface-2, var(--color-surface)); stroke: var(--color-warn, #d29922); stroke-width: 1.4; }
    .bx-gate { fill: none; stroke: var(--color-warn, #d29922); stroke-width: 1.2; stroke-dasharray: 5 3; }
    .ttl { font: 600 12.5px system-ui, sans-serif; fill: var(--color-fg); }
    .sub { font: 10px system-ui, sans-serif; fill: var(--color-fg-faint); }
    .it  { font: 10.5px system-ui, sans-serif; fill: var(--color-fg-subtle); }
    .mono { font: 10px ui-monospace, monospace; fill: var(--color-accent); }
    .mu  { font: 10px system-ui, sans-serif; fill: var(--color-fg-faint); font-style: italic; }
    .lbl { font: 9.5px system-ui, sans-serif; fill: var(--color-fg-faint); }
    .hdr { font: 700 11px system-ui, sans-serif; fill: var(--color-fg-faint); letter-spacing: 0.06em; }
    .flow { fill: none; stroke: var(--color-fg-faint); stroke-width: 1.5; marker-end: url(#a); }
    .flow-hi { fill: none; stroke: var(--color-accent); stroke-width: 1.8; marker-end: url(#ah); }
  </style>
  <defs>
    <marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-fg-faint)"/>
    </marker>
    <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-accent)"/>
    </marker>
  </defs>
"""


def box(x: int, y: int, w: int, h: int, cls: str = "bx") -> str:
    return f'  <rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="6"/>\n'


def txt(x: int, y: int, s: str, cls: str = "it") -> str:
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return f'  <text class="{cls}" x="{x}" y="{y}">{s}</text>\n'


def wrap(s: str, width: int, limit: int = 3) -> list[str]:
    """Wrap to a character width. Text that leaves the viewBox is the classic filler failure."""
    out: list[str] = []
    line = ""
    for w in s.split():
        if len(line) + len(w) + 1 > width:
            out.append(line)
            line = w
        else:
            line = (line + " " + w).strip()
    out.append(line)
    return out[:limit]


def write(name: str, height: int, body: str) -> None:
    doc = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 880 {height}" width="880" '
           f'class="arch-svg" role="img">\n{STYLE}{body}</svg>\n')
    (OUT / name).write_text(doc, encoding="utf-8", newline="\n")
    print(f"wrote {name} (880 x {height})")


def the_app() -> None:
    b = txt(14, 20, "WHAT STOCKTWIN IS", "hdr")
    stages = [
        (14, 196, "The ore body", "block model or seeded deposit", "oreblocks / MineLib",
         ["per-block grade and tonnage", "bench structure, loading faces"], "bx"),
        (232, 196, "The truck stream", "one row per dump", "model/stream.py",
         ["exponential covariance in tonnes", "grade, size split, moisture"], "bx"),
        (450, 196, "The pile", "height field plus lot ledger", "model/pile.py",
         ["relaxes to the repose angle", "a lot stack per pad cell"], "bx-hi"),
        (668, 198, "The reclaim cut", "what the plant receives", "Pile.reclaim()",
         ["blended grade plus provenance", "fractions sum to one"], "bx-hi"),
    ]
    for x, w, t, sub, code, items, cls in stages:
        b += box(x, 30, w, 96, cls)
        b += txt(x + 12, 50, t, "ttl") + txt(x + 12, 64, sub, "sub") + txt(x + 12, 79, code, "mono")
        for k, it in enumerate(items):
            b += txt(x + 12, 96 + k * 14, "- " + it)
    for x0, x1, lab in [(210, 230, "dig sequence"), (428, 448, "deposit"), (646, 666, "reclaim")]:
        b += f'  <path class="flow" d="M {x0} 78 L {x1} 78"/>\n'
        b += txt(x0 - 60, 70, lab, "lbl")

    b += txt(14, 160, "THE THREE QUESTIONS IT ANSWERS", "hdr")
    qs = [
        (14, "How much did it homogenize?", "model/blending.py",
         "VRR = var_out / var_in, lower is better, always shown against the 1/N bound"),
        (302, "Where did this tonne come from?", "ReclaimCut.sources",
         "a fraction per deposition event; the sum-to-one identity is a test"),
        (590, "Is segregation biasing the cut?", "model/segregation.py",
         "Gray-Thornton (3.20); coarse at the toe is an output, not a rule"),
    ]
    for x, t, code, q in qs:
        b += box(x, 170, 276, 76, "bx-web")
        b += txt(x + 12, 190, t, "ttl") + txt(x + 12, 205, code, "mono")
        for k, ln in enumerate(wrap(q, 46)):
            b += txt(x + 12, 222 + k * 12, ln)

    b += txt(14, 276, "THE DESIGN-BUILD FLOW", "hdr")
    steps = ["deep research,|persisted", "plan,|validated", "engine, tests|and docs per unit",
             "canonical bake,|checksummed", "web build,|copies only", "deploy, verifies|and publishes"]
    for i, s in enumerate(steps):
        x = 14 + i * 145
        b += box(x, 286, 128, 52, "bx")
        for k, ln in enumerate(s.split("|")):
            b += txt(x + 10, 305 + k * 13, ln)
        if i < len(steps) - 1:
            b += f'  <path class="flow" d="M {x + 128} 312 L {x + 142} 312"/>\n'
    b += txt(14, 358, "Nothing in the documentation is recalled from memory: it is transcribed from the "
                      "persisted research at build time.", "mu")
    write("01-the-app.svg", 372, b)


def lanes() -> None:
    b = txt(14, 20, "LIVE, IN THE BROWSER", "hdr")
    b += box(14, 28, 852, 106, "bx-web")
    b += txt(28, 48, "TypeScript engine, recomputed on every control change", "ttl")
    b += txt(28, 63, "frontend/src/engine/{heightfield,segregation,pile,stacking,blending,rtd,stream,run}.ts", "mono")
    for k, it in enumerate([
        "the priority-cascade relaxation, the five stacking paths, the four reclaim geometries, the lot ledger",
        "Gray-Thornton segregation, the variance reduction ratio, the variograms, the residence-time distribution",
        "budget: 100 ms slider to redraw, 8 ms per relaxation sweep. Measured, and reported on the page.",
    ]):
        b += txt(28, 82 + k * 15, "- " + it)
    b += txt(28, 128, "Not Pyodide: a cold start plus per-frame marshalling cannot meet the 100 ms budget.", "mu")

    b += txt(14, 158, "OFFLINE, PRECOMPUTE", "hdr")
    b += box(14, 166, 418, 132, "bx-off")
    b += txt(28, 186, "The canonical bake, an explicit release operation", "ttl")
    b += txt(28, 201, "python data-pipeline/run.py", "mono")
    for k, it in enumerate([
        "31-seed credible bands per case",
        "oreblocks ore bodies, GSTools simulation",
        "surrogate training and ONNX export",
        "the complete case by metric matrix",
    ]):
        b += txt(28, 220 + k * 15, "- " + it)
    b += txt(28, 288, "Tests write only to a sandbox output root.", "mu")

    b += box(448, 166, 418, 132, "bx-off")
    b += txt(462, 186, "Discrete element, a separate conda environment", "ttl")
    b += txt(462, 201, "environment-dem.yml  ·  stlab/stages/calibrate.py", "mono")
    for k, it in enumerate([
        "a bidisperse pour calibrates the segregation number",
        "PyChrono has no pip wheel, so the lane is separate",
        "kill criterion: if it cannot run, method 7 is DELISTED",
        "and the calibration falls back to published distances",
    ]):
        b += txt(462, 220 + k * 15, "- " + it)
    b += txt(462, 288, "The Benchmark page states which path was taken.", "mu")

    b += txt(14, 324, "REPLAY", "hdr")
    b += box(14, 332, 852, 68, "bx")
    b += txt(28, 352, "The committed compact trace and its manifest", "ttl")
    b += txt(28, 367, "data/derived/<case>/trace.json  ·  data/derived/manifests/<case>.json", "mono")
    b += txt(28, 386, "First paint, and the cross-case pages. The trace carries EVENTS only: every verdict is "
                      "recomputed in the browser.")

    b += box(14, 412, 852, 42, "bx-gate")
    b += txt(28, 430, "THE GATE decides the lane by MEASUREMENT, not by intent", "ttl")
    b += txt(28, 446, "stlab/core/gate.py::classify_lane()  ->  verdict and budgets into the manifest; "
                      "CI fails on a mislabelled lane", "mono")
    write("02-lanes.svg", 468, b)


def web_flow() -> None:
    b = txt(14, 20, "THREE OPERATIONS THAT NEVER MERGE", "hdr")
    ops = [
        (14, "1. Canonical bake", "python data-pipeline/run.py",
         ["simulate, band over 31 seeds", "audit invariants and controls",
          "write trace, metrics, manifest", "content-hash every artifact"], "bx-off"),
        (302, "2. Web build", "npm run build",
         ["copy-data.mjs COPIES only", "tsc --noEmit gates the contract",
          "vite build, then spa-404.mjs", "never runs science"], "bx-web"),
        (590, "3. Deploy", "deploy-pages.yml",
         ["verify the committed hashes", "publish the audited bundle",
          "DNS plus gh api pages cname", "never trains, never re-bakes"], "bx"),
    ]
    for x, t, code, items, cls in ops:
        b += box(x, 30, 276, 110, cls)
        b += txt(x + 12, 50, t, "ttl") + txt(x + 12, 65, code, "mono")
        for k, it in enumerate(items):
            b += txt(x + 12, 84 + k * 14, "- " + it)
    b += '  <path class="flow" d="M 290 86 L 300 86"/>\n'
    b += '  <path class="flow" d="M 578 86 L 588 86"/>\n'
    b += txt(236, 78, "artifacts", "lbl")
    b += txt(528, 78, "bundle", "lbl")

    b += txt(14, 170, "THE SINGLE-PAGE APPLICATION", "hdr")
    b += box(14, 178, 560, 132, "bx-hi")
    b += txt(28, 198, "Six pages on the shared shell, plus the focus route outside it", "ttl")
    b += txt(28, 213, "src/main.tsx  ·  @fasl-work/caos-app-shell", "mono")
    for k, it in enumerate([
        "App: the workbench for ONE case, five grouped tabs on one row",
        "Introduction, Methodology, Implementation, Experiments, Benchmark",
        "/focus/:caseId renders OUTSIDE AppShell, because the header and",
        "footer are exactly the chrome a focus view exists to escape",
    ]):
        b += txt(28, 232 + k * 15, "- " + it)
    b += txt(28, 300, "The entry control lives in the App rail. A route with no entry control is an orphan.", "mu")

    b += box(590, 178, 276, 132, "bx")
    b += txt(604, 198, "The two drift guards", "ttl")
    b += txt(604, 214, "lib/contract.types.ts", "mono")
    b += txt(604, 232, "- a TypeScript mirror of the artifact")
    b += txt(604, 246, "  schema, so a drift fails tsc")
    b += txt(604, 266, "scripts/export_cases.py --check", "mono")
    b += txt(604, 284, "- the case registry is GENERATED,")
    b += txt(604, 298, "  and CI fails when it is stale")

    b += txt(14, 340, "WHAT THE BROWSER RECOMPUTES", "hdr")
    b += box(14, 348, 852, 64, "bx-web")
    b += txt(28, 368, "Every verdict on the page is derived live from the trace events", "ttl")
    b += txt(28, 383, "engine/run.ts::measure()  ·  engine/blending.ts  ·  engine/rtd.ts", "mono")
    b += txt(28, 402, "The trace carries NO baked ratio: a reader changes a control, watches the number move, "
                      "and knows it was derived.")
    write("03-web-flow.svg", 426, b)


def the_science() -> None:
    b = txt(14, 20, "THE CHAIN, WITH THE EQUATION AT EACH STEP", "hdr")
    rows = [
        (30, "Grade stream", "model/stream.py",
         "C(h) = sill exp(-3h/a), generated exactly by a one-step recursion in cumulative tonnage",
         "Autocorrelation is the point: correlated layers are not independent samples.", "bx"),
        (118, "Relaxation", "heightfield.py::cascade",
         "T = sum_k max(0, d_k - T);   t_k = max(0, d_k - T);   D_orth = dx tan(theta_r)",
         "The highest unstable cell topples first, so the transfers ARE the avalanche path.", "bx-hi"),
        (206, "Segregation", "model/segregation.py",
         "d(phi)/dx + d/dz[ -Sr phi (1 - phi) ] = 0,   zero flux at the free surface and the base",
         "Gray and Thornton (3.20), Godunov flux. Coarse at the toe is an OUTPUT.", "bx-hi"),
        (294, "Lot ledger", "model/pile.py::Pile",
         "g_cut = sum m_i g_i / sum m_i;   f_e = sum_(e_i = e) m_i / sum m_i;   sum_e f_e = 1",
         "A lot stack per cell. The sum-to-one identity is checked on every cut of every case.", "bx-hi"),
        (382, "Blending metrics", "model/blending.py",
         "VRR = var_out / var_in  (lower is better);   VRR_ideal = 1/N;   E = sigma_in/sigma_out = sqrt(N)",
         "Tonnage base, per Kumral. The ideal bound is DERIVED and labelled as derived.", "bx-web"),
        (470, "Residence time", "model/rtd.py",
         "tau = sum m_i (t_out - t_in) / sum m_i;   dimensionless spread = sigma^2 / tau^2",
         "FIFO and LIFO references walked for the SAME event sequence, not approximated.", "bx-web"),
    ]
    for y, t, code, eq, note, cls in rows:
        b += box(14, y, 852, 76, cls)
        b += txt(28, y + 20, t, "ttl")
        b += txt(160, y + 20, code, "mono")
        b += txt(28, y + 41, eq)
        b += txt(28, y + 59, note, "mu")
        if y < 470:
            b += f'  <path class="flow-hi" d="M 440 {y + 76} L 440 {y + 86}"/>\n'
    b += txt(14, 570, "The one free parameter in the whole chain is the segregation number Sr, and "
                      "stlab/stages/calibrate.py publishes its residual.", "mu")
    write("04-the-science.svg", 584, b)


def contracts() -> None:
    b = txt(14, 20, "CONTRACT 1 · INGESTION · THE BRING-YOUR-OWN-DATA GATE", "hdr")
    b += box(14, 28, 852, 132, "bx-hi")
    b += txt(28, 48, "A truck dump log, validated column by column", "ttl")
    b += txt(28, 63, "stlab/io/contract.py::validate_rows()", "mono")
    for k, it in enumerate([
        "REJECT on a hard range, with the reason recorded and counted. Nothing is silently coerced:",
        "a coerced row looks like data and is not. Out-of-order timestamps and off-pad dumps are rejected too.",
        "FLAG on a soft check: kept, counted, carried into the manifest, and rendered with a marker.",
        "The soft checks are a grade beyond four robust sigmas of the file median, and moisture above",
        "20 percent, because the dry angle of repose stops being valid for wet handling.",
    ]):
        b += txt(28, 82 + k * 15, "- " + it)
    b += txt(28, 154, "The table on the Implementation page is GENERATED from this code, so documentation "
                      "cannot drift from behaviour.", "mu")

    b += txt(14, 190, "CONTRACT 2 · ARTIFACT · PROCESSING TO WEB", "hdr")
    b += box(14, 198, 418, 132, "bx-off")
    b += txt(28, 218, "The manifest", "ttl")
    b += txt(28, 233, "stlab/core/manifest.py", "mono")
    for k, it in enumerate([
        "a PURE function of parameters and seed",
        "no wall-clock, no host name, no absolute path",
        "case, reason, expected band, kill criterion",
        "artifact sha256 and bytes, lane verdict, budgets",
        "flags, metrics with their band, regen command",
    ]):
        b += txt(28, 252 + k * 15, "- " + it)

    b += box(448, 198, 418, 132, "bx-off")
    b += txt(462, 218, "The compact trace", "ttl")
    b += txt(462, 233, "stlab/core/trace.py", "mono")
    for k, it in enumerate([
        "EVENTS and geometry only: the dumps, the cuts,",
        "the provenance fractions, the height snapshots",
        "NO verdicts. The ratio, the variograms, the",
        "efficiency and the recommendation are all",
        "recomputed in the browser from those events.",
    ]):
        b += txt(462, 252 + k * 15, "- " + it)

    b += txt(14, 360, "THE CASES ARE THE VALIDATION DESIGN", "hdr")
    cats = [
        (14, "Stacking geometry", "5 cases", "chevron, windrow, cone shell, strata, chevcon"),
        (188, "Reclaim method", "3 cases", "bucket wheel, end, loader; full-face is the reference"),
        (362, "Input variability", "4 cases", "short range, long range, trending, bimodal"),
        (536, "Segregation regime", "2 cases", "strong kinetic sieving, the stratifying regime"),
        (710, "Controls", "3 cases", "perfect mixer, zero segregation, starvation"),
    ]
    for x, t, n, note in cats:
        b += box(x, 368, 156, 90, "bx-gate" if t == "Controls" else "bx")
        b += txt(x + 10, 388, t, "ttl")
        b += txt(x + 10, 404, n, "mono")
        for k, ln in enumerate(wrap(note, 24)):
            b += txt(x + 10, 422 + k * 12, ln)
    b += txt(14, 480, "Splits are by seed AND input structure: splitting by seed alone would leak the shape "
                      "of the stream. All seventeen cases are held out.", "mu")
    b += txt(14, 496, "Real lane: MineLib block models are fetched at RUNTIME into browser memory. Never "
                      "committed, never bundled, never fetched by CI.", "mu")
    write("05-data-contracts.svg", 510, b)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    the_app()
    lanes()
    web_flow()
    the_science()
    contracts()

    # The colour guard: every fill and stroke must be a palette token. The only '#' allowed in the
    # output is a marker reference or a var() fallback, and this check makes that structural.
    bad = []
    for f in sorted(OUT.glob("*.svg")):
        for i, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            for pos, ch in enumerate(line):
                if ch != "#":
                    continue
                tail = line[pos:]
                if tail.startswith("#a)") or tail.startswith("#ah)"):
                    continue  # a marker reference, url(#a) / url(#ah), not a colour
                if tail.startswith('#a"') or tail.startswith('#ah"'):
                    continue  # the marker id attribute itself
                before = line[:pos]
                if before.rstrip().endswith(","):  # a var(--x, #hex) fallback
                    continue
                bad.append(f"{f.name}:{i}: {line.strip()[:90]}")
    if bad:
        print("HARDCODED COLOUR FOUND, one hex breaks one theme:")
        for x in bad:
            print("  " + x)
        return 1
    print(f"colour guard: OK, {len(list(OUT.glob('*.svg')))} diagrams, every colour a palette token")
    return 0


if __name__ == "__main__":
    sys.exit(main())

# The data contracts

Both contracts, and the reasoning behind them, are in [data-contract.md](../data-contract.md), which
is GENERATED from the code that enforces them so the documentation cannot drift from the behaviour.

This page holds only the part no code can derive: why the split exists.

## Why two, and not one

The two contracts guard opposite directions and fail differently.

**Contract 1 guards the way IN.** It exists so the product can be applied to data it has never seen.
Without it, a product only ever replays its own baked cases and the "bring your own data" claim is
empty. Its failure mode is a plausible-looking row that is wrong: a grade in parts per million read as
a percentage, a tonnage from a different truck class, a timestamp in the wrong timezone. Those cannot
be detected downstream, because by then they look exactly like data. So the gate rejects on a hard
range with a stated reason and flags on a soft one, and coerces nothing.

**Contract 2 guards the way OUT.** It exists so what the browser reads is provably what the bake
wrote. Its failure mode is silent divergence: the writer adds a field, the reader keeps reading the
old shape, and a panel quietly shows a stale or default number. A TypeScript mirror of the schema
turns that into a build failure.

## Why the trace carries no verdicts

The temptation is to bake the variance reduction ratio into the artifact: it is already computed, and
the page could just read it. That would make the number unfalsifiable. A reader who changes a control
and watches the value move knows it was derived; a reader looking at a value fetched from a file has
no way to tell it apart from a caption. So the trace carries events and geometry, and every verdict is
recomputed in the browser.

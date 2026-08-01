# GSTools, configuration that matters

The range convention is the trap, and it is worth stating explicitly. This
product quotes the PRACTICAL range: the lag at which the model reaches 95 percent of its sill.
GSTools parameterises by `len_scale`. For the exponential model the practical range is `3 * len_scale`;
for the Gaussian it is `sqrt(3) * len_scale`.

Passing a practical range straight in as `len_scale` produces a field whose true range is three times
what every label says, and every recovery test then passes against the wrong truth. The lane converts
explicitly and a round-trip test asserts it.

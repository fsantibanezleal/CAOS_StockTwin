# uPlot, configuration that matters

Stroke colours must be resolved hex, not CSS variables. A canvas cannot resolve
`var(--color-accent)`, and passing one draws nothing at all while reporting no error, which is how a
blank chart survives a green build.

The x-scale must be given a range at construction or after `setData`. A chart built with empty data
never ranges its x-scale, and then silently draws nothing even once real data arrives.

# bedblend, configuration that matters

`RunConfig` is the whole control surface, and the App's rail is exactly its
field set. The parameters that change an answer rather than a picture:

| field | what it decides |
|---|---|
| `n_passes` | the layer count, the N of the 1/N bound, and the dominant term in every result |
| `reclaim` | which cells a machine engages and how deep it reaches, which sets how many layers a cut crosses |
| `sr` | the Gray-Thornton segregation number. `0` is the passive-tracer limit and the negative control |
| `cut_tonnes` | the parcel the plant receives |
| `repose_deg` / `repose_coarse_deg` | the material. A positive difference is the Makse stratification condition |

`PadSpec` fixes the geometry. `case_id` is carried through untouched; the engine never interprets it.

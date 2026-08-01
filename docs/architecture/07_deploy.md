# Deploy

A static site on GitHub Pages over a custom domain, no backend.

## Why this class

The repository is public, the payload is small (traces are capped at 2 MB per case by the gate), and
there is no server state, no auth-gated data and no request-time compute. The `app/` FastAPI module
ships dormant with a README saying so, and CI import-smoke-tests it so it cannot rot.

## The two-step go-live, both required

Under Actions-based Pages the `public/CNAME` file does NOT set the custom domain: the domain reaches
GitHub and returns 404. Both of these are needed.

1. DNS: `stocktwin CNAME fsantibanezleal.github.io`, DNS-only, overriding the wildcard.
2. `gh api --method PUT .../pages -f cname=stocktwin.fasl-work.com`, cname only. Adding
   `https_enforced` errors until the certificate exists; enforce HTTPS after it provisions, then
   re-run the deploy.

Pages must be enabled with `gh api ... -f build_type=workflow` before the first deploy.

## Deep links

`spa-404.mjs` copies the built `index.html` to `404.html` as a postbuild step, so a hard navigation or
a refresh on `/focus/<case>` returns the SPA shell and the router resolves the path.

## What deploy must never do

Train a model, retune a threshold, regenerate the canonical benchmark, or replace a scientific
artifact. It verifies hashes and publishes an already-audited bundle.

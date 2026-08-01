# Guide: run the dormant API

`app/` ships a FastAPI module that is DORMANT. The product is a static deterministic-replay viewer with
a live in-browser engine: there is no server state, no auth-gated data and no request-time compute, so
no trigger for a backend applies.

The module exists, compiles and is import-smoke-tested in CI so it cannot rot, and it is here for the
day one of those triggers does apply.

## When it would be activated

* uploaded data that must be processed server-side rather than in the browser;
* auth-gated private data that must not be shipped to a client;
* compute too heavy for the interaction budget, where the browser is the wrong place.

None of those is true today. A large user file is processed in the browser, which is also the honest
privacy answer: the data never leaves the machine.

## If you activate it

```bash
pip install -r requirements-api.txt
uvicorn app.main:app --reload
```

Keep it a thin layer over `stlab.model`. It must never re-implement the science: two implementations of
the same method drift, and the one nobody is looking at drifts first.

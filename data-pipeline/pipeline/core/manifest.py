"""CONTRACT 2, the manifest: the authoritative, versioned record of a baked case.

The web loads only manifests and artifacts, and ``frontend/src/lib/contract.types.ts`` mirrors this
schema so a drift fails the build. The manifest is a pure function of ``(params, seed)``: no
wall-clock, no host name, no absolute path, because a manifest that changes on every re-run makes the
git history of the scientific evidence useless for telling a real change from a re-bake.

What it carries: what the case is and why it is in the matrix, the parameters and seed that produced
it, the engine and its version, the artifact pointer and its byte size and hash, the lane verdict with
its budgets, the flags CONTRACT 1 raised, and the measured metrics with their multi-seed band.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any

from .. import __version__
from .trace import TRACE_SCHEMA

MANIFEST_SCHEMA = "stocktwin.manifest/v1"
INDEX_SCHEMA = "stocktwin.index/v1"


def content_hash(obj: Any) -> str:
    """SHA-256 of the canonical JSON encoding, so two bakes of the same case are provably identical."""
    data = json.dumps(obj, separators=(",", ":"), sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def build_case_manifest(
    *,
    case: Any,
    seed: int,
    artifact_rel: str,
    trace_bytes: int,
    trace_sha256: str,
    gate: dict,
    flags: list[dict],
    metrics: dict,
    provenance: dict,
) -> dict:
    return {
        "schema": MANIFEST_SCHEMA,
        "case_id": case.id,
        "category": case.category,
        "reason": case.reason,
        "real_or_synthetic": case.real_or_synthetic,
        "expected_band": case.expected_band,
        "kill_criterion": case.kill_criterion,
        "split": case.split,
        "engine": {
            "package": "stlab",
            "version": __version__,
            "model": ("relaxation with an imposed repose angle, Gray-Thornton kinetic segregation, "
                      "per-cell lot ledger"),
        },
        "params": case.as_params_dict(),
        "seed": seed,
        "artifact": {
            "path": artifact_rel, "format": "json",
            "trace_schema": TRACE_SCHEMA, "bytes": trace_bytes, "sha256": trace_sha256,
        },
        "lane": gate["lane"],
        "gate": gate,
        "flags": flags,
        "metrics": metrics,
        "provenance": provenance,
        "regen": f"python -m pipeline.pipeline {case.id} --seed {seed}",
    }


def build_index(entries: list[dict]) -> dict:
    """The flat authoritative inventory the app reads first."""
    return {
        "schema": INDEX_SCHEMA,
        "engine_version": __version__,
        "n_cases": len(entries),
        "cases": sorted(entries, key=lambda e: e["case_id"]),
    }

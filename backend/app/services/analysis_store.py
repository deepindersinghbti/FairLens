from __future__ import annotations

from typing import Any


# In-memory store for latest analysis per dataset + mode.
_analysis_cache: dict[str, dict[str, Any]] = {}


def _cache_key(dataset_id: str, analysis_type: str) -> str:
    return f"{dataset_id}:{analysis_type}"


def save_analysis_result(dataset_id: str, analysis_type: str, result: dict[str, Any]) -> None:
    _analysis_cache[_cache_key(dataset_id, analysis_type)] = result


def get_analysis_result(dataset_id: str, analysis_type: str) -> dict[str, Any] | None:
    return _analysis_cache.get(_cache_key(dataset_id, analysis_type))

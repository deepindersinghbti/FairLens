from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any


# In-memory store for latest analysis per dataset + mode (legacy support).
_analysis_cache: dict[str, dict[str, Any]] = {}

# In-memory store for analyses with unique IDs and timestamps.
_analysis_store: dict[str, dict[str, Any]] = {}


def _cache_key(dataset_id: str, analysis_type: str) -> str:
    return f"{dataset_id}:{analysis_type}"


def save_analysis_result(dataset_id: str, analysis_type: str, result: dict[str, Any]) -> None:
    """Save analysis result to legacy cache (keyed by dataset_id + analysis_type)."""
    _analysis_cache[_cache_key(dataset_id, analysis_type)] = result


def get_analysis_result(dataset_id: str, analysis_type: str) -> dict[str, Any] | None:
    """Get analysis result from legacy cache."""
    return _analysis_cache.get(_cache_key(dataset_id, analysis_type))


def save_analysis_with_id(analysis: dict[str, Any]) -> str:
    """
    Save analysis result with a unique ID and timestamp.
    
    Returns the analysis_id.
    TTL: 24 hours from now.
    """
    analysis_id = str(uuid.uuid4())
    now_utc = datetime.now(timezone.utc)
    expires_at = now_utc + timedelta(hours=24)
    
    _analysis_store[analysis_id] = {
        "data": analysis,
        "created_at": now_utc.isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    
    return analysis_id


def get_analysis_by_id(analysis_id: str) -> dict[str, Any] | None:
    """
    Get analysis result by unique ID.
    
    Returns None if expired or not found.
    """
    entry = _analysis_store.get(analysis_id)
    if entry is None:
        return None
    
    # Check if expired
    expires_at_str = entry.get("expires_at")
    if expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.now(timezone.utc) > expires_at:
            # Clean up expired entry
            del _analysis_store[analysis_id]
            return None
    
    return entry.get("data")


def cleanup_expired_analyses() -> int:
    """
    Clean up expired analysis entries.
    
    Returns the number of entries deleted.
    """
    now = datetime.now(timezone.utc)
    expired_ids = [
        aid for aid, entry in _analysis_store.items()
        if datetime.fromisoformat(entry.get("expires_at", "")) < now
    ]
    
    for aid in expired_ids:
        del _analysis_store[aid]
    
    return len(expired_ids)

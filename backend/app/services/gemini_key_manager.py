"""
Gemini API Key Manager for multi-key rotation and fallback.

Supports two environment variable formats:
1. GEMINI_API_KEY=single_key (single key, backward compatible)
2. GEMINI_API_KEYS=key1,key2,key3 (comma-separated, preferred for multiple)

If both are set, GEMINI_API_KEYS takes precedence.

This module maintains a module-level singleton that manages:
- Loading and parsing keys from environment
- Round-robin key rotation across requests (thread-safe)
- Error classification (retryable vs non-retryable)
- Safe key masking for logging (never exposes full keys)
"""

import logging
import os
import threading
from typing import Optional

logger = logging.getLogger(__name__)


def _mask_key(api_key: Optional[str]) -> str:
    """
    Mask an API key for safe logging.

    Examples:
    - None/empty -> "[no key]"
    - "AIza..." (16+ chars) -> "****abcd" (last 4 chars)
    - "short" (< 16 chars) -> "****ort" (last 3 chars)
    """
    if not api_key:
        return "[no key]"
    if len(api_key) < 8:
        return "****" + api_key[-3:] if len(api_key) > 3 else "****"
    return "****" + api_key[-4:]


def load_gemini_keys() -> list[str]:
    """
    Load Gemini API keys from environment variables.

    Priority:
    1. GEMINI_API_KEYS (comma-separated, e.g., "key1,key2,key3")
    2. GEMINI_API_KEY (fallback for single key)

    Returns:
    - List of non-empty, trimmed keys
    - Empty list if neither is set
    - Handles spaces around commas and removes blanks

    Examples:
    - GEMINI_API_KEYS="key1, key2, key3" -> ["key1", "key2", "key3"]
    - GEMINI_API_KEYS="key1,,key2," -> ["key1", "key2"]
    - GEMINI_API_KEY="single" (no GEMINI_API_KEYS) -> ["single"]
    """
    # Try multi-key format first (preferred)
    multi_keys_raw = os.getenv("GEMINI_API_KEYS", "").strip()
    if multi_keys_raw:
        # Parse comma-separated list, trim each key, filter out blanks
        keys = [k.strip() for k in multi_keys_raw.split(",")]
        keys = [k for k in keys if k]  # Remove empty strings
        if keys:
            logger.debug(
                "Loaded %d Gemini API keys from GEMINI_API_KEYS",
                len(keys),
            )
            return keys

    # Fallback to single key (backward compatible)
    single_key = os.getenv("GEMINI_API_KEY", "").strip()
    if single_key:
        logger.debug("Loaded 1 Gemini API key from GEMINI_API_KEY")
        return [single_key]

    logger.warning(
        "No Gemini API keys found in GEMINI_API_KEY or GEMINI_API_KEYS"
    )
    return []


class GeminiKeyManager:
    """
    Manages Gemini API key rotation and error classification.

    Features:
    - Round-robin rotation: distributes requests across keys
    - Thread-safe: protects key index with a lock for concurrent requests
    - Error classification: retryable (quota/rate limit) vs non-retryable (bad request)
    - Safe logging: never exposes actual keys, only masks
    - Max retries: limited to number of available keys to prevent infinite loops

    Usage:
    >>> manager = GeminiKeyManager()
    >>> if manager.has_keys():
    ...     key = manager.get_next_key()
    ...     try:
    ...         response = call_gemini_api(key)
    ...     except Exception as e:
    ...         manager.mark_key_failed(is_retryable=_is_retryable_error(e))
    ...         # Try next key or give up
    """

    def __init__(self, keys: Optional[list[str]] = None):
        """
        Initialize key manager with provided keys or load from environment.

        Args:
            keys: Optional list of API keys. If None, loads from environment.
        """
        if keys is None:
            keys = load_gemini_keys()
        self.keys = keys
        self.current_index = 0
        self._lock = threading.Lock()  # Thread-safety for key rotation
        logger.debug(
            "GeminiKeyManager initialized with %d key(s)", len(self.keys)
        )

    def has_keys(self) -> bool:
        """Check if any keys are available."""
        return len(self.keys) > 0

    def get_next_key(self) -> str:
        """
        Get the current key and rotate to the next one (thread-safe).

        Uses round-robin: key0 -> key1 -> key2 -> key0 -> ...

        Returns:
            The current API key (never masked in return value).

        Raises:
            ValueError if no keys are available.
        """
        if not self.has_keys():
            raise ValueError("No Gemini API keys available")

        with self._lock:
            key = self.keys[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.keys)
            current_idx = self.current_index - 1

        logger.debug(
            "Using Gemini API key %d/%d (masked: %s)",
            current_idx,
            len(self.keys),
            _mask_key(key),
        )
        return key

    def mark_key_failed(self, is_retryable: bool = False, reason: str | None = None) -> None:
        """
        Mark the current key as failed and log the failure.

        In round-robin mode, this doesn't block the key; we'll try it again
        after cycling through other keys. The caller is responsible for
        deciding when to give up after max attempts.

        Args:
            is_retryable: True if error is quota/rate-limit (should try next key).
                         False if error is bad request (should not rotate).
            reason: Optional short category or message explaining failure (e.g., 'quota', 'auth').
        """
        with self._lock:
            failed_idx = (self.current_index - 1) % len(self.keys)
            failed_key = self.keys[failed_idx]
            next_idx = self.current_index % len(self.keys)
            next_key_masked = _mask_key(
                self.keys[next_idx]) if self.keys else "[no key]"

        reason_text = f" ({reason})" if reason else ""
        if is_retryable:
            logger.info(
                "[Gemini] Key %s failed with retryable%s. Switching to next key %s.",
                _mask_key(failed_key),
                reason_text,
                next_key_masked,
            )
        else:
            logger.info(
                "[Gemini] Key %s failed with non-retryable%s. Stopping rotation.",
                _mask_key(failed_key),
                reason_text,
            )

    def get_max_attempts(self) -> int:
        """
        Get maximum number of key attempts for a single request.

        Prevents infinite retry loops:
        - If 3 keys available, max 3 attempts per request
        - Prevents cycling through the same key infinitely
        """
        return max(1, len(self.keys))


def _is_retryable_error(error: Exception) -> bool:
    """
    Classify an exception as retryable (quota/rate limit) or not.

    Retryable errors (try next key):
    - HTTP 429 (Too Many Requests)
    - RESOURCE_EXHAUSTED (Gemini SDK quota error)
    - Quota or rate limit in message
    - HTTP 500, 502, 503, 504 (temporary server errors)

    Non-retryable errors (give up on key):
    - HTTP 400 (Bad Request)
    - 401 (Unauthorized)
    - 403 (Forbidden)
    - Validation errors (bad prompt, parsing errors)

    Args:
        error: The exception to classify.

    Returns:
        True if error is retryable (should try next key).
        False if error is non-retryable (should not rotate).
    """
    error_str = str(error).lower()
    error_type = type(error).__name__.lower()

    # Check exception type (google.generativeai SDK specific)
    if "resourceexhausted" in error_type:
        return True
    if "ratelimit" in error_type:
        return True

    # Check for HTTP status codes in error message
    retryable_codes = {429, 500, 502, 503, 504}
    for code in retryable_codes:
        if f"({code})" in error_str or f"http {code}" in error_str or str(code) in error_str:
            return True

    # Check for quota/rate limit keywords
    quota_keywords = {
        "quota",
        "rate limit",
        "rate_limit",
        "too many requests",
        "resource exhausted",
        "exceeded",
    }
    for keyword in quota_keywords:
        if keyword in error_str:
            return True

    # Default: non-retryable (e.g., 400, 401, 403, validation errors)
    return False


def classify_error(error: Exception) -> tuple[bool, str]:
    """
    Classify an exception into (is_retryable, category).

    Categories (examples):
      - 'quota'        -> quota/rate limit (429, RESOURCE_EXHAUSTED)
      - 'server'       -> temporary server errors (500/502/503/504)
      - 'auth'         -> auth/config errors (401/403)
      - 'bad_request'  -> client errors (400)
      - 'validation'   -> parsing/validation errors
      - 'other'        -> unknown

    Returns:
        (is_retryable: bool, category: str)
    """
    error_str = str(error).lower()
    error_type = type(error).__name__.lower()

    # RESOURCE_EXHAUSTED / rate limit
    if "resourceexhausted" in error_type or "ratelimit" in error_type:
        return True, "quota"

    # 429 or quota keywords
    if "(429)" in error_str or "429" in error_str or any(k in error_str for k in ("quota", "rate limit", "too many requests", "exceeded")):
        return True, "quota"

    # Server errors
    for code in (500, 502, 503, 504):
        if f"({code})" in error_str or f"http {code}" in error_str or str(code) in error_str:
            return True, "server"

    # Auth/config
    if "(401)" in error_str or "401" in error_str or "(403)" in error_str or "403" in error_str:
        return False, "auth"

    # Bad request
    if "(400)" in error_str or "400" in error_str or "bad request" in error_str:
        return False, "bad_request"

    # Parsing/validation
    if "parse" in error_str or "validation" in error_str or "invalid" in error_str:
        return False, "validation"

    return False, "other"


# Module-level singleton for key management across requests
_global_key_manager: Optional[GeminiKeyManager] = None


def get_gemini_key_manager() -> GeminiKeyManager:
    """
    Get or create the module-level singleton key manager.

    This ensures round-robin state persists across requests.
    """
    global _global_key_manager
    if _global_key_manager is None:
        _global_key_manager = GeminiKeyManager()
    return _global_key_manager


def reset_gemini_key_manager() -> None:
    """
    Reset the global key manager (primarily for testing).

    Reloads keys from environment and resets rotation index.
    """
    global _global_key_manager
    _global_key_manager = GeminiKeyManager()

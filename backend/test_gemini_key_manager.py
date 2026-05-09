"""
Unit tests for Gemini Key Manager.

Tests key loading, rotation, and error classification.
"""

import os
import pytest
from unittest.mock import patch

from app.services.gemini_key_manager import (
    load_gemini_keys,
    GeminiKeyManager,
    _is_retryable_error,
    _mask_key,
)


class TestMaskKey:
    """Test key masking for safe logging."""

    def test_mask_none(self):
        """None should be masked as [no key]."""
        assert _mask_key(None) == "[no key]"

    def test_mask_empty(self):
        """Empty string should be masked as [no key]."""
        assert _mask_key("") == "[no key]"

    def test_mask_short_key(self):
        """Short key should show last 3 chars."""
        result = _mask_key("short")
        assert result == "****ort"

    def test_mask_long_key(self):
        """Long key should show last 4 chars."""
        result = _mask_key("AIzaSyDLLTCzL4M0q0KFnXz1234567890abcdef")
        assert result == "****cdef"


class TestLoadGeminiKeys:
    """Test loading keys from environment variables."""

    def test_load_from_gemini_api_keys_single(self):
        """Load single key from GEMINI_API_KEYS."""
        with patch.dict(os.environ, {"GEMINI_API_KEYS": "key1"}):
            keys = load_gemini_keys()
            assert keys == ["key1"]

    def test_load_from_gemini_api_keys_multiple(self):
        """Load multiple keys from GEMINI_API_KEYS (comma-separated)."""
        with patch.dict(os.environ, {"GEMINI_API_KEYS": "key1,key2,key3"}):
            keys = load_gemini_keys()
            assert keys == ["key1", "key2", "key3"]

    def test_load_from_gemini_api_keys_with_spaces(self):
        """Load keys with spaces after commas (should be trimmed)."""
        with patch.dict(os.environ, {"GEMINI_API_KEYS": "key1, key2 , key3"}):
            keys = load_gemini_keys()
            assert keys == ["key1", "key2", "key3"]

    def test_load_from_gemini_api_keys_with_empty_values(self):
        """Load keys with empty values (should be ignored)."""
        with patch.dict(os.environ, {"GEMINI_API_KEYS": "key1,,key2,,key3,"}):
            keys = load_gemini_keys()
            assert keys == ["key1", "key2", "key3"]

    def test_load_fallback_to_gemini_api_key(self):
        """Fallback to GEMINI_API_KEY if GEMINI_API_KEYS not set."""
        with patch.dict(
            os.environ,
            {"GEMINI_API_KEY": "single_key", "GEMINI_API_KEYS": ""},
            clear=False,
        ):
            keys = load_gemini_keys()
            assert keys == ["single_key"]

    def test_load_gemini_api_keys_takes_precedence(self):
        """GEMINI_API_KEYS takes precedence over GEMINI_API_KEY."""
        with patch.dict(
            os.environ,
            {"GEMINI_API_KEY": "old_key", "GEMINI_API_KEYS": "new_key1,new_key2"},
        ):
            keys = load_gemini_keys()
            assert keys == ["new_key1", "new_key2"]

    def test_load_no_keys_available(self):
        """Return empty list if no keys configured."""
        with patch.dict(os.environ, {}, clear=True):
            keys = load_gemini_keys()
            assert keys == []

    def test_load_only_whitespace(self):
        """Ignore only-whitespace values."""
        with patch.dict(os.environ, {"GEMINI_API_KEYS": "  ,  ,  "}):
            keys = load_gemini_keys()
            assert keys == []


class TestGeminiKeyManager:
    """Test GeminiKeyManager round-robin rotation."""

    def test_has_keys_true(self):
        """has_keys() should return True when keys are available."""
        manager = GeminiKeyManager(["key1", "key2"])
        assert manager.has_keys() is True

    def test_has_keys_false(self):
        """has_keys() should return False when no keys available."""
        manager = GeminiKeyManager([])
        assert manager.has_keys() is False

    def test_get_next_key_round_robin(self):
        """get_next_key() should rotate through keys in round-robin order."""
        manager = GeminiKeyManager(["key1", "key2", "key3"])

        # First rotation
        assert manager.get_next_key() == "key1"
        assert manager.get_next_key() == "key2"
        assert manager.get_next_key() == "key3"

        # Second rotation (should wrap around)
        assert manager.get_next_key() == "key1"
        assert manager.get_next_key() == "key2"

    def test_get_next_key_single_key(self):
        """get_next_key() with single key should cycle indefinitely."""
        manager = GeminiKeyManager(["only_key"])

        for _ in range(5):
            assert manager.get_next_key() == "only_key"

    def test_get_next_key_no_keys_raises(self):
        """get_next_key() should raise ValueError if no keys available."""
        manager = GeminiKeyManager([])

        with pytest.raises(ValueError, match="No Gemini API keys available"):
            manager.get_next_key()

    def test_get_max_attempts(self):
        """get_max_attempts() should equal number of keys."""
        manager_3 = GeminiKeyManager(["key1", "key2", "key3"])
        assert manager_3.get_max_attempts() == 3

        manager_1 = GeminiKeyManager(["only_key"])
        assert manager_1.get_max_attempts() == 1

        manager_0 = GeminiKeyManager([])
        assert manager_0.get_max_attempts() == 1  # Minimum 1

    def test_mark_key_failed_retryable(self):
        """mark_key_failed() should accept retryable flag."""
        manager = GeminiKeyManager(["key1", "key2"])
        # Just ensure it doesn't raise
        manager.mark_key_failed(is_retryable=True)

    def test_mark_key_failed_non_retryable(self):
        """mark_key_failed() should accept non-retryable flag."""
        manager = GeminiKeyManager(["key1", "key2"])
        # Just ensure it doesn't raise
        manager.mark_key_failed(is_retryable=False)


class TestErrorClassification:
    """Test error classification (retryable vs non-retryable)."""

    def test_retryable_http_429(self):
        """HTTP 429 should be retryable."""
        error = Exception("HTTP (429) Too Many Requests")
        assert _is_retryable_error(error) is True

    def test_retryable_resource_exhausted_exception(self):
        """ResourceExhausted exception should be retryable."""

        class ResourceExhausted(Exception):
            pass

        error = ResourceExhausted("Quota exceeded")
        assert _is_retryable_error(error) is True

    def test_retryable_rate_limit_exception(self):
        """RateLimitError exception should be retryable."""

        class RateLimitError(Exception):
            pass

        error = RateLimitError("Rate limit exceeded")
        assert _is_retryable_error(error) is True

    def test_retryable_quota_keyword(self):
        """Errors with 'quota' keyword should be retryable."""
        error = Exception("Quota exceeded for this key")
        assert _is_retryable_error(error) is True

    def test_retryable_http_500(self):
        """HTTP 500+ errors should be retryable (temporary server errors)."""
        assert _is_retryable_error(
            Exception("HTTP (500) Internal Server Error")) is True
        assert _is_retryable_error(Exception("HTTP (502) Bad Gateway")) is True
        assert _is_retryable_error(
            Exception("HTTP (503) Service Unavailable")) is True
        assert _is_retryable_error(
            Exception("HTTP (504) Gateway Timeout")) is True

    def test_non_retryable_http_400(self):
        """HTTP 400 (bad request) should NOT be retryable."""
        error = Exception("HTTP (400) Bad Request")
        assert _is_retryable_error(error) is False

    def test_non_retryable_http_401(self):
        """HTTP 401 (unauthorized) should NOT be retryable."""
        error = Exception("HTTP (401) Unauthorized")
        assert _is_retryable_error(error) is False

    def test_non_retryable_http_403(self):
        """HTTP 403 (forbidden) should NOT be retryable."""
        error = Exception("HTTP (403) Forbidden")
        assert _is_retryable_error(error) is False

    def test_non_retryable_validation_error(self):
        """Generic validation errors should NOT be retryable."""
        error = Exception("Invalid prompt format")
        assert _is_retryable_error(error) is False

    def test_non_retryable_parsing_error(self):
        """Parsing errors should NOT be retryable."""
        error = Exception("Failed to parse JSON response")
        assert _is_retryable_error(error) is False

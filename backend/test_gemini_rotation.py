"""
Integration tests for Gemini key rotation with error scenarios.

Tests that mock Gemini API responses and verify key fallback behavior.
"""

import json
import os
import pytest
from unittest.mock import patch, MagicMock, call
import logging

from app.services.ai_service import generate_ai_insights_with_status
from app.services.gemini_key_manager import reset_gemini_key_manager, GeminiKeyManager


@pytest.fixture
def sample_metrics():
    """Sample bias metrics for testing."""
    return {
        "analysis_type": "classification",
        "selection_rates": {"group_a": 0.7, "group_b": 0.3},
        "demographic_parity_difference": 0.4,
        "disparate_impact": 0.5,
        "fairness_score": 0.6,
        "fairness_risk_level": "High",
        "most_affected_group": "group_b",
        "impact_gap_percentage": 40.0,
        "false_positive_rates": {"group_a": 0.1, "group_b": 0.2},
        "equal_opportunity_difference": 0.1,
        "insights": ["Insight 1"],
        "recommendations": ["Recommendation 1"],
    }


@pytest.fixture
def mock_genai():
    """Mock google.generativeai module."""
    return MagicMock()


class TestKeyRotationSuccess:
    """Test successful key rotation scenarios."""

    def test_single_key_success(self, sample_metrics, mock_genai):
        """Single key should work as before (backward compatible)."""
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "summary": "Test summary",
            "risk_level": "High",
            "issues": ["Issue 1"],
            "recommendations": ["Recommendation 1"],
        })

        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        with patch("app.services.ai_service.genai", mock_genai):
            with patch("app.services.ai_service._key_manager", GeminiKeyManager(["test_key"])):
                insights, source, warning = generate_ai_insights_with_status(
                    sample_metrics)

        assert source == "gemini"
        assert insights["summary"] == "Test summary"
        assert warning is None
        mock_genai.configure.assert_called_once_with(api_key="test_key")

    def test_multiple_keys_use_first_on_success(self, sample_metrics, mock_genai):
        """With multiple keys, first key should be used on success."""
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "summary": "Test summary",
            "risk_level": "Medium",
            "issues": ["Issue 1"],
            "recommendations": ["Recommendation 1"],
        })

        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        with patch("app.services.ai_service.genai", mock_genai):
            with patch("app.services.ai_service._key_manager", GeminiKeyManager(["key1", "key2", "key3"])):
                insights, source, warning = generate_ai_insights_with_status(
                    sample_metrics)

        assert source == "gemini"
        assert insights["risk_level"] == "Medium"
        assert warning is None
        # Should have called configure with first key
        mock_genai.configure.assert_called_once_with(api_key="key1")

    def test_multiple_keys_with_spaces(self, sample_metrics, mock_genai):
        """Multiple keys with spaces should be parsed correctly."""
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "summary": "Test",
            "risk_level": "Low",
            "issues": [],
            "recommendations": [],
        })

        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        # Simulate keys that were parsed with spaces trimmed
        keys_with_spaces_trimmed = ["key1", "key2", "key3"]

        with patch("app.services.ai_service.genai", mock_genai):
            with patch("app.services.ai_service._key_manager", GeminiKeyManager(keys_with_spaces_trimmed)):
                insights, source, warning = generate_ai_insights_with_status(
                    sample_metrics)

        assert source == "gemini"
        # Should have used the first key (trimmed)
        mock_genai.configure.assert_called_once_with(api_key="key1")


class TestKeyRotationRetry:
    """Test key rotation on retryable errors."""

    def test_first_key_quota_error_tries_second_key(self, sample_metrics, mock_genai):
        """First key fails with quota (429), second key should be tried."""
        # First call (key1) fails with 429
        error_429 = Exception("Error 429: Too Many Requests")

        # Second call (key2) succeeds
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "summary": "Success with key2",
            "risk_level": "Low",
            "issues": [],
            "recommendations": [],
        })

        mock_model = MagicMock()
        # First model call fails, second succeeds
        mock_model.generate_content.side_effect = [
            error_429,
            mock_response,
        ]
        mock_genai.GenerativeModel.return_value = mock_model

        with patch("app.services.ai_service.genai", mock_genai):
            with patch("app.services.ai_service._key_manager", GeminiKeyManager(["key1", "key2"])):
                insights, source, warning = generate_ai_insights_with_status(
                    sample_metrics)

        assert source == "gemini"
        assert insights["summary"] == "Success with key2"
        assert warning is None

        # Should have called configure for both keys
        configure_calls = mock_genai.configure.call_args_list
        assert len(configure_calls) >= 2
        assert configure_calls[0] == call(api_key="key1")
        assert configure_calls[1] == call(api_key="key2")

    def test_first_key_server_error_tries_second_key(self, sample_metrics, mock_genai):
        """First key fails with 500 error, second key should be tried."""
        # First call (key1) fails with 500
        error_500 = Exception("Error (500) Internal Server Error")

        # Second call (key2) succeeds
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "summary": "Recovered from server error",
            "risk_level": "Medium",
            "issues": [],
            "recommendations": [],
        })

        mock_model = MagicMock()
        mock_model.generate_content.side_effect = [
            error_500,
            mock_response,
        ]
        mock_genai.GenerativeModel.return_value = mock_model

        with patch("app.services.ai_service.genai", mock_genai):
            with patch("app.services.ai_service._key_manager", GeminiKeyManager(["key1", "key2"])):
                insights, source, warning = generate_ai_insights_with_status(
                    sample_metrics)

        assert source == "gemini"
        assert insights["summary"] == "Recovered from server error"


class TestKeyRotationAllFail:
    """Test graceful fallback when all keys fail."""

    def test_all_keys_fail_returns_fallback(self, sample_metrics, mock_genai):
        """All keys fail with quota errors -> graceful fallback."""
        # Both keys fail with quota error
        error_429 = Exception("Error 429: Too Many Requests")

        mock_model = MagicMock()
        mock_model.generate_content.side_effect = error_429
        mock_genai.GenerativeModel.return_value = mock_model

        with patch("app.services.ai_service.genai", mock_genai):
            with patch("app.services.ai_service._key_manager", GeminiKeyManager(["key1", "key2"])):
                insights, source, warning = generate_ai_insights_with_status(
                    sample_metrics)

        # Should fall back gracefully
        assert source == "fallback"
        assert insights is not None
        assert "fairness metrics were computed" in insights["summary"].lower() or \
               "fallback" in insights["summary"].lower() or \
               "live ai insights" in insights["summary"].lower()
        assert warning is not None

    def test_no_keys_configured_returns_fallback(self, sample_metrics, mock_genai):
        """No keys configured -> graceful fallback."""
        with patch("app.services.ai_service.genai", mock_genai):
            with patch("app.services.ai_service._key_manager", GeminiKeyManager([])):
                insights, source, warning = generate_ai_insights_with_status(
                    sample_metrics)

        assert source == "fallback"
        assert insights is not None
        assert warning is not None


class TestNoKeyExposure:
    """Test that API keys are never exposed in logs or responses."""

    def test_keys_not_in_response_on_success(self, sample_metrics, mock_genai, caplog):
        """Successful response should not contain any API keys."""
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "summary": "Test summary",
            "risk_level": "High",
            "issues": [],
            "recommendations": [],
        })

        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model

        with patch("app.services.ai_service.genai", mock_genai):
            with patch("app.services.ai_service._key_manager", GeminiKeyManager(["secret_key_12345"])):
                with caplog.at_level(logging.DEBUG):
                    insights, source, warning = generate_ai_insights_with_status(
                        sample_metrics)

        # Check response doesn't contain key
        response_str = json.dumps(insights)
        assert "secret_key_12345" not in response_str

        # Check logs don't contain full key (only masked)
        log_output = caplog.text
        assert "secret_key_12345" not in log_output

    def test_keys_not_in_response_on_error(self, sample_metrics, mock_genai, caplog):
        """Error response should not expose API keys."""
        error_429 = Exception("Error 429: Too Many Requests")

        mock_model = MagicMock()
        mock_model.generate_content.side_effect = error_429
        mock_genai.GenerativeModel.return_value = mock_model

        with patch("app.services.ai_service.genai", mock_genai):
            with patch("app.services.ai_service._key_manager", GeminiKeyManager(["secret_key_1", "secret_key_2"])):
                with caplog.at_level(logging.DEBUG):
                    insights, source, warning = generate_ai_insights_with_status(
                        sample_metrics)

        # Check response doesn't contain keys
        response_str = json.dumps(insights)
        assert "secret_key_1" not in response_str
        assert "secret_key_2" not in response_str

        # Check logs don't contain full keys
        log_output = caplog.text
        assert "secret_key_1" not in log_output
        assert "secret_key_2" not in log_output


class TestErrorClassification:
    """Test that errors are classified correctly (retryable vs non-retryable)."""

    def test_non_retryable_error_does_not_rotate(self, sample_metrics, mock_genai):
        """Bad request (400) should not rotate to next key."""
        # First (and only) call fails with 400 (non-retryable)
        error_400 = Exception("Error (400) Bad Request")

        mock_model = MagicMock()
        mock_model.generate_content.side_effect = error_400
        mock_genai.GenerativeModel.return_value = mock_model

        with patch("app.services.ai_service.genai", mock_genai):
            with patch("app.services.ai_service._key_manager", GeminiKeyManager(["key1", "key2"])):
                insights, source, warning = generate_ai_insights_with_status(
                    sample_metrics)

        # Should return fallback without trying key2
        assert source == "fallback"

        # Should only have called configure once (for key1)
        # Verify key2 was NOT tried
        configure_calls = mock_genai.configure.call_args_list
        key_used = [call_obj[1]["api_key"] for call_obj in configure_calls]
        # Key2 should not be in the calls
        assert "key2" not in key_used

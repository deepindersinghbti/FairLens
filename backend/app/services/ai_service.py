import json
import logging
import os
import time
from pathlib import Path
from typing import Any

try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*args: Any, **kwargs: Any) -> bool:
        return False

from .gemini_key_manager import (
    get_gemini_key_manager,
    _is_retryable_error,
    classify_error,
)


logger = logging.getLogger(__name__)

BACKEND_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=BACKEND_ENV_PATH)
load_dotenv()

# Initialize key manager singleton (loads keys from environment)
_key_manager = get_gemini_key_manager()


def _normalize_risk_level(value: Any, fallback_risk: str | None) -> str:
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered.startswith("low"):
            return "Low"
        if lowered.startswith("med") or "moderate" in lowered:
            return "Medium"
        if lowered.startswith("high"):
            return "High"

    if isinstance(fallback_risk, str):
        lowered = fallback_risk.strip().lower()
        if lowered.startswith("low"):
            return "Low"
        if lowered.startswith("mod") or lowered.startswith("med"):
            return "Medium"

    # Conservative default when model output is unexpected.
    return "High"


def _as_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _extract_json_text(raw_text: str) -> str:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines:
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end >= start:
        return cleaned[start:end + 1]
    return cleaned


def _fallback_risk_level(value: Any) -> str:
    return _normalize_risk_level(value, "High")


def _build_fallback_ai_insights(metrics: dict[str, Any]) -> dict[str, Any]:
    risk_level = _fallback_risk_level(metrics.get("fairness_risk_level"))

    summary = (
        f"Fairness review indicates {risk_level.lower()} risk for this dataset. "
        "Live AI insights could not be generated, so this summary uses computed fairness metrics."
    )

    issues = _as_string_list(metrics.get("insights"))
    if not issues:
        issues = [
            "Automated AI explanation is unavailable.",
            "Review core fairness metrics manually for final interpretation.",
        ]

    recommendations = _as_string_list(metrics.get("recommendations"))
    if not recommendations:
        recommendations = [
            "Review demographic parity and disparate impact before final decisions.",
            "Collect additional balanced data for higher confidence.",
        ]

    return {
        "summary": summary,
        "risk_level": risk_level,
        "issues": issues,
        "recommendations": recommendations,
    }


def _attempt_gemini_insights(metrics: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    if genai is None:
        return None, "gemini_sdk_missing"

    if os.getenv("FAIRLENS_AI_INSIGHTS_ENABLED", "true").strip().lower() in {"0", "false", "no"}:
        return None, "ai_insights_disabled"

    # Check if any API keys are available (supports both GEMINI_API_KEY and GEMINI_API_KEYS)
    if not _key_manager.has_keys():
        return None, "gemini_api_key_missing"

    configured_model = os.getenv("GEMINI_MODEL", "").strip()
    configured_model_with_prefix = (
        f"models/{configured_model}" if configured_model and not configured_model.startswith(
            "models/") else configured_model
    )
    model_candidates = [
        configured_model,
        configured_model_with_prefix,
        "models/gemini-flash-latest",
        "models/gemini-pro-latest",
        "models/gemini-2.0-flash",
        "models/gemini-2.5-flash",
        "gemini-flash-latest",
        "gemini-pro-latest",
        "gemini-2.0-flash",
        "gemini-2.5-flash",
    ]
    # Keep insertion order while removing blanks/duplicates.
    seen: set[str] = set()
    model_names = []
    for name in model_candidates:
        if name and name not in seen:
            seen.add(name)
            model_names.append(name)

    metrics_payload = {
        "analysis_type": metrics.get("analysis_type"),
        "selection_rates": metrics.get("selection_rates"),
        "demographic_parity_difference": metrics.get("demographic_parity_difference"),
        "disparate_impact": metrics.get("disparate_impact"),
        "fairness_score": metrics.get("fairness_score"),
        "fairness_risk_level": metrics.get("fairness_risk_level"),
        "most_affected_group": metrics.get("most_affected_group"),
        "impact_gap_percentage": metrics.get("impact_gap_percentage"),
        "false_positive_rates": metrics.get("false_positive_rates"),
        "equal_opportunity_difference": metrics.get("equal_opportunity_difference"),
        "group_names": list((metrics.get("selection_rates") or {}).keys()),
    }

    prompt = f"""
You are an AI fairness expert.

Analyze these computed fairness metrics and explain them in plain language for a non-technical audience:
{json.dumps(metrics_payload, indent=2, default=str)}

Respond ONLY with valid JSON in this exact format:
{{
  "summary": "2-3 concise lines",
  "risk_level": "Low or Medium or High",
  "issues": ["issue 1", "issue 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}}

Do not include markdown fences.
Do not include any extra commentary outside the JSON.
""".strip()

    request_timeout_seconds = float(
        os.getenv("FAIRLENS_AI_TIMEOUT_SECONDS", "6"))
    hard_deadline = time.monotonic() + max(1.0, request_timeout_seconds)

    # Outer loop: try each available API key (max attempts = number of keys, prevents infinite loops)
    max_key_attempts = _key_manager.get_max_attempts()
    for key_attempt in range(max_key_attempts):
        if time.monotonic() >= hard_deadline:
            return None, "gemini_timeout"

        try:
            api_key = _key_manager.get_next_key()
        except ValueError:
            return None, "gemini_no_keys_available"

        try:
            genai.configure(api_key=api_key)
        except Exception as config_error:
            is_retryable_config, reason_config = classify_error(config_error)
            # Treat configuration/auth errors as non-retryable in most cases;
            # still log reason and mark key accordingly.
            _key_manager.mark_key_failed(
                is_retryable=is_retryable_config, reason=reason_config)
            if key_attempt < max_key_attempts - 1 and is_retryable_config:
                logger.debug(
                    "Gemini configuration failed, trying next key (reason=%s)", reason_config)
                continue
            return None, "gemini_configuration_failed"

        # Inner loop: try model candidates with current key
        raw_text = ""
        model_error = "gemini_no_model_response"
        for model_name in model_names:
            if time.monotonic() >= hard_deadline:
                model_error = "gemini_timeout"
                break

            remaining = max(1.0, hard_deadline - time.monotonic())
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(
                    prompt,
                    request_options={"timeout": remaining},
                )
                raw_text = getattr(response, "text", "") or ""
                if raw_text:
                    break
            except Exception as model_error_exc:
                model_error = "gemini_model_request_failed"
                # Classify error: retryable (quota/rate limit) vs non-retryable (bad request)
                is_retryable, reason = classify_error(model_error_exc)

                if is_retryable:
                    logger.debug(
                        "Gemini model request failed with retryable error (key attempt %d/%d): %s (reason=%s)",
                        key_attempt + 1,
                        max_key_attempts,
                        type(model_error_exc).__name__,
                        reason,
                    )
                    # Try next key
                    _key_manager.mark_key_failed(
                        is_retryable=True, reason=reason)
                    break  # Break inner loop, continue outer loop to next key
                else:
                    logger.debug(
                        "Gemini model request failed with non-retryable error: %s (reason=%s)",
                        type(model_error_exc).__name__,
                        reason,
                    )
                    # Non-retryable error: don't try next key, fail immediately
                    _key_manager.mark_key_failed(
                        is_retryable=False, reason=reason)
                    return None, model_error

        if raw_text:
            # Success: response received, parse and return
            break
        elif time.monotonic() >= hard_deadline:
            # Timeout reached
            return None, "gemini_timeout"
        # Otherwise, loop to try next key

    if not raw_text:
        logger.warning(
            "All Gemini API keys exhausted (attempted %d keys) - returning fallback",
            max_key_attempts,
        )
        return None, model_error

    json_text = _extract_json_text(raw_text)
    try:
        parsed = json.loads(json_text)
    except Exception:
        return None, "gemini_response_parse_failed"

    if not isinstance(parsed, dict):
        return None, "gemini_response_invalid"

    summary = str(parsed.get("summary", "")).strip()
    if not summary:
        summary = "Fairness metrics were computed, but AI summary text was unavailable."

    issues = _as_string_list(parsed.get("issues"))
    recommendations = _as_string_list(parsed.get("recommendations"))

    return {
        "summary": summary,
        "risk_level": _normalize_risk_level(
            parsed.get("risk_level"),
            metrics.get("fairness_risk_level"),
        ),
        "issues": issues,
        "recommendations": recommendations,
    }, None


def generate_ai_insights_with_status(metrics: dict[str, Any]) -> tuple[dict[str, Any], str, str | None]:
    ai_insights, failure_reason = _attempt_gemini_insights(metrics)
    if ai_insights:
        return ai_insights, "gemini", None

    fallback = _build_fallback_ai_insights(metrics)
    warning = None
    if failure_reason:
        warning = f"Live AI insights unavailable ({failure_reason}). Using fallback summary."
        logger.warning(
            "AI fairness insights fallback triggered: %s", failure_reason)
    return fallback, "fallback", warning


def generate_ai_insights(metrics: dict[str, Any]) -> dict[str, Any] | None:
    ai_insights, _, _ = generate_ai_insights_with_status(metrics)
    return ai_insights

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
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")

logger = logging.getLogger(__name__)

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
        def _env_bool(name: str, default: bool) -> bool:
            raw_value = os.getenv(name)
            if raw_value is None:
                return default

            normalized = raw_value.strip().lower()
            if normalized in {"1", "true", "yes", "on"}:
                return True
            if normalized in {"0", "false", "no", "off"}:
                return False
            return default

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


<<<<<<< HEAD
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
=======
def _env_bool(name: str, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    normalized = raw_value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def _fallback_ai_insights(metrics: dict[str, Any], reason: str) -> dict[str, Any]:
    disparity_percentage = float(metrics.get("impact_gap_percentage", 0) or 0)
    fairness_risk = str(metrics.get("fairness_risk_level", "") or "").strip()
    risk_level = _normalize_risk_level(None, fairness_risk)

    if disparity_percentage >= 30:
        summary = "Significant disparity detected between groups. Immediate fairness mitigation is recommended."
        issue = "Large outcome gap across sensitive groups indicates high fairness risk."
        recommendation = "Prioritize bias mitigation with threshold review and targeted data balancing."
    elif disparity_percentage >= 10:
        summary = "Moderate disparity detected between groups. Additional fairness checks are recommended."
        issue = "Noticeable disparity suggests potential group-level performance imbalance."
        recommendation = "Review feature influence and rebalance training data for affected groups."
    else:
        summary = "No major disparity detected across groups based on current fairness metrics."
        issue = "Current fairness metrics do not indicate a large group disparity."
        recommendation = "Continue monitoring fairness over time and after model/data updates."

    # Tailor the secondary message based on the failure reason
    if reason == "quota_exceeded":
        secondary_issue = "AI analysis temporarily unavailable due to API limits."
        secondary_recommendation = "AI insights will resume when API quota resets."
    elif reason == "timeout":
        secondary_issue = "AI analysis took too long to complete."
        secondary_recommendation = "Try again with a smaller dataset or check network connectivity."
    elif reason == "missing_api_key":
        secondary_issue = "AI service not configured."
        secondary_recommendation = "Set up GEMINI_API_KEY to enable AI-powered insights."
    elif reason == "disabled_by_configuration":
        secondary_issue = "AI insights are disabled in current configuration."
        secondary_recommendation = "Enable AI insights in environment settings to use AI-powered analysis."
    else:
        secondary_issue = f"AI-assisted analysis unavailable ({reason})."
        secondary_recommendation = "Validate results with a larger representative sample if available."

    return {
        "summary": summary,
        "risk_level": risk_level,
        "issues": [issue, secondary_issue],
        "recommendations": [recommendation, secondary_recommendation],
    }


def ensure_ai_insights(metrics: dict[str, Any], ai_insights: Any) -> dict[str, Any]:
    if isinstance(ai_insights, dict):
        summary = str(ai_insights.get("summary", "")).strip()
        risk_level = ai_insights.get("risk_level")
        issues = ai_insights.get("issues")
        recommendations = ai_insights.get("recommendations")

        if (
            summary
            and isinstance(risk_level, str)
            and isinstance(issues, list)
            and isinstance(recommendations, list)
        ):
            return ai_insights

    logger.warning(
        "AI insights payload missing or invalid; using fallback payload")
    return _fallback_ai_insights(metrics, reason="invalid_or_missing_payload")


def generate_ai_insights(metrics: dict[str, Any]) -> dict[str, Any]:
    ai_enabled = _env_bool("FAIRLENS_AI_INSIGHTS_ENABLED",
                           True) and _env_bool("ENABLE_AI_INSIGHTS", True)
    kill_switch_enabled = _env_bool(
        "DISABLE_AI", False) or _env_bool("AI_KILL_SWITCH", False)
    if not ai_enabled or kill_switch_enabled:
        logger.info("AI insights disabled by environment flag (kill_switch=%s, enabled=%s)",
                    kill_switch_enabled, ai_enabled)
        return _fallback_ai_insights(metrics, reason="disabled_by_configuration")

    if genai is None:
        logger.error(
            "google.generativeai is not installed or failed to import")
        return _fallback_ai_insights(metrics, reason="ai_client_unavailable")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning(
            "GEMINI_API_KEY is missing; returning rule-based AI fallback")
        return _fallback_ai_insights(metrics, reason="missing_api_key")
>>>>>>> 14b4ea9b04a6565de1e304cd1d45d0289bb3d317

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

<<<<<<< HEAD
    request_timeout_seconds = float(
        os.getenv("FAIRLENS_AI_TIMEOUT_SECONDS", "6"))
    hard_deadline = time.monotonic() + max(1.0, request_timeout_seconds)
=======
    timeout_raw = os.getenv("FAIRLENS_AI_TIMEOUT_SECONDS", "8")
    try:
        request_timeout_seconds = max(3.0, float(timeout_raw))
    except (TypeError, ValueError):
        logger.warning(
            "Invalid FAIRLENS_AI_TIMEOUT_SECONDS=%r. Falling back to 8 seconds.", timeout_raw)
        request_timeout_seconds = 8.0

    hard_deadline = time.monotonic() + request_timeout_seconds
>>>>>>> 14b4ea9b04a6565de1e304cd1d45d0289bb3d317

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
<<<<<<< HEAD
        model_error = "gemini_no_model_response"
        for model_name in model_names:
            if time.monotonic() >= hard_deadline:
                model_error = "gemini_timeout"
=======
        last_model_error: Exception | None = None
        timed_out = False
        for model_name in model_names:
            if time.monotonic() >= hard_deadline:
                timed_out = True
>>>>>>> 14b4ea9b04a6565de1e304cd1d45d0289bb3d317
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
                    logger.debug(
                        "AI insights generated successfully via model=%s", model_name)
                    break
<<<<<<< HEAD
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
=======
            except Exception as model_error:
                last_model_error = model_error
                # Check for quota/rate limiting specifically
                error_str = str(model_error).lower()
                is_quota_error = ("quota" in error_str or "429" in error_str or
                                  "rate limit" in error_str or "exceeded" in error_str)

                if is_quota_error:
                    logger.warning(
                        "AI quota exceeded for model=%s: %s", model_name, model_error)
                    # For quota errors, we can skip remaining models quickly
                    break
                else:
                    logger.warning(
                        "AI insight call failed for model=%s: %s", model_name, model_error)
                continue

        if not raw_text:
            if timed_out or time.monotonic() >= hard_deadline:
                logger.warning(
                    "AI insight request timed out after %.2f seconds", request_timeout_seconds)
                return _fallback_ai_insights(metrics, reason="timeout")

            if last_model_error is not None:
                error_str = str(last_model_error).lower()
                is_quota_error = ("quota" in error_str or "429" in error_str or
                                  "rate limit" in error_str or "exceeded" in error_str)

                if is_quota_error:
                    logger.warning(
                        "AI quota exceeded; using rule-based insights. Last error: %s", last_model_error)
                    return _fallback_ai_insights(metrics, reason="quota_exceeded")
                else:
                    logger.error(
                        "All AI model candidates failed; using fallback. Last error: %s", last_model_error)
                    return _fallback_ai_insights(metrics, reason="ai_request_failed")

            logger.warning("AI insight response was empty; using fallback")
            return _fallback_ai_insights(metrics, reason="empty_response")

        json_text = _extract_json_text(raw_text)
        try:
            parsed = json.loads(json_text)
        except json.JSONDecodeError as decode_error:
            logger.error("Failed to parse AI insight JSON: %s", decode_error)
            return _fallback_ai_insights(metrics, reason="invalid_ai_response")

        if not isinstance(parsed, dict):
            logger.error("AI insight response was not a JSON object")
            return _fallback_ai_insights(metrics, reason="invalid_ai_shape")

        summary = str(parsed.get("summary", "")).strip()
        fallback = _fallback_ai_insights(metrics, reason="partial_ai_output")
        if not summary:
            summary = fallback["summary"]

        issues = _as_string_list(parsed.get("issues"))
        recommendations = _as_string_list(parsed.get("recommendations"))
        if not issues:
            issues = fallback["issues"]
        if not recommendations:
            recommendations = fallback["recommendations"]

        return {
            "summary": summary,
            "risk_level": _normalize_risk_level(
                parsed.get("risk_level"),
                metrics.get("fairness_risk_level"),
            ),
            "issues": issues,
            "recommendations": recommendations,
        }
    except Exception as error:
        logger.exception("AI insights failed unexpectedly: %s", error)
        return _fallback_ai_insights(metrics, reason="unexpected_error")
>>>>>>> 14b4ea9b04a6565de1e304cd1d45d0289bb3d317

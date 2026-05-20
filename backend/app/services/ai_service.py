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
    def load_dotenv(*args: Any, **kwargs: Any) -> bool:  # type: ignore
        return False

from .gemini_key_manager import (
    get_gemini_key_manager,
    classify_error,
)

logger = logging.getLogger(__name__)

BACKEND_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=BACKEND_ENV_PATH)
load_dotenv()
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")

# Initialize key manager singleton (loads keys from environment)
_key_manager = get_gemini_key_manager()


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

    logger.warning("AI insights payload missing or invalid; using fallback payload")
    return _fallback_ai_insights(metrics, reason="invalid_or_missing_payload")


def _attempt_gemini_insights(metrics: dict[str, Any]) -> tuple[dict[str, Any] | None, str | None]:
    if genai is None:
        return None, "gemini_sdk_missing"

    if os.getenv("FAIRLENS_AI_INSIGHTS_ENABLED", "true").strip().lower() in {"0", "false", "no"}:
        return None, "ai_insights_disabled"

    if not _key_manager.has_keys():
        return None, "gemini_api_key_missing"

    configured_model = os.getenv("GEMINI_MODEL", "").strip()
    configured_model_with_prefix = (
        f"models/{configured_model}" if configured_model and not configured_model.startswith("models/") else configured_model
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

    # keep insertion order but remove blanks
    seen: set[str] = set()
    model_names: list[str] = []
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

    prompt = f'''
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
'''

    timeout_raw = os.getenv("FAIRLENS_AI_TIMEOUT_SECONDS", "8")
    try:
        request_timeout_seconds = max(3.0, float(timeout_raw))
    except (TypeError, ValueError):
        logger.warning("Invalid FAIRLENS_AI_TIMEOUT_SECONDS=%r. Falling back to 8 seconds.", timeout_raw)
        request_timeout_seconds = 8.0

    hard_deadline = time.monotonic() + request_timeout_seconds

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
            _key_manager.mark_key_failed(is_retryable=is_retryable_config, reason=reason_config)
            if key_attempt < max_key_attempts - 1 and is_retryable_config:
                logger.debug("Gemini configuration failed, trying next key (reason=%s)", reason_config)
                continue
            return None, "gemini_configuration_failed"

        raw_text = ""
        last_model_error: Exception | None = None
        timed_out = False
        for model_name in model_names:
            if time.monotonic() >= hard_deadline:
                timed_out = True
                break

            remaining = max(1.0, hard_deadline - time.monotonic())
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt, request_options={"timeout": remaining})
                raw_text = getattr(response, "text", "") or ""
                if raw_text:
                    logger.debug("AI insights generated successfully via model=%s", model_name)
                    break
            except Exception as model_error:
                last_model_error = model_error
                error_str = str(model_error).lower()
                is_quota_error = ("quota" in error_str or "429" in error_str or "rate limit" in error_str or "exceeded" in error_str)

                if is_quota_error:
                    logger.warning("AI quota exceeded for model=%s: %s", model_name, model_error)
                    break
                else:
                    logger.warning("AI insight call failed for model=%s: %s", model_name, model_error)
                continue

        if not raw_text:
            if timed_out or time.monotonic() >= hard_deadline:
                logger.warning("AI insight request timed out after %.2f seconds", request_timeout_seconds)
                return _fallback_ai_insights(metrics, reason="timeout")

            if last_model_error is not None:
                error_str = str(last_model_error).lower()
                is_quota_error = ("quota" in error_str or "429" in error_str or "rate limit" in error_str or "exceeded" in error_str)

                if is_quota_error:
                    logger.warning("AI quota exceeded; using rule-based insights. Last error: %s", last_model_error)
                    return _fallback_ai_insights(metrics, reason="quota_exceeded")
                else:
                    logger.error("All AI model candidates failed; using fallback. Last error: %s", last_model_error)
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
            "risk_level": _normalize_risk_level(parsed.get("risk_level"), metrics.get("fairness_risk_level")),
            "issues": issues,
            "recommendations": recommendations,
        }, None


def generate_ai_insights_with_status(metrics: dict[str, Any]) -> tuple[dict[str, Any], str, str | None]:
    ai_insights, failure_reason = _attempt_gemini_insights(metrics)
    if ai_insights and isinstance(ai_insights, dict):
        return ai_insights, "gemini", None

    fallback = _fallback_ai_insights(metrics, failure_reason or "unknown")
    warning = None
    if failure_reason:
        warning = f"Live AI insights unavailable ({failure_reason}). Using fallback summary."
        logger.warning("AI fairness insights fallback triggered: %s", failure_reason)
    return fallback, "fallback", warning


def generate_ai_insights(metrics: dict[str, Any]) -> dict[str, Any] | None:
    ai_insights, _, _ = generate_ai_insights_with_status(metrics)
    return ai_insights

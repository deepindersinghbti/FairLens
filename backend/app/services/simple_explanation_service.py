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

from .gemini_key_manager import classify_error, get_gemini_key_manager


logger = logging.getLogger(__name__)

BACKEND_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=BACKEND_ENV_PATH)
load_dotenv()

_key_manager = get_gemini_key_manager()


def _build_fallback_simple_explanation(metrics: dict[str, Any], context: dict[str, Any]) -> str:
    risk = str(metrics.get("fairness_risk_level") or "unknown risk").lower()
    score = metrics.get("fairness_score")
    affected_group = metrics.get("most_affected_group") or "one group"
    sensitive_attribute = context.get("sensitive_attribute") or "the protected attribute"
    target_column = context.get("target_column") or "the outcome"

    score_text = f" The fairness score is {score} out of 100." if score is not None else ""

    return (
        f"In simple terms, FairLens sees {risk} in how {target_column} relates to {sensitive_attribute}."
        f"{score_text} The group most affected appears to be {affected_group}. "
        "Think of it like checking whether different teams get the same chance to join a school club. "
        "If one team gets picked much less often, the process may be unfair. "
        "A good next step is to review the data, compare outcomes for each group, and test changes before using this result for decisions."
    )


def _model_names() -> list[str]:
    configured_model = os.getenv("GEMINI_MODEL", "").strip()
    configured_model_with_prefix = (
        f"models/{configured_model}"
        if configured_model and not configured_model.startswith("models/")
        else configured_model
    )
    candidates = [
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

    seen: set[str] = set()
    names: list[str] = []
    for name in candidates:
        if name and name not in seen:
            seen.add(name)
            names.append(name)
    return names


def _build_prompt(metrics: dict[str, Any], normal_insight: str, context: dict[str, Any]) -> str:
    payload = {
        "metrics": metrics,
        "normal_insight": normal_insight,
        "context": context,
    }

    return f"""
Explain these fairness/bias results to a 15-year-old.
Use very simple language.
Avoid technical jargon.
Use a real-life example.
Clearly state whether the result seems fair or unfair.
Give 2-3 practical suggestions.
Keep it concise and readable.

Fairness result data:
{json.dumps(payload, indent=2, default=str)}

Return only the simplified explanation text. Do not include markdown fences.
""".strip()


def _attempt_gemini_simple_explanation(
    metrics: dict[str, Any],
    normal_insight: str,
    context: dict[str, Any],
) -> tuple[str | None, str | None]:
    if genai is None:
        return None, "gemini_sdk_missing"

    if os.getenv("FAIRLENS_AI_INSIGHTS_ENABLED", "true").strip().lower() in {"0", "false", "no"}:
        return None, "ai_insights_disabled"

    if not _key_manager.has_keys():
        return None, "gemini_api_key_missing"

    prompt = _build_prompt(metrics, normal_insight, context)
    request_timeout_seconds = float(os.getenv("FAIRLENS_AI_TIMEOUT_SECONDS", "6"))
    hard_deadline = time.monotonic() + max(1.0, request_timeout_seconds)
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
            is_retryable, reason = classify_error(config_error)
            _key_manager.mark_key_failed(is_retryable=is_retryable, reason=reason)
            if key_attempt < max_key_attempts - 1 and is_retryable:
                continue
            return None, "gemini_configuration_failed"

        model_error = "gemini_no_model_response"
        for model_name in _model_names():
            if time.monotonic() >= hard_deadline:
                return None, "gemini_timeout"

            remaining = max(1.0, hard_deadline - time.monotonic())
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(
                    prompt,
                    request_options={"timeout": remaining},
                )
                raw_text = (getattr(response, "text", "") or "").strip()
                if raw_text:
                    return raw_text.strip("`").strip(), None
            except Exception as model_error_exc:
                model_error = "gemini_model_request_failed"
                is_retryable, reason = classify_error(model_error_exc)
                _key_manager.mark_key_failed(is_retryable=is_retryable, reason=reason)
                if is_retryable:
                    logger.debug(
                        "Gemini simplification failed with retryable error (key attempt %d/%d): %s",
                        key_attempt + 1,
                        max_key_attempts,
                        reason,
                    )
                    break

                logger.debug("Gemini simplification failed with non-retryable error: %s", reason)
                return None, model_error

    return None, "gemini_keys_exhausted"


def generate_simple_explanation(
    metrics: dict[str, Any],
    normal_insight: str,
    context: dict[str, Any],
) -> str:
    explanation, failure_reason = _attempt_gemini_simple_explanation(metrics, normal_insight, context)
    if explanation:
        return explanation

    logger.warning("Simple explanation fallback triggered: %s", failure_reason)
    return _build_fallback_simple_explanation(metrics, context)

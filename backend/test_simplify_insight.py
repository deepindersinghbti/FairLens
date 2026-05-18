from fastapi.testclient import TestClient

from app.main import app
from app.services.simple_explanation_service import generate_simple_explanation


client = TestClient(app)


def _payload() -> dict:
    return {
        "metrics": {
            "analysis_type": "dataset",
            "fairness_score": 42,
            "fairness_risk_level": "High Risk",
            "bias_detected": True,
            "demographic_parity_difference": 0.35,
            "disparate_impact": 0.45,
            "selection_rates": {"Group A": 0.7, "Group B": 0.35},
            "selection_counts": {
                "Group A": {"selected": 70, "total": 100},
                "Group B": {"selected": 35, "total": 100},
            },
            "most_affected_group": "Group B",
            "impact_gap_percentage": 35.0,
        },
        "normal_insight": "The analysis found high fairness risk for Group B.",
        "target_column": "approved",
        "sensitive_attribute": "group",
        "mode": "dataset",
    }


def test_simplify_insight_endpoint_returns_simple_explanation(monkeypatch):
    def fake_generate_simple_explanation(metrics, normal_insight, context):
        return "This result looks unfair because one group gets fewer chances."

    monkeypatch.setattr(
        "app.routes.insights.generate_simple_explanation",
        fake_generate_simple_explanation,
    )

    response = client.post("/api/v1/insights/simplify", json=_payload())

    assert response.status_code == 200
    assert response.json() == {
        "simple_explanation": "This result looks unfair because one group gets fewer chances."
    }


def test_generate_simple_explanation_returns_fallback_when_gemini_fails(monkeypatch):
    monkeypatch.setattr(
        "app.services.simple_explanation_service._attempt_gemini_simple_explanation",
        lambda metrics, normal_insight, context: (None, "gemini_api_key_missing"),
    )

    explanation = generate_simple_explanation(
        metrics=_payload()["metrics"],
        normal_insight=_payload()["normal_insight"],
        context={
            "target_column": "approved",
            "sensitive_attribute": "group",
            "mode": "dataset",
        },
    )

    assert explanation
    assert "simple terms" in explanation.lower()

import json
import os
from io import BytesIO

import requests

BASE_URL = os.getenv("FAIRLENS_TEST_BASE_URL", "http://127.0.0.1:8000/api")
REQUEST_TIMEOUT = int(os.getenv("FAIRLENS_TEST_TIMEOUT", "60"))


def assert_true(condition, message):
    if not condition:
        raise AssertionError(message)


def analyze(dataset_id, target, sensitive, prediction=None):
    payload = {
        "dataset_id": dataset_id,
        "target_column": target,
        "sensitive_attribute": sensitive,
    }
    if prediction:
        payload["prediction_column"] = prediction

    response = requests.post(
        f"{BASE_URL}/analyze-bias", json=payload, timeout=REQUEST_TIMEOUT
    )
    assert_true(response.status_code == 200,
                f"Analyze failed: {response.status_code} {response.text}")
    return response.json()


def load_demo(demo_type):
    response = requests.get(
        f"{BASE_URL}/load-demo", params={"type": demo_type}, timeout=REQUEST_TIMEOUT
    )
    assert_true(response.status_code == 200,
                f"Load demo failed: {response.status_code} {response.text}")
    return response.json()


def download_report(dataset_id, analysis_type):
    response = requests.get(
        f"{BASE_URL}/generate-report",
        params={"dataset_id": dataset_id, "analysis_type": analysis_type},
        timeout=REQUEST_TIMEOUT,
    )
    assert_true(response.status_code == 200,
                f"Report failed: {response.status_code} {response.text}")
    assert_true(response.headers.get("content-type",
                "").startswith("application/pdf"), "Report content type is not PDF")
    assert_true(len(response.content) > 500, "Report is unexpectedly small")
    return response.content


def run_dataset_flow():
    demo = load_demo("loan")
    assert_true(demo["suggested_target"] == "approved",
                "Unexpected suggested target for loan demo")
    assert_true(demo["suggested_sensitive"] == "gender",
                "Unexpected suggested sensitive for loan demo")

    result = analyze(
        demo["dataset_id"],
        demo["suggested_target"],
        demo["suggested_sensitive"],
        demo.get("suggested_prediction") or None,
    )

    assert_true(result["analysis_type"] == "dataset",
                "Dataset demo returned wrong analysis type")
    assert_true(result["fairness_score"] < 50,
                "Dataset fairness score should be below 50")
    assert_true("most_affected_group" in result, "Missing most_affected_group")
    assert_true("impact_gap_percentage" in result,
                "Missing impact_gap_percentage")
    assert_true(result["impact_gap_percentage"] >
                0, "Impact gap should be positive")

    pdf = download_report(demo["dataset_id"], result["analysis_type"])
    return {"demo": demo, "result": result, "pdf_bytes": len(pdf)}


def run_model_flow():
    demo = load_demo("prediction")
    assert_true(demo["suggested_target"] == "approved",
                "Unexpected suggested target for prediction demo")
    assert_true(demo["suggested_sensitive"] == "gender",
                "Unexpected suggested sensitive for prediction demo")
    assert_true(demo["suggested_prediction"] == "predicted",
                "Unexpected suggested prediction for prediction demo")

    result = analyze(
        demo["dataset_id"],
        demo["suggested_target"],
        demo["suggested_sensitive"],
        demo["suggested_prediction"],
    )

    assert_true(result["analysis_type"] == "model_prediction",
                "Model demo returned wrong analysis type")
    assert_true(result.get("false_positive_rates")
                is not None, "Model metrics missing FPR")
    assert_true(result.get("equal_opportunity_difference")
                is not None, "Model metrics missing EOD")
    assert_true("most_affected_group" in result, "Missing most_affected_group")
    assert_true("impact_gap_percentage" in result,
                "Missing impact_gap_percentage")

    di_penalty = max(0.0, (0.8 - result["disparate_impact"]) * 100)
    eod_penalty = (result.get("equal_opportunity_difference") or 0.0) * 100
    fprs = result.get("false_positive_rates") or {}
    fpr_values = list(fprs.values())
    fpr_gap = max(fpr_values) - min(fpr_values) if fpr_values else 0.0
    expected_score = int(
        round(max(0.0, 100 - (di_penalty + eod_penalty + (fpr_gap * 100)))))
    assert_true(result["fairness_score"] == expected_score,
                "Model fairness score does not match composite formula")

    pdf = download_report(demo["dataset_id"], result["analysis_type"])
    return {"demo": demo, "result": result, "pdf_bytes": len(pdf)}


def main():
    dataset_flow = run_dataset_flow()
    model_flow = run_model_flow()

    summary = {
        "dataset": {
            "fairness_score": dataset_flow["result"]["fairness_score"],
            "risk": dataset_flow["result"]["fairness_risk_level"],
            "most_affected_group": dataset_flow["result"]["most_affected_group"],
            "impact_gap_percentage": dataset_flow["result"]["impact_gap_percentage"],
            "pdf_bytes": dataset_flow["pdf_bytes"],
        },
        "model": {
            "fairness_score": model_flow["result"]["fairness_score"],
            "risk": model_flow["result"]["fairness_risk_level"],
            "most_affected_group": model_flow["result"]["most_affected_group"],
            "impact_gap_percentage": model_flow["result"]["impact_gap_percentage"],
            "pdf_bytes": model_flow["pdf_bytes"],
        },
    }

    print("Phase 5 verification passed")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

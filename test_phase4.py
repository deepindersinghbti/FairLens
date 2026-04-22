#!/usr/bin/env python
import json
import os

import requests

BASE_URL = os.getenv("FAIRLENS_TEST_BASE_URL", "http://localhost:8000/api")
REQUEST_TIMEOUT = int(os.getenv("FAIRLENS_TEST_TIMEOUT", "60"))


def upload(path: str) -> str:
    with open(path, "rb") as handle:
        response = requests.post(
            f"{BASE_URL}/upload-dataset", files={"file": handle}, timeout=REQUEST_TIMEOUT
        )
    response.raise_for_status()
    return response.json()["dataset_id"]


def analyze(payload: dict) -> dict:
    response = requests.post(
        f"{BASE_URL}/analyze-bias", json=payload, timeout=REQUEST_TIMEOUT
    )
    response.raise_for_status()
    return response.json()


def download_report(dataset_id: str, analysis_type: str) -> bytes:
    response = requests.get(
        f"{BASE_URL}/generate-report",
        params={"dataset_id": dataset_id, "analysis_type": analysis_type},
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    return response.content


print("=== Phase 4 Verification ===")

# Dataset mode
print("\n--- Dataset Bias Scenario ---")
dataset_id = upload("datasets/demo_loan_bias.csv")
dataset_result = analyze(
    {
        "dataset_id": dataset_id,
        "target_column": "approved",
        "sensitive_attribute": "gender",
    }
)
print(json.dumps(dataset_result, indent=2))

assert dataset_result["analysis_type"] == "dataset"
assert dataset_result["bias_detected"] is True
assert dataset_result["fairness_score"] < 50
assert dataset_result["fairness_risk_level"] == "High Risk"

pdf_dataset = download_report(dataset_id, dataset_result["analysis_type"])
assert len(pdf_dataset) > 1000
print("Dataset report download OK")

# Model mode
print("\n--- Model Prediction Scenario ---")
model_dataset_id = upload("datasets/demo_prediction_bias.csv")
model_result = analyze(
    {
        "dataset_id": model_dataset_id,
        "target_column": "approved",
        "sensitive_attribute": "gender",
        "prediction_column": "predicted",
    }
)
print(json.dumps(model_result, indent=2))

assert model_result["analysis_type"] == "model_prediction"
assert model_result["false_positive_rates"] is not None
assert model_result["equal_opportunity_difference"] is not None
assert "fairness_score" in model_result
assert "fairness_risk_level" in model_result

pdf_model = download_report(model_dataset_id, model_result["analysis_type"])
assert len(pdf_model) > 1000
print("Model report download OK")

print("\nAll Phase 4 checks passed.")

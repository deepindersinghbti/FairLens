#!/usr/bin/env python
import json
import os

import requests

BASE_URL = os.getenv("FAIRLENS_TEST_BASE_URL", "http://localhost:8000/api")
REQUEST_TIMEOUT = int(os.getenv("FAIRLENS_TEST_TIMEOUT", "60"))


def upload(path):
    with open(path, "rb") as f:
        response = requests.post(
            f"{BASE_URL}/upload-dataset", files={"file": f}, timeout=REQUEST_TIMEOUT
        )
    response.raise_for_status()
    return response.json()["dataset_id"]


def analyze(payload):
    response = requests.post(
        f"{BASE_URL}/analyze-bias", json=payload, timeout=REQUEST_TIMEOUT
    )
    response.raise_for_status()
    return response.json()


print("=== Dataset Bias Mode (demo_loan_bias.csv) ===")
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
assert dataset_result["false_positive_rates"] is None
assert dataset_result["equal_opportunity_difference"] is None

print("\n=== Model Prediction Bias Mode (demo_prediction_bias.csv) ===")
prediction_dataset_id = upload("datasets/demo_prediction_bias.csv")
prediction_result = analyze(
    {
        "dataset_id": prediction_dataset_id,
        "target_column": "approved",
        "sensitive_attribute": "gender",
        "prediction_column": "predicted",
    }
)
print(json.dumps(prediction_result, indent=2))
assert prediction_result["analysis_type"] == "model_prediction"
assert prediction_result["false_positive_rates"] is not None
assert prediction_result["equal_opportunity_difference"] is not None

print("\nAll Phase 3 mode checks passed.")

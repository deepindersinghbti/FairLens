#!/usr/bin/env python
import os

import requests

BASE_URL = os.getenv("FAIRLENS_TEST_BASE_URL", "http://127.0.0.1:8000/api")
REQUEST_TIMEOUT = int(os.getenv("FAIRLENS_TEST_TIMEOUT", "60"))


def upload(path: str) -> str:
    with open(path, "rb") as handle:
        response = requests.post(
            f"{BASE_URL}/upload-dataset", files={"file": handle}, timeout=REQUEST_TIMEOUT
        )
    assert response.status_code == 200, response.text
    return response.json()["dataset_id"]


def analyze(payload: dict):
    return requests.post(
        f"{BASE_URL}/analyze-bias", json=payload, timeout=REQUEST_TIMEOUT
    )


def assert_dataset_mode_ok(dataset_id: str, prediction_value):
    payload = {
        "dataset_id": dataset_id,
        "target_column": "approved",
        "sensitive_attribute": "gender",
    }
    if prediction_value is not ...:
        payload["prediction_column"] = prediction_value

    response = analyze(payload)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["analysis_type"] == "dataset", body
    assert body["false_positive_rates"] is None, body


def main():
    dataset_id = upload("datasets/demo_loan_bias.csv")

    # Dataset mode normalization cases
    assert_dataset_mode_ok(dataset_id, ...)
    assert_dataset_mode_ok(dataset_id, None)
    assert_dataset_mode_ok(dataset_id, "")
    assert_dataset_mode_ok(dataset_id, "   ")
    assert_dataset_mode_ok(dataset_id, "None")
    assert_dataset_mode_ok(dataset_id, "none")
    assert_dataset_mode_ok(dataset_id, "NULL")

    # Required distinctness checks
    dup_target_sensitive = analyze(
        {
            "dataset_id": dataset_id,
            "target_column": "approved",
            "sensitive_attribute": "approved",
        }
    )
    assert dup_target_sensitive.status_code == 422, dup_target_sensitive.text

    prediction_equals_target = analyze(
        {
            "dataset_id": dataset_id,
            "target_column": "approved",
            "sensitive_attribute": "gender",
            "prediction_column": "approved",
        }
    )
    assert prediction_equals_target.status_code == 422, prediction_equals_target.text

    prediction_equals_sensitive = analyze(
        {
            "dataset_id": dataset_id,
            "target_column": "approved",
            "sensitive_attribute": "gender",
            "prediction_column": "gender",
        }
    )
    assert prediction_equals_sensitive.status_code == 422, prediction_equals_sensitive.text

    # Case-insensitive unique column resolution
    case_insensitive_success = analyze(
        {
            "dataset_id": dataset_id,
            "target_column": "APPROVED",
            "sensitive_attribute": "Gender",
        }
    )
    assert case_insensitive_success.status_code == 200, case_insensitive_success.text

    print("Validation edge-case checks passed")


if __name__ == "__main__":
    main()

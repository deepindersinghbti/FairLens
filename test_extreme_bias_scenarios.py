#!/usr/bin/env python
import csv
import os
import tempfile
from pathlib import Path

import requests

BASE_URL = os.getenv("FAIRLENS_TEST_BASE_URL", "http://127.0.0.1:8000/api")
REQUEST_TIMEOUT = int(os.getenv("FAIRLENS_TEST_TIMEOUT", "60"))


def upload_rows(rows: list[dict]) -> str:
    with tempfile.TemporaryDirectory() as temp_dir:
        file_path = Path(temp_dir) / "extreme.csv"
        with file_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)

        with file_path.open("rb") as handle:
            response = requests.post(
                f"{BASE_URL}/upload-dataset", files={"file": handle}, timeout=REQUEST_TIMEOUT
            )

    assert response.status_code == 200, response.text
    return response.json()["dataset_id"]


def analyze(dataset_id: str, prediction: str | None = None):
    payload = {
        "dataset_id": dataset_id,
        "target_column": "approved",
        "sensitive_attribute": "gender",
    }
    if prediction is not None:
        payload["prediction_column"] = prediction

    response = requests.post(
        f"{BASE_URL}/analyze-bias", json=payload, timeout=REQUEST_TIMEOUT
    )
    assert response.status_code == 200, response.text
    return response.json()


def main():
    balanced = [
        {"approved": 1, "gender": "M"},
        {"approved": 0, "gender": "M"},
        {"approved": 1, "gender": "F"},
        {"approved": 0, "gender": "F"},
    ]
    balanced_result = analyze(upload_rows(balanced))
    assert balanced_result["disparate_impact"] == 1.0

    moderate = [
        {"approved": 1, "gender": "M"},
        {"approved": 1, "gender": "M"},
        {"approved": 1, "gender": "M"},
        {"approved": 0, "gender": "M"},
        {"approved": 1, "gender": "F"},
        {"approved": 0, "gender": "F"},
        {"approved": 0, "gender": "F"},
        {"approved": 0, "gender": "F"},
    ]
    moderate_result = analyze(upload_rows(moderate))
    assert 0.3 <= moderate_result["disparate_impact"] <= 0.5

    extreme = [
        {"approved": 1, "gender": "M"},
        {"approved": 1, "gender": "M"},
        {"approved": 1, "gender": "M"},
        {"approved": 0, "gender": "F"},
        {"approved": 0, "gender": "F"},
        {"approved": 0, "gender": "F"},
    ]
    extreme_result = analyze(upload_rows(extreme))
    assert extreme_result["disparate_impact"] == 0.0

    all_zero = [
        {"approved": 0, "gender": "M"},
        {"approved": 0, "gender": "M"},
        {"approved": 0, "gender": "F"},
        {"approved": 0, "gender": "F"},
    ]
    all_zero_result = analyze(upload_rows(all_zero))
    assert all_zero_result["selection_rates"]["M"] == 0.0
    assert all_zero_result["selection_rates"]["F"] == 0.0

    single_group = [
        {"approved": 1, "gender": "M"},
        {"approved": 0, "gender": "M"},
        {"approved": 1, "gender": "M"},
    ]
    single_group_result = analyze(upload_rows(single_group))
    assert len(single_group_result["selection_rates"]) == 1

    model_rows = [
        {"approved": 1, "predicted": 1, "gender": "M"},
        {"approved": 0, "predicted": 1, "gender": "M"},
        {"approved": 1, "predicted": 0, "gender": "F"},
        {"approved": 0, "predicted": 0, "gender": "F"},
    ]
    model_result = analyze(upload_rows(model_rows), prediction="predicted")
    assert model_result["analysis_type"] == "model_prediction"
    assert model_result["false_positive_rates"] is not None

    print("Extreme bias scenario checks passed")


if __name__ == "__main__":
    main()

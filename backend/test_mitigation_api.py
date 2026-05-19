import io

import pandas as pd
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_apply_mitigation_and_download_adjusted_csv():
    dataframe = pd.DataFrame(
        {
            "approved": [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            "gender": ["F"] * 10 + ["M"] * 10,
        }
    )
    csv_bytes = dataframe.to_csv(index=False).encode("utf-8")

    upload_response = client.post(
        "/api/upload-dataset",
        files={"file": ("biased.csv", csv_bytes, "text/csv")},
    )
    assert upload_response.status_code == 200
    dataset_id = upload_response.json()["dataset_id"]

    mitigation_response = client.post(
        "/api/apply-mitigation",
        json={
            "dataset_id": dataset_id,
            "target_column": "approved",
            "sensitive_attribute": "gender",
        },
    )
    assert mitigation_response.status_code == 200
    payload = mitigation_response.json()

    assert payload["original_dataset_id"] == dataset_id
    assert payload["adjusted_dataset_id"] != dataset_id
    assert payload["metadata"]["method"] == {
        "id": "deterministic_rebalancing",
        "label": "Deterministic Rebalancing",
    }
    assert payload["metadata"]["rowsAdjusted"] == 1
    assert payload["comparison"]["after"]["fairness_score"] >= payload["comparison"]["before"]["fairness_score"]

    download_response = client.get(
        f"/api/download-dataset?dataset_id={payload['adjusted_dataset_id']}"
    )
    assert download_response.status_code == 200

    adjusted = pd.read_csv(io.BytesIO(download_response.content))
    assert list(adjusted.columns) == list(dataframe.columns)
    assert len(adjusted) == len(dataframe)

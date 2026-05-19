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
            "strength": "balanced",
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
    assert payload["metadata"]["strength"]["id"] == "balanced"
    assert payload["metadata"]["rowsEligible"] == 4
    assert payload["metadata"]["rowsAdjusted"] == 3
    assert payload["metadata"]["targetRateCeilingApplied"] is False
    assert payload["comparison"]["after"]["fairness_score"] >= payload["comparison"]["before"]["fairness_score"]

    download_response = client.get(
        f"/api/download-dataset?dataset_id={payload['adjusted_dataset_id']}"
    )
    assert download_response.status_code == 200

    adjusted = pd.read_csv(io.BytesIO(download_response.content))
    assert list(adjusted.columns) == list(dataframe.columns)
    assert len(adjusted) == len(dataframe)


def test_preview_does_not_persist_and_simulation_returns_group_snapshots():
    dataframe = pd.DataFrame(
        {
            "approved": [0] * 10 + [1] * 10,
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

    preview_response = client.post(
        "/api/preview-mitigation",
        json={
            "dataset_id": dataset_id,
            "target_column": "approved",
            "sensitive_attribute": "gender",
            "strength": "balanced",
            "targetShare": 0.5,
        },
    )
    assert preview_response.status_code == 200
    preview_payload = preview_response.json()
    assert preview_payload["adjusted_dataset_id"] is None
    assert preview_payload["metadata"]["strength"]["targetShare"] == 0.5

    simulation_response = client.post(
        "/api/simulate-mitigation",
        json={
            "dataset_id": dataset_id,
            "target_column": "approved",
            "sensitive_attribute": "gender",
            "strength": "balanced",
        },
    )
    assert simulation_response.status_code == 200
    points = simulation_response.json()["points"]
    assert [point["step"] for point in points] == [0, 25, 50, 75, 100]
    assert points[0]["metadata"] is None
    assert "F" in points[0]["selection_rates"]
    assert points[-1]["fairness_score"] >= points[0]["fairness_score"]

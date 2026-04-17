#!/usr/bin/env python
import csv
import json
import tempfile
from pathlib import Path

import requests

BASE_URL = "http://localhost:8000/api"


def upload_csv(rows: list[dict[str, int | str]]) -> str:
    with tempfile.TemporaryDirectory() as temp_dir:
        file_path = Path(temp_dir) / "dataset.csv"
        with file_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=["approved", "gender"])
            writer.writeheader()
            writer.writerows(rows)

        with file_path.open("rb") as handle:
            response = requests.post(
                f"{BASE_URL}/upload-dataset", files={"file": handle}, timeout=20)
            response.raise_for_status()
            return response.json()["dataset_id"]


def analyze(dataset_id: str) -> dict:
    response = requests.post(
        f"{BASE_URL}/analyze-bias",
        json={
            "dataset_id": dataset_id,
            "target_column": "approved",
            "sensitive_attribute": "gender",
        },
        timeout=20,
    )
    response.raise_for_status()
    return response.json()


def assert_condition(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run_case(name: str, rows: list[dict[str, int | str]], minimum_score: int, maximum_score: int, expect_warnings: bool) -> dict:
    dataset_id = upload_csv(rows)
    result = analyze(dataset_id)

    print(f"\n=== {name} ===")
    print(json.dumps(result, indent=2))

    confidence_score = result.get("confidence_score")
    warnings = result.get("warnings") or []
    confidence_explanation = result.get("confidence_explanation") or []
    recommendations = result.get("recommendations") or []

    assert_condition(confidence_score is not None,
                     f"{name}: missing confidence_score")
    assert_condition(minimum_score <= confidence_score <=
                     maximum_score, f"{name}: confidence_score out of range")

    if expect_warnings:
        assert_condition(len(warnings) > 0, f"{name}: expected warnings")
    else:
        assert_condition(len(warnings) == 0, f"{name}: expected no warnings")

    assert_condition(isinstance(confidence_explanation, list),
                     f"{name}: confidence_explanation should be a list")
    assert_condition(len(confidence_explanation) > 0,
                     f"{name}: expected confidence explanation")
    assert_condition(isinstance(recommendations, list),
                     f"{name}: recommendations should be a list")
    assert_condition(len(recommendations) > 0,
                     f"{name}: expected recommendations")

    return result


def main() -> None:
    tiny_rows = [
        {"approved": 1, "gender": "A"},
        {"approved": 0, "gender": "A"},
        {"approved": 1, "gender": "B"},
    ]

    medium_rows = [
        {"approved": 1, "gender": "A" if index < 16 else "B"}
        for index in range(20)
    ]

    balanced_rows = [
        {"approved": 1 if index % 2 == 0 else 0,
            "gender": "A" if index < 50 else "B"}
        for index in range(100)
    ]

    tiny_result = run_case("Tiny Dataset", tiny_rows, 0, 39, True)
    assert_condition(tiny_result["confidence_score"]
                     < 40, "Tiny dataset should have low confidence")
    assert_condition(
        "unreliable" in (tiny_result.get("verdict_message") or "").lower(),
        "Tiny dataset verdict should include unreliable disclaimer",
    )
    tiny_warnings = tiny_result.get("warnings") or []
    assert_condition(
        any("statistically significant" in warning.lower()
            for warning in tiny_warnings),
        "Tiny dataset should include statistical significance warning",
    )

    medium_result = run_case("Medium Dataset", medium_rows, 40, 79, True)
    assert_condition(40 <= medium_result["confidence_score"]
                     < 80, "Medium dataset should have moderate confidence")
    medium_warnings = medium_result.get("warnings") or []
    assert_condition(
        any("statistically significant" in warning.lower()
            for warning in medium_warnings),
        "Medium dataset should include statistical significance warning",
    )

    balanced_result = run_case(
        "Large Balanced Dataset", balanced_rows, 80, 100, False)
    assert_condition(balanced_result["confidence_score"] >=
                     80, "Balanced dataset should have high confidence")
    assert_condition(balanced_result.get("data_quality_label")
                     == "High", "Balanced dataset should be labeled High")
    assert_condition(
        "unreliable" not in (balanced_result.get(
            "verdict_message") or "").lower(),
        "Large balanced dataset verdict should not include unreliable disclaimer",
    )

    # Edge case: single group and missing sensitive values should not crash analysis.
    edge_rows = [
        {"approved": 1, "gender": "A"},
        {"approved": 0, "gender": "A"},
        {"approved": 1, "gender": ""},
        {"approved": 0, "gender": ""},
    ]
    edge_result = run_case("Edge Case Dataset", edge_rows, 0, 100, True)
    assert_condition("fairness_score" in edge_result,
                     "Edge case dataset should still return fairness_score")
    assert_condition("selection_rates" in edge_result,
                     "Edge case dataset should still return selection_rates")

    print("\nAll data-quality checks passed.")


if __name__ == "__main__":
    main()

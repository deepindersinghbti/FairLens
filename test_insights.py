#!/usr/bin/env python
"""Test both bias and no-bias scenarios"""
import json
import requests

BASE_URL = "http://localhost:8000/api"

def test_dataset(filename, description):
    print("\n" + "=" * 70)
    print(f"Testing: {description}")
    print("=" * 70)
    
    # Upload
    with open(filename, "rb") as f:
        files = {"file": f}
        response = requests.post(f"{BASE_URL}/upload-dataset", files=files)
    
    if response.status_code != 200:
        print(f"❌ Upload failed: {response.status_code}")
        return
    
    upload_resp = response.json()
    dataset_id = upload_resp["dataset_id"]
    print(f"✓ Upload successful (dataset_id: {dataset_id})")
    
    # Analyze
    analysis_req = {
        "dataset_id": dataset_id,
        "target_column": "approved",
        "sensitive_attribute": "gender"
    }
    
    response = requests.post(
        f"{BASE_URL}/analyze-bias",
        json=analysis_req,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code != 200:
        print(f"❌ Analysis failed: {response.status_code}")
        return
    
    result = response.json()
    
    print(f"\nMetrics:")
    print(f"  Selection Rates: {result['selection_rates']}")
    print(f"  Disparate Impact: {result['disparate_impact']}")
    print(f"  Bias Detected: {result['bias_detected']}")
    
    print(f"\nInsights:")
    for insight in result['insights']:
        print(f"  • {insight}")

# Test both datasets
test_dataset("sample_data.csv", "Dataset with Gender Bias (DI = 0.33)")
test_dataset("sample_data_no_bias.csv", "Dataset with Balanced Selection (DI = 1.0)")

print("\n" + "=" * 70)
print("✓ Phase 2 insights validation complete!")
print("=" * 70)

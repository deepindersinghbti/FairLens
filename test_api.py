#!/usr/bin/env python
"""Test FairLens API endpoints end-to-end"""
import json
import requests

BASE_URL = "http://localhost:8000/api"

print("=" * 60)
print("Testing FairLens API")
print("=" * 60)

# Test 1: Upload CSV
print("\n1. Testing POST /api/upload-dataset")
print("-" * 60)

with open("sample_data.csv", "rb") as f:
    files = {"file": f}
    response = requests.post(f"{BASE_URL}/upload-dataset", files=files)

if response.status_code != 200:
    print(f"❌ Upload failed: {response.status_code}")
    print(response.json())
    exit(1)

upload_resp = response.json()
dataset_id = upload_resp["dataset_id"]
print(f"✓ Upload successful")
print(f"  Dataset ID: {dataset_id}")
print(f"  Columns: {upload_resp['columns']}")
print(f"  Preview rows: {len(upload_resp['preview'])}")
print(json.dumps(upload_resp, indent=2))

# Test 2: Analyze bias
print("\n2. Testing POST /api/analyze-bias")
print("-" * 60)

analysis_req = {
    "dataset_id": dataset_id,
    "target_column": "approved",
    "sensitive_attribute": "gender"
}
print(f"  Request: {json.dumps(analysis_req)}")

response = requests.post(
    f"{BASE_URL}/analyze-bias",
    json=analysis_req,
    headers={"Content-Type": "application/json"}
)

if response.status_code != 200:
    print(f"❌ Analysis failed: {response.status_code}")
    print(response.json())
    exit(1)

analysis_resp = response.json()
print(f"✓ Analysis successful")
print(json.dumps(analysis_resp, indent=2))

# Validate response schema
print("\n3. Validating response schema")
print("-" * 60)

required_fields = ["selection_rates", "selection_counts",
                   "demographic_parity_difference", "disparate_impact", "bias_detected"]
for field in required_fields:
    if field in analysis_resp:
        print(f"✓ {field}: {analysis_resp[field]}")
    else:
        print(f"❌ Missing field: {field}")
        exit(1)

print("\n5. Checking AI insights payload")
print("-" * 60)
ai_block = analysis_resp.get("ai_fairness_insights")
if not isinstance(ai_block, dict):
    print("❌ Missing ai_fairness_insights payload")
    exit(1)

for ai_field in ["summary", "risk_level", "issues", "recommendations"]:
    if ai_field not in ai_block:
        print(f"❌ Missing ai_fairness_insights.{ai_field}")
        exit(1)

print(f"✓ ai_fairness_insights present")
print(f"  Source: {analysis_resp.get('ai_insights_source')}")
if analysis_resp.get("ai_insights_warning"):
    print(f"  Warning: {analysis_resp.get('ai_insights_warning')}")

# Check bias rule
print("\n6. Checking bias detection rule")
print("-" * 60)
di = analysis_resp["disparate_impact"]
bias = analysis_resp["bias_detected"]
threshold = 0.8

print(f"  Disparate Impact: {di}")
print(f"  Threshold: {threshold}")
print(f"  Bias Detected (expected if DI < {threshold}): {bias}")

if di < threshold and not bias:
    print(
        f"❌ Bias detection logic error: DI={di} < {threshold} but bias_detected={bias}")
    exit(1)
elif di >= threshold and bias:
    print(
        f"❌ Bias detection logic error: DI={di} >= {threshold} but bias_detected={bias}")
    exit(1)
else:
    print(f"✓ Bias detection rule working correctly")

print("\n" + "=" * 60)
print("✓ All tests passed!")
print("=" * 60)

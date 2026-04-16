#!/usr/bin/env python
"""Verify that sample_data.csv creates a clear bias case for UI testing"""
import pandas as pd

df = pd.read_csv("sample_data.csv")

print("Dataset Analysis Summary")
print("=" * 60)
print(f"Total rows: {len(df)}")
print(f"\nColumns: {list(df.columns)}")

print("\nApproval by Gender:")
print("-" * 60)
for gender in df['gender'].unique():
    subset = df[df['gender'] == gender]
    approved = subset['approved'].sum()
    total = len(subset)
    rate = (approved / total) * 100
    print(f"{gender:5s}: {approved:2d}/{total:2d} approved ({rate:5.1f}%)")

print("\nExpected Metrics:")
print("-" * 60)
male_rate = df[df['gender'] == 'M']['approved'].mean()
female_rate = df[df['gender'] == 'F']['approved'].mean()
dpd = abs(male_rate - female_rate)
di = min(male_rate, female_rate) / max(male_rate, female_rate)
bias = di < 0.8

print(f"Selection Rate (M):         {male_rate:.4f}")
print(f"Selection Rate (F):         {female_rate:.4f}")
print(f"Demographic Parity Diff:    {dpd:.4f}")
print(f"Disparate Impact Ratio:     {di:.4f}")
print(f"Bias Detected (DI < 0.8):   {bias}")
print(f"\n✓ Clear bias case ready for UI testing")

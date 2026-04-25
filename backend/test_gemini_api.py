#!/usr/bin/env python3
"""
Test script to verify Gemini API key setup for AI insights.
Run this after setting up your GEMINI_API_KEY to verify it works.
"""

import os
import logging
from pathlib import Path

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    backend_env_path = Path(__file__).resolve().parents[0] / ".env"
    load_dotenv(dotenv_path=backend_env_path)
    load_dotenv()
    print(f"✅ Loaded environment variables from {backend_env_path}")
except ImportError:
    print("⚠️  dotenv not available, using existing environment variables")

from app.services.ai_service import generate_ai_insights


def test_gemini_api():
    """Test AI insights with Gemini API"""

    # Check if API key is set
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY is not set in environment")
        print("Please add it to your .env file:")
        print("GEMINI_API_KEY=your_actual_api_key_here")
        return False

    print(f"✅ GEMINI_API_KEY is configured (length: {len(api_key)})")

    # Test AI insights
    test_metrics = {
        'analysis_type': 'dataset',
        'fairness_risk_level': 'Medium Risk',
        'impact_gap_percentage': 15,
        'selection_rates': {'group_a': 0.7, 'group_b': 0.55},
        'demographic_parity_difference': 0.15,
        'disparate_impact': 0.79,
        'fairness_score': 75,
        'most_affected_group': 'group_b'
    }

    print("\n🧪 Testing AI insights generation...")

    try:
        result = generate_ai_insights(test_metrics)

        print("✅ AI insights generated successfully!")
        print(f"Summary: {result['summary']}")
        print(f"Risk Level: {result['risk_level']}")
        print(f"Issues: {result['issues']}")
        print(f"Recommendations: {result['recommendations']}")

        # Check if it's using Gemini or fallback
        summary = result.get('summary', '')
        issues = result.get('issues', [])

        # Indicators of fallback usage
        is_fallback = (
            "could not be generated" in summary.lower() or
            "uses computed fairness metrics" in summary.lower() or
            "unavailable" in summary.lower() or
            any("unavailable" in issue.lower() for issue in issues) or
            any("automated ai explanation" in issue.lower()
                for issue in issues)
        )

        if is_fallback:
            print(
                "\n⚠️  Still using fallback - API key may be invalid, quota exceeded, or timeout issues")
            print(
                "Check the logs above for specific error messages (quota, timeout, etc.)")
            return False
        else:
            print("\n🎉 Gemini API is working! AI insights are live.")
            return True

    except Exception as e:
        print(f"❌ Error testing AI insights: {e}")
        return False


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    test_gemini_api()

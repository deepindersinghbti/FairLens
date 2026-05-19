import pandas as pd

from app.services.bias_service import BiasService
from app.services.mitigation_service import MitigationService


def test_mitigation_preserves_original_and_schema():
    dataframe = pd.DataFrame(
        {
            "approved": [0, 0, 0, 1, 1, 1, 1, 1],
            "gender": ["F", "F", "F", "F", "M", "M", "M", "M"],
            "score": [610, 620, 630, 640, 650, 660, 670, 680],
        }
    )
    original = dataframe.copy(deep=True)

    result = MitigationService.apply_mitigation(
        dataframe=dataframe,
        target_column="approved",
        sensitive_attribute="gender",
    )

    pd.testing.assert_frame_equal(dataframe, original)
    assert list(result.dataframe.columns) == list(dataframe.columns)
    assert result.metadata.rows_eligible == 3
    assert result.metadata.rows_adjusted == 1
    assert result.metadata.adjustment_cap_applied is True
    assert result.metadata.strength_id == "balanced"


def test_mitigation_improves_or_preserves_fairness_score_with_cap():
    dataframe = pd.DataFrame(
        {
            "approved": [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            "gender": ["F"] * 10 + ["M"] * 10,
        }
    )

    before = BiasService.compute_analysis(dataframe, "approved", "gender")
    result = MitigationService.apply_mitigation(dataframe, "approved", "gender")
    after = BiasService.compute_analysis(result.dataframe, "approved", "gender")

    assert after["fairness_score"] >= before["fairness_score"]
    assert result.metadata.rows_adjusted == 3
    assert result.metadata.adjustment_cap_applied is False
    assert result.metadata.rows_eligible == 4
    assert result.metadata.fairness_improvement_estimate > 0


def test_mitigation_reports_when_cap_truncates_adjustments():
    dataframe = pd.DataFrame(
        {
            "approved": [0] * 10 + [1] * 10,
            "gender": ["F"] * 10 + ["M"] * 10,
        }
    )

    before = BiasService.compute_analysis(dataframe, "approved", "gender")
    result = MitigationService.apply_mitigation(dataframe, "approved", "gender")
    after = BiasService.compute_analysis(result.dataframe, "approved", "gender")

    assert after["fairness_score"] >= before["fairness_score"]
    assert result.metadata.rows_eligible == 10
    assert result.metadata.rows_adjusted == 3
    assert result.metadata.adjustment_cap_applied is True
    assert result.metadata.target_rate_ceiling_applied is False
    assert result.metadata.strength_id == "balanced"
    assert result.metadata.strength_adjustment_cap == 0.30
    assert result.metadata.strength_target_share == 0.65
    assert result.metadata.fairness_improvement_estimate > 0


def test_strength_modes_increase_adjustment_counts():
    dataframe = pd.DataFrame(
        {
            "approved": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            "gender": ["F"] * 10 + ["M"] * 10,
        }
    )

    conservative = MitigationService.apply_mitigation(
        dataframe, "approved", "gender", strength="conservative"
    )
    balanced = MitigationService.apply_mitigation(
        dataframe, "approved", "gender", strength="balanced"
    )
    aggressive = MitigationService.apply_mitigation(
        dataframe, "approved", "gender", strength="aggressive"
    )

    assert conservative.metadata.rows_adjusted <= balanced.metadata.rows_adjusted
    assert balanced.metadata.rows_adjusted <= aggressive.metadata.rows_adjusted
    assert conservative.metadata.rows_adjusted == 1
    assert balanced.metadata.rows_adjusted == 3
    assert aggressive.metadata.rows_adjusted == 5


def test_aggressive_respects_target_rate_ceiling():
    dataframe = pd.DataFrame(
        {
            "approved": [0] * 20 + [1] * 20,
            "gender": ["F"] * 20 + ["M"] * 20,
        }
    )

    result = MitigationService.apply_mitigation(
        dataframe, "approved", "gender", strength="aggressive"
    )
    analysis = BiasService.compute_analysis(result.dataframe, "approved", "gender")

    assert result.metadata.target_rate_ceiling_applied is True
    assert result.metadata.rows_adjusted == 10
    assert analysis["selection_rates"]["F"] == 0.5


def test_mitigation_handles_zero_adjustment_without_crashing():
    dataframe = pd.DataFrame(
        {
            "approved": [1, 0, 1, 0],
            "gender": ["F", "F", "M", "M"],
        }
    )

    result = MitigationService.apply_mitigation(dataframe, "approved", "gender")

    assert result.metadata.rows_adjusted == 0
    assert result.metadata.rows_eligible == 0
    assert result.metadata.adjustment_cap_applied is False
    pd.testing.assert_frame_equal(result.dataframe, dataframe)

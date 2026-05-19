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
    assert result.metadata.rows_adjusted == 0
    assert result.metadata.adjustment_cap_applied is True


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
    assert result.metadata.rows_adjusted == 1
    assert result.metadata.adjustment_cap_applied is True
    assert result.metadata.fairness_improvement_estimate > 0


def test_mitigation_handles_zero_adjustment_without_crashing():
    dataframe = pd.DataFrame(
        {
            "approved": [1, 0, 1, 0],
            "gender": ["F", "F", "M", "M"],
        }
    )

    result = MitigationService.apply_mitigation(dataframe, "approved", "gender")

    assert result.metadata.rows_adjusted == 0
    assert result.metadata.adjustment_cap_applied is False
    pd.testing.assert_frame_equal(result.dataframe, dataframe)

from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.schemas.request import AnalyzeBiasRequest
from app.schemas.response import AnalyzeBiasResponse, GroupSelectionCount
from app.services.analysis_store import save_analysis_result
from app.services.bias_service import BiasService
from app.services.dataset_service import DatasetService


router = APIRouter()
dataset_service = DatasetService(upload_dir=Path("uploads"))


@router.post("/analyze-bias", response_model=AnalyzeBiasResponse)
async def analyze_bias(payload: AnalyzeBiasRequest) -> AnalyzeBiasResponse:
    try:
        dataframe = dataset_service.load_dataframe(payload.dataset_id)

        analysis = BiasService.compute_analysis(
            dataframe=dataframe,
            target_column=payload.target_column,
            sensitive_attribute=payload.sensitive_attribute,
            prediction_column=payload.prediction_column,
        )

        save_analysis_result(payload.dataset_id, analysis["analysis_type"], analysis)

        return AnalyzeBiasResponse(
            analysis_type=analysis["analysis_type"],
            selection_rates=analysis["selection_rates"],
            selection_counts={
                group: GroupSelectionCount(**counts)
                for group, counts in analysis["selection_counts"].items()
            },
            demographic_parity_difference=analysis["demographic_parity_difference"],
            disparate_impact=analysis["disparate_impact"],
            false_positive_rates=analysis["false_positive_rates"],
            equal_opportunity_difference=analysis["equal_opportunity_difference"],
            fairness_score=analysis["fairness_score"],
            fairness_risk_level=analysis["fairness_risk_level"],
            most_affected_group=analysis["most_affected_group"],
            impact_gap_percentage=analysis["impact_gap_percentage"],
            bias_detected=analysis["bias_detected"],
            insights=analysis["insights"],
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to analyze dataset: {exc}") from exc

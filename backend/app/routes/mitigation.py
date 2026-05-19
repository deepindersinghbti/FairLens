from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.schemas.request import ApplyMitigationRequest
from app.schemas.response import MitigationComparisonResponse
from app.services.bias_service import BiasService
from app.services.dataset_service import DatasetService
from app.services.mitigation_service import MitigationService


router = APIRouter()
dataset_service = DatasetService(upload_dir=Path("uploads"))


@router.post("/apply-mitigation", response_model=MitigationComparisonResponse)
async def apply_mitigation(payload: ApplyMitigationRequest) -> MitigationComparisonResponse:
    try:
        original_dataframe = dataset_service.load_dataframe(payload.dataset_id)

        mitigation = MitigationService.apply_mitigation(
            dataframe=original_dataframe,
            target_column=payload.target_column,
            sensitive_attribute=payload.sensitive_attribute,
            prediction_column=payload.prediction_column,
            strength=payload.strength,
        )
        adjusted_dataset_id = dataset_service.save_dataframe(mitigation.dataframe)

        before = BiasService.compute_analysis(
            dataframe=original_dataframe,
            target_column=mitigation.target_column,
            sensitive_attribute=mitigation.sensitive_attribute,
            prediction_column=mitigation.prediction_column,
        )
        after = BiasService.compute_analysis(
            dataframe=mitigation.dataframe,
            target_column=mitigation.target_column,
            sensitive_attribute=mitigation.sensitive_attribute,
            prediction_column=mitigation.prediction_column,
        )

        return MitigationComparisonResponse(
            original_dataset_id=payload.dataset_id,
            adjusted_dataset_id=adjusted_dataset_id,
            columns=[str(column) for column in mitigation.dataframe.columns.tolist()],
            preview=dataset_service.preview_records(mitigation.dataframe),
            metadata={
                "rowsEligible": mitigation.metadata.rows_eligible,
                "rowsAdjusted": mitigation.metadata.rows_adjusted,
                "adjustmentCapApplied": mitigation.metadata.adjustment_cap_applied,
                "targetRateCeilingApplied": mitigation.metadata.target_rate_ceiling_applied,
                "fairnessImprovementEstimate": mitigation.metadata.fairness_improvement_estimate,
                "method": {
                    "id": mitigation.metadata.method_id,
                    "label": mitigation.metadata.method_label,
                },
                "strength": {
                    "id": mitigation.metadata.strength_id,
                    "label": mitigation.metadata.strength_label,
                    "description": mitigation.metadata.strength_description,
                    "adjustmentCap": mitigation.metadata.strength_adjustment_cap,
                    "targetShare": mitigation.metadata.strength_target_share,
                },
            },
            comparison={
                "before": before,
                "after": after,
            },
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply fairness mitigation: {exc}",
        ) from exc

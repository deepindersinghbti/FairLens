from pathlib import Path

from fastapi import APIRouter, HTTPException

from app.schemas.request import ApplyMitigationRequest
from app.schemas.response import MitigationComparisonResponse, MitigationSimulationResponse
from app.services.bias_service import BiasService
from app.services.dataset_service import DatasetService
from app.services.mitigation_service import MitigationResult, MitigationService


router = APIRouter()
dataset_service = DatasetService(upload_dir=Path("uploads"))


def _metadata_payload(mitigation: MitigationResult) -> dict:
    return {
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
    }


def _build_comparison_response(
    original_dataset_id: str,
    original_dataframe,
    mitigation: MitigationResult,
    adjusted_dataset_id: str | None = None,
) -> MitigationComparisonResponse:
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
        original_dataset_id=original_dataset_id,
        adjusted_dataset_id=adjusted_dataset_id,
        columns=[str(column) for column in mitigation.dataframe.columns.tolist()],
        preview=dataset_service.preview_records(mitigation.dataframe),
        metadata=_metadata_payload(mitigation),
        comparison={
            "before": before,
            "after": after,
        },
    )


def _run_mitigation(payload: ApplyMitigationRequest) -> tuple[object, MitigationResult]:
    original_dataframe = dataset_service.load_dataframe(payload.dataset_id)
    mitigation = MitigationService.apply_mitigation(
        dataframe=original_dataframe,
        target_column=payload.target_column,
        sensitive_attribute=payload.sensitive_attribute,
        prediction_column=payload.prediction_column,
        strength=payload.strength,
        target_share_override=payload.targetShare,
    )
    return original_dataframe, mitigation


@router.post("/preview-mitigation", response_model=MitigationComparisonResponse)
async def preview_mitigation(payload: ApplyMitigationRequest) -> MitigationComparisonResponse:
    try:
        original_dataframe, mitigation = _run_mitigation(payload)
        return _build_comparison_response(payload.dataset_id, original_dataframe, mitigation)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to preview fairness mitigation: {exc}",
        ) from exc


@router.post("/apply-mitigation", response_model=MitigationComparisonResponse)
async def apply_mitigation(payload: ApplyMitigationRequest) -> MitigationComparisonResponse:
    try:
        original_dataframe, mitigation = _run_mitigation(payload)
        adjusted_dataset_id = dataset_service.save_dataframe(mitigation.dataframe)
        return _build_comparison_response(
            payload.dataset_id,
            original_dataframe,
            mitigation,
            adjusted_dataset_id=adjusted_dataset_id,
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


@router.post("/simulate-mitigation", response_model=MitigationSimulationResponse)
async def simulate_mitigation(payload: ApplyMitigationRequest) -> MitigationSimulationResponse:
    try:
        original_dataframe = dataset_service.load_dataframe(payload.dataset_id)
        baseline = BiasService.compute_analysis(
            dataframe=original_dataframe,
            target_column=payload.target_column,
            sensitive_attribute=payload.sensitive_attribute,
            prediction_column=payload.prediction_column,
        )
        points = [
            {
                "step": 0,
                "targetShare": 0.0,
                "fairness_score": baseline["fairness_score"],
                "bias_gap": baseline["demographic_parity_difference"],
                "disparate_impact": baseline["disparate_impact"],
                "selection_rates": baseline["selection_rates"],
                "metadata": None,
            }
        ]

        for step in [25, 50, 75, 100]:
            target_share = step / 100
            mitigation = MitigationService.apply_mitigation(
                dataframe=original_dataframe,
                target_column=payload.target_column,
                sensitive_attribute=payload.sensitive_attribute,
                prediction_column=payload.prediction_column,
                strength=payload.strength,
                target_share_override=target_share,
            )
            analysis = BiasService.compute_analysis(
                dataframe=mitigation.dataframe,
                target_column=mitigation.target_column,
                sensitive_attribute=mitigation.sensitive_attribute,
                prediction_column=mitigation.prediction_column,
            )
            points.append(
                {
                    "step": step,
                    "targetShare": target_share,
                    "fairness_score": analysis["fairness_score"],
                    "bias_gap": analysis["demographic_parity_difference"],
                    "disparate_impact": analysis["disparate_impact"],
                    "selection_rates": analysis["selection_rates"],
                    "metadata": _metadata_payload(mitigation),
                }
            )

        return MitigationSimulationResponse(points=points)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to simulate fairness mitigation: {exc}",
        ) from exc

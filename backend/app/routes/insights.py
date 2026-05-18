from fastapi import APIRouter, HTTPException

from app.schemas.request import SimplifyInsightRequest
from app.schemas.response import SimplifyInsightResponse
from app.services.simple_explanation_service import generate_simple_explanation


router = APIRouter()


@router.post("/v1/insights/simplify", response_model=SimplifyInsightResponse)
async def simplify_insight(payload: SimplifyInsightRequest) -> SimplifyInsightResponse:
    try:
        context = {
            "target_column": payload.target_column,
            "sensitive_attribute": payload.sensitive_attribute,
            "mode": payload.mode,
        }
        simple_explanation = generate_simple_explanation(
            metrics=payload.metrics,
            normal_insight=payload.normal_insight,
            context=context,
        )
        return SimplifyInsightResponse(simple_explanation=simple_explanation)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to simplify insight: {exc}",
        ) from exc

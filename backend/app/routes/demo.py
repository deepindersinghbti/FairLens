from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from app.schemas.response import LoadDemoResponse
from app.services.dataset_service import DatasetService


router = APIRouter()
dataset_service = DatasetService(upload_dir=Path("uploads"))
project_root = Path(__file__).resolve().parents[3]
datasets_dir = project_root / "datasets"

DEMO_CONFIG = {
    "loan": {
        "filename": "demo_loan_bias.csv",
        "suggested_target": "approved",
        "suggested_sensitive": "gender",
        "suggested_prediction": None,
    },
    "prediction": {
        "filename": "demo_prediction_bias.csv",
        "suggested_target": "approved",
        "suggested_sensitive": "gender",
        "suggested_prediction": "predicted",
    },
}


@router.get("/load-demo", response_model=LoadDemoResponse)
async def load_demo(type: str = Query(..., pattern="^(loan|prediction)$")) -> LoadDemoResponse:
    config = DEMO_CONFIG.get(type)
    if config is None:
        raise HTTPException(status_code=400, detail="Invalid demo type. Use 'loan' or 'prediction'.")

    source_file = datasets_dir / config["filename"]
    if not source_file.exists():
        raise HTTPException(status_code=404, detail="Demo dataset file not found.")

    try:
        dataset_id = dataset_service.save_upload(source_file.read_bytes(), config["filename"])
        dataframe = dataset_service.load_dataframe(dataset_id)

        return LoadDemoResponse(
            dataset_id=dataset_id,
            columns=[str(column) for column in dataframe.columns.tolist()],
            preview=dataset_service.preview_records(dataframe),
            suggested_target=config["suggested_target"],
            suggested_sensitive=config["suggested_sensitive"],
            suggested_prediction=config["suggested_prediction"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load demo dataset: {exc}") from exc

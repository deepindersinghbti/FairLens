from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.response import UploadDatasetResponse
from app.services.dataset_service import DatasetService


router = APIRouter()
dataset_service = DatasetService(upload_dir=Path("uploads"))


@router.post("/upload-dataset", response_model=UploadDatasetResponse)
async def upload_dataset(file: UploadFile = File(...)) -> UploadDatasetResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file name")

    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise ValueError("Uploaded file is empty")

        dataset_id = dataset_service.save_upload(file_bytes, file.filename)
        dataframe = dataset_service.load_dataframe(dataset_id)

        return UploadDatasetResponse(
            dataset_id=dataset_id,
            columns=[str(column) for column in dataframe.columns.tolist()],
            preview=dataset_service.preview_records(dataframe),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to upload dataset: {exc}") from exc

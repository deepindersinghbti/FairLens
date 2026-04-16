from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd


class DatasetService:
    def __init__(self, upload_dir: Path) -> None:
        self.upload_dir = upload_dir
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def save_upload(self, raw_bytes: bytes, original_filename: str) -> str:
        if not original_filename.lower().endswith(".csv"):
            raise ValueError("Only CSV files are supported")

        dataset_id = uuid.uuid4().hex
        dataset_path = self.upload_dir / f"{dataset_id}.csv"
        dataset_path.write_bytes(raw_bytes)
        return dataset_id

    def path_from_dataset_id(self, dataset_id: str) -> Path:
        candidate = self.upload_dir / f"{dataset_id}.csv"
        if not candidate.exists():
            raise FileNotFoundError("Dataset not found for provided dataset_id")
        return candidate

    def load_dataframe(self, dataset_id: str) -> pd.DataFrame:
        csv_path = self.path_from_dataset_id(dataset_id)
        try:
            dataframe = pd.read_csv(csv_path)
        except Exception as exc:
            raise ValueError(f"Failed to parse CSV: {exc}") from exc

        if dataframe.empty:
            raise ValueError("Uploaded CSV is empty")

        return dataframe

    @staticmethod
    def preview_records(dataframe: pd.DataFrame, limit: int = 5) -> List[Dict[str, Any]]:
        preview = dataframe.head(limit).copy()
        preview = preview.where(pd.notna(preview), None)
        return preview.to_dict(orient="records")

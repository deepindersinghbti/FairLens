from pydantic import BaseModel, Field


class AnalyzeBiasRequest(BaseModel):
    dataset_id: str = Field(..., min_length=1, description="Opaque uploaded dataset identifier")
    target_column: str = Field(..., min_length=1)
    sensitive_attribute: str = Field(..., min_length=1)
    prediction_column: str | None = Field(default=None)

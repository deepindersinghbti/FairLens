from pydantic import BaseModel, Field, model_validator


class AnalyzeBiasRequest(BaseModel):
    dataset_id: str = Field(..., min_length=1,
                            description="Opaque uploaded dataset identifier")
    target_column: str = Field(..., min_length=1)
    sensitive_attribute: str = Field(..., min_length=1)
    prediction_column: str | None = Field(default=None)

    @staticmethod
    def _normalize_optional_prediction(value: str | None) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        if not normalized:
            return None

        if normalized.lower() in {"none", "null"}:
            return None

        return normalized

    @model_validator(mode="after")
    def validate_columns(self) -> "AnalyzeBiasRequest":
        self.target_column = self.target_column.strip()
        self.sensitive_attribute = self.sensitive_attribute.strip()
        self.prediction_column = self._normalize_optional_prediction(
            self.prediction_column)

        if self.target_column.lower() == self.sensitive_attribute.lower():
            raise ValueError(
                "Target column and sensitive attribute must be different")

        if self.prediction_column is not None:
            prediction_lower = self.prediction_column.lower()
            if prediction_lower == self.target_column.lower():
                raise ValueError(
                    "Prediction column and target column must be different")
            if prediction_lower == self.sensitive_attribute.lower():
                raise ValueError(
                    "Prediction column and sensitive attribute must be different")

        return self

from typing import Any, Dict, List

from pydantic import BaseModel


class UploadDatasetResponse(BaseModel):
    dataset_id: str
    columns: List[str]
    preview: List[Dict[str, Any]]


class GroupSelectionCount(BaseModel):
    selected: int
    total: int


class AIFairnessInsights(BaseModel):
    summary: str
    risk_level: str
    issues: List[str]
    recommendations: List[str]


class AnalyzeBiasResponse(BaseModel):
    analysis_type: str
    selection_rates: Dict[str, float]
    selection_counts: Dict[str, GroupSelectionCount]
    demographic_parity_difference: float
    disparate_impact: float
    false_positive_rates: Dict[str, float] | None = None
    equal_opportunity_difference: float | None = None
    confidence_score: float | None = None
    warnings: List[str] | None = None
    data_quality_label: str | None = None
    verdict_message: str | None = None
    confidence_explanation: List[str] | None = None
    score_reliability_warning: str | None = None
    recommendations: List[str] | None = None
    fairness_score: int
    fairness_risk_level: str
    most_affected_group: str
    impact_gap_percentage: float
    bias_detected: bool
    insights: List[str]
    ai_fairness_insights: AIFairnessInsights | None = None
    ai_insights_source: str | None = None
    ai_insights_warning: str | None = None


class LoadDemoResponse(BaseModel):
    dataset_id: str
    columns: List[str]
    preview: List[Dict[str, Any]]
    suggested_target: str
    suggested_sensitive: str
    suggested_prediction: str | None = None

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ReportMetrics(BaseModel):
    """Fairness metrics for report display"""
    demographic_parity_difference: float
    disparate_impact: float
    equal_opportunity_difference: Optional[float] = None


class ReportSelectionData(BaseModel):
    """Selection rates and counts by group"""
    group: str
    rate: float
    selected: int
    total: int


class ReportMitigationData(BaseModel):
    """Optional before/after mitigation comparison"""
    strength_id: str
    strength_label: str
    rows_adjusted: int
    rows_eligible: int
    adjustment_cap_applied: bool
    target_rate_ceiling_applied: bool
    fairness_improvement_estimate: float
    before_fairness_score: int
    after_fairness_score: int
    before_selection_rates: Dict[str, float]
    after_selection_rates: Dict[str, float]


class ReportAIInsights(BaseModel):
    """Optional AI-generated insights from Gemini"""
    summary: str
    risk_level: str
    issues: List[str]
    recommendations: List[str]


class ReportPayload(BaseModel):
    """
    Structured report payload for professional audit report rendering.
    
    This model completely decouples report rendering from dashboard state.
    All data is deterministic and versioned for future enhancements.
    """
    
    # Identity & Metadata
    analysis_id: str
    generated_at: str  # ISO-8601 timestamp
    dataset_name: str
    target_column: str
    sensitive_attribute: str
    analysis_type: str  # "dataset" or "model"
    
    # Executive Summary (Key Metrics)
    fairness_score: int
    fairness_risk_level: str  # "Low Risk", "Moderate Risk", "High Risk"
    most_affected_group: str
    impact_gap_percentage: float
    bias_detected: bool
    
    # Detailed Metrics
    fairness_metrics: ReportMetrics
    selection_data: List[ReportSelectionData]
    confidence_score: Optional[float] = None
    confidence_explanation: Optional[List[str]] = None
    data_quality_label: Optional[str] = None  # "High", "Medium", "Low"
    
    # Deterministic Narratives & Findings
    key_findings: List[str]  # Template-based findings from metrics
    plain_language_summary: str  # Professional, non-technical overview
    
    # Chart Data (Static)
    chart_data: Dict[str, Any]  # Selection rates data for bar chart rendering
    
    # Warnings & Recommendations
    warnings: List[str]
    recommendations: List[str]  # Deterministic, template-based recommendations
    
    # Optional: Mitigation Impact (if mitigation was applied)
    mitigation_data: Optional[ReportMitigationData] = None
    
    # Optional: Supplementary AI Insights (secondary/optional)
    ai_insights: Optional[ReportAIInsights] = None
    ai_insights_source: Optional[str] = None  # "gemini" or "fallback"
    ai_insights_disclaimer: str = (
        "These insights are AI-generated interpretations intended to improve "
        "readability and should not replace formal fairness evaluation metrics."
    )
    
    # Report Footer Disclaimer
    report_disclaimer: str = (
        "This report is intended for fairness analysis and educational evaluation purposes only."
    )

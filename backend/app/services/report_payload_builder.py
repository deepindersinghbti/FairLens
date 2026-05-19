"""Service to build professional audit report payloads from analysis results."""

from datetime import datetime, timezone
from typing import Any, Optional

from app.schemas.report_payload import (
    ReportAIInsights,
    ReportMitigationData,
    ReportMetrics,
    ReportPayload,
    ReportSelectionData,
)


class ReportPayloadBuilder:
    """Converts raw analysis results into structured ReportPayload for professional rendering."""

    @staticmethod
    def build_report_payload(
        analysis_id: str,
        analysis: dict[str, Any],
        dataset_name: str,
        mitigation_data: Optional[dict[str, Any]] = None,
    ) -> ReportPayload:
        """
        Build a complete ReportPayload from analysis results.
        
        Args:
            analysis_id: Unique analysis identifier
            analysis: Raw analysis result dict from BiasService
            dataset_name: Human-readable dataset name
            mitigation_data: Optional mitigation before/after data
            
        Returns:
            ReportPayload ready for report page rendering
        """
        
        # Generate key findings from metrics
        key_findings = ReportPayloadBuilder._generate_key_findings(analysis)
        
        # Generate plain language summary (deterministic, professional)
        plain_language_summary = ReportPayloadBuilder._generate_plain_language_summary(analysis)
        
        # Build selection data for table/chart
        selection_data = ReportPayloadBuilder._build_selection_data(analysis)
        
        # Build chart data
        chart_data = {
            "selection_rates": analysis.get("selection_rates", {}),
            "groups": list(analysis.get("selection_rates", {}).keys()),
        }
        
        # Build metrics
        fairness_metrics = ReportMetrics(
            demographic_parity_difference=analysis.get("demographic_parity_difference", 0.0),
            disparate_impact=analysis.get("disparate_impact", 0.0),
            equal_opportunity_difference=analysis.get("equal_opportunity_difference"),
        )
        
        # Build AI insights if available
        ai_insights = None
        ai_source = None
        if analysis.get("ai_fairness_insights"):
            ai_insights_raw = analysis["ai_fairness_insights"]
            ai_insights = ReportAIInsights(
                summary=ai_insights_raw.get("summary", ""),
                risk_level=ai_insights_raw.get("risk_level", "Unknown"),
                issues=ai_insights_raw.get("issues", []),
                recommendations=ai_insights_raw.get("recommendations", []),
            )
            ai_source = analysis.get("ai_insights_source", "fallback")
        
        # Build mitigation data if provided
        mitigation_section = None
        if mitigation_data:
            mitigation_section = ReportPayloadBuilder._build_mitigation_data(mitigation_data)
        
        # Generate deterministic recommendations
        recommendations = ReportPayloadBuilder._generate_recommendations(analysis)
        
        # Timestamp
        now_utc = datetime.now(timezone.utc)
        
        return ReportPayload(
            analysis_id=analysis_id,
            generated_at=now_utc.isoformat(),
            dataset_name=dataset_name,
            target_column=analysis.get("target_column", "Unknown"),
            sensitive_attribute=analysis.get("sensitive_attribute", "Unknown"),
            analysis_type=analysis.get("analysis_type", "dataset"),
            fairness_score=analysis.get("fairness_score", 0),
            fairness_risk_level=analysis.get("fairness_risk_level", "Unknown"),
            most_affected_group=analysis.get("most_affected_group", "Unknown"),
            impact_gap_percentage=analysis.get("impact_gap_percentage", 0.0),
            bias_detected=analysis.get("bias_detected", False),
            fairness_metrics=fairness_metrics,
            selection_data=selection_data,
            confidence_score=analysis.get("confidence_score"),
            confidence_explanation=analysis.get("confidence_explanation"),
            data_quality_label=analysis.get("data_quality_label"),
            key_findings=key_findings,
            plain_language_summary=plain_language_summary,
            chart_data=chart_data,
            warnings=analysis.get("warnings", []),
            recommendations=recommendations,
            mitigation_data=mitigation_section,
            ai_insights=ai_insights,
            ai_insights_source=ai_source,
        )

    @staticmethod
    def _generate_key_findings(analysis: dict[str, Any]) -> list[str]:
        """Generate deterministic key findings from metrics."""
        findings = []
        
        most_affected = analysis.get("most_affected_group", "Unknown")
        impact_gap = analysis.get("impact_gap_percentage", 0.0)
        risk_level = analysis.get("fairness_risk_level", "Unknown")
        disparate_impact = analysis.get("disparate_impact", 1.0)
        dpp_diff = analysis.get("demographic_parity_difference", 0.0)
        
        # Finding 1: Overall risk
        findings.append(f"{risk_level} in fairness metrics.")
        
        # Finding 2: Most affected group
        if most_affected != "Unknown":
            findings.append(
                f"The {most_affected} group experiences approximately {impact_gap:.1f}% "
                f"lower selection rate compared to other groups."
            )
        
        # Finding 3: Disparate impact
        if disparate_impact < 0.80:
            findings.append(
                f"Disparate impact ratio of {disparate_impact:.3f} indicates potential adverse impact "
                f"(threshold: 0.80 per 80% rule)."
            )
        elif disparate_impact < 1.0:
            findings.append(
                f"Disparate impact ratio of {disparate_impact:.3f} is below 1.0, "
                f"indicating disproportionate impact on minority group."
            )
        
        # Finding 4: Demographic parity
        if dpp_diff > 0.1:
            findings.append(
                f"Demographic parity difference of {dpp_diff:.3f} shows meaningful disparity "
                f"in selection rates across groups."
            )
        
        # Finding 5: Confidence
        confidence = analysis.get("confidence_score")
        if confidence and confidence < 70:
            findings.append(
                "Confidence level is moderate; consider collecting more data for stronger conclusions."
            )
        
        return findings

    @staticmethod
    def _generate_plain_language_summary(analysis: dict[str, Any]) -> str:
        """Generate a professional, non-technical summary."""
        target = analysis.get("target_column", "outcomes")
        sensitive = analysis.get("sensitive_attribute", "demographic factor")
        risk = analysis.get("fairness_risk_level", "Unknown Risk")
        score = analysis.get("fairness_score", 0)
        most_affected = analysis.get("most_affected_group", "minority group")
        gap = analysis.get("impact_gap_percentage", 0.0)
        
        interpretation = "appears to have no significant bias"
        if risk == "High Risk":
            interpretation = "shows significant bias"
        elif risk == "Moderate Risk":
            interpretation = "shows potential bias"
        
        summary = (
            f"This analysis evaluated whether {target} decisions treat {sensitive} groups fairly. "
            f"The findings {interpretation}. "
            f"A fairness score of {score}/100 indicates the overall level of bias in the process. "
            f"The {most_affected} group experiences approximately {gap:.1f}% fewer positive outcomes "
            f"compared to other groups. "
            f"These results suggest reviewing the {target} decision-making process "
            f"to identify and address potential sources of unfair treatment."
        )
        
        return summary

    @staticmethod
    def _build_selection_data(analysis: dict[str, Any]) -> list[ReportSelectionData]:
        """Build selection rate and count data by group."""
        selection_data = []
        
        rates = analysis.get("selection_rates", {})
        counts = analysis.get("selection_counts", {})
        
        for group, rate in rates.items():
            count_info = counts.get(group, {"selected": 0, "total": 0})
            selection_data.append(
                ReportSelectionData(
                    group=str(group),
                    rate=rate,
                    selected=int(count_info.get("selected", 0)),
                    total=int(count_info.get("total", 0)),
                )
            )
        
        return selection_data

    @staticmethod
    def _generate_recommendations(analysis: dict[str, Any]) -> list[str]:
        """Generate deterministic, template-based recommendations."""
        recommendations = []
        
        confidence = analysis.get("confidence_score", 100)
        risk = analysis.get("fairness_risk_level", "Low Risk")
        most_affected = analysis.get("most_affected_group", "minority group")
        target = analysis.get("target_column", "outcomes")
        
        # Recommendation 1: Data collection
        if confidence < 70:
            recommendations.append(
                "Collect more data to improve confidence in fairness assessment results."
            )
        
        # Recommendation 2: Process review
        if risk != "Low Risk":
            recommendations.append(
                f"Review {target} decision-making process for potential sources of bias "
                f"affecting {most_affected}."
            )
        
        # Recommendation 3: Historical audit
        if risk != "Low Risk":
            recommendations.append(
                f"Audit historical {target} decisions to assess whether bias patterns persist over time."
            )
        
        # Recommendation 4: Mitigation
        recommendations.append(
            "Consider implementing fairness mitigation strategies to reduce bias "
            "and improve equity in outcomes."
        )
        
        # Recommendation 5: Monitoring
        recommendations.append(
            f"Monitor {target} process over time and regularly reassess fairness metrics "
            f"to detect any recurrence of bias."
        )
        
        return recommendations

    @staticmethod
    def _build_mitigation_data(
        mitigation_data: dict[str, Any],
    ) -> ReportMitigationData:
        """Build mitigation comparison data."""
        
        before_score = mitigation_data.get("before_fairness_score", 0)
        after_score = mitigation_data.get("after_fairness_score", 0)
        
        return ReportMitigationData(
            strength_id=mitigation_data.get("strength_id", "balanced"),
            strength_label=mitigation_data.get("strength_label", "Balanced"),
            rows_adjusted=mitigation_data.get("rows_adjusted", 0),
            rows_eligible=mitigation_data.get("rows_eligible", 0),
            adjustment_cap_applied=mitigation_data.get("adjustment_cap_applied", False),
            target_rate_ceiling_applied=mitigation_data.get("target_rate_ceiling_applied", False),
            fairness_improvement_estimate=mitigation_data.get("fairness_improvement_estimate", 0.0),
            before_fairness_score=before_score,
            after_fairness_score=after_score,
            before_selection_rates=mitigation_data.get("before_selection_rates", {}),
            after_selection_rates=mitigation_data.get("after_selection_rates", {}),
        )

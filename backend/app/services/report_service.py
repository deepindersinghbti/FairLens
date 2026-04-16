from __future__ import annotations

from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


class ReportService:
    @staticmethod
    def _analysis_type_label(analysis_type: str) -> str:
        if analysis_type == "model_prediction":
            return "Model Prediction Bias"
        return "Dataset Bias"

    @staticmethod
    def _final_verdict_text(risk_level: str) -> str:
        if risk_level == "High Risk":
            return "Significant bias detected in decision outcomes"
        if risk_level == "Moderate Risk":
            return "Potential bias detected. Review recommended"
        return "No significant bias detected"

    @staticmethod
    def generate_pdf(dataset_id: str, analysis_type: str, analysis: dict[str, Any]) -> bytes:
        buffer = BytesIO()
        document = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        story.append(Paragraph("FairLens AI Fairness Audit Report", styles["Title"]))
        story.append(Paragraph("Prepared for: Demo Organization", styles["BodyText"]))
        story.append(Spacer(1, 12))

        story.append(Paragraph("1. Analysis Type", styles["Heading2"]))
        story.append(Paragraph(f"Dataset ID: {dataset_id}", styles["BodyText"]))
        story.append(Paragraph(
            f"Analysis Type: {ReportService._analysis_type_label(analysis_type)}",
            styles["BodyText"],
        ))
        story.append(Spacer(1, 10))

        story.append(Paragraph("2. Fairness Score and Risk Level", styles["Heading2"]))
        metrics = [
            ["Demographic Parity Difference", str(analysis["demographic_parity_difference"])],
            ["Disparate Impact", str(analysis["disparate_impact"])],
            ["Fairness Score", f"{analysis['fairness_score']} / 100"],
            ["Risk Level", analysis["fairness_risk_level"]],
        ]

        if analysis.get("equal_opportunity_difference") is not None:
            metrics.append(["Equal Opportunity Difference", str(analysis["equal_opportunity_difference"])])
        if analysis.get("false_positive_rates") is not None:
            metrics.append(["False Positive Rates", str(analysis["false_positive_rates"])])

        metric_table = Table(metrics, colWidths=[220, 280])
        metric_table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        story.append(metric_table)
        story.append(Spacer(1, 10))

        story.append(Paragraph("3. Final Verdict", styles["Heading2"]))
        story.append(Paragraph(ReportService._final_verdict_text(analysis["fairness_risk_level"]), styles["BodyText"]))
        story.append(Spacer(1, 10))

        story.append(Paragraph("4. Selection Rates", styles["Heading2"]))
        selection_rows = [["Group", "Selected", "Total", "Rate"]]
        for group, counts in analysis["selection_counts"].items():
            selected = counts["selected"]
            total = counts["total"]
            rate = f"{round((selected / total) * 100) if total else 0}%"
            selection_rows.append([group, str(selected), str(total), rate])

        selection_table = Table(selection_rows, colWidths=[140, 120, 120, 120])
        selection_table.setStyle(
            TableStyle(
                [
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ]
            )
        )
        story.append(selection_table)
        story.append(Spacer(1, 10))

        story.append(Paragraph("5. Most Affected Group", styles["Heading2"]))
        affected_group = str(analysis["most_affected_group"])
        highest_group = max(analysis["selection_rates"], key=analysis["selection_rates"].get)
        story.append(
            Paragraph(
                f"{affected_group} applicants receive {analysis['impact_gap_percentage']}% lower selection rate than {highest_group} applicants.",
                styles["BodyText"],
            )
        )
        story.append(Spacer(1, 10))

        story.append(Paragraph("6. Insights", styles["Heading2"]))
        for insight in analysis["insights"]:
            story.append(Paragraph(f"- {insight}", styles["BodyText"]))

        document.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes

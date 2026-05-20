from __future__ import annotations

from typing import Dict, List, Tuple

import pandas as pd


class BiasService:
    @staticmethod
    def _normalize_optional_prediction(prediction_column: str | None) -> str | None:
        if prediction_column is None:
            return None

        normalized = str(prediction_column).strip()
        if not normalized:
            return None

        if normalized.lower() in {"none", "null"}:
            return None

        return normalized

    @staticmethod
    def _resolve_column_name(dataframe: pd.DataFrame, column_name: str, field_label: str) -> str:
        requested = column_name.strip()
        if not requested:
            raise ValueError(f"{field_label} cannot be empty")

        if requested in dataframe.columns:
            return requested

        lowered = requested.lower()
        candidates = [col for col in dataframe.columns if str(
            col).lower() == lowered]

        if len(candidates) == 1:
            return str(candidates[0])

        if len(candidates) > 1:
            raise ValueError(
                f"{field_label} '{column_name}' is ambiguous. Matches: {', '.join(str(col) for col in candidates)}"
            )

        available = ", ".join(str(col) for col in dataframe.columns)
        raise ValueError(
            f"{field_label} '{column_name}' not found. Available columns: {available}")

    @staticmethod
    def _dataset_quality_metadata(
        dataframe: pd.DataFrame,
        sensitive_attribute: str,
    ) -> tuple[int, Dict[str, int], int, List[str], str, List[str], str | None, bool, bool]:
        if sensitive_attribute not in dataframe.columns:
            raise ValueError(f"Column '{sensitive_attribute}' not found")

        total_rows = int(len(dataframe))
        group_counts_series = dataframe[sensitive_attribute].dropna(
        ).value_counts()
        group_counts = {str(group): int(count)
                        for group, count in group_counts_series.items()}
        has_small_groups = any(count < 5 for count in group_counts.values())
        is_imbalanced = total_rows > 0 and bool(group_counts) and (
            max(group_counts.values()) / total_rows > 0.8)
        is_small_dataset = total_rows < 30
        is_very_small_dataset = total_rows < 10

        score = 100
        warnings: List[str] = []

        if is_small_dataset:
            score -= 30
            if is_very_small_dataset:
                score -= 60
                warnings.append(
                    "Dataset size is too small for reliable fairness analysis")
            else:
                warnings.append(
                    "Dataset size is small, so fairness results have lower confidence")

        if has_small_groups:
            score -= 30
            warnings.append("One or more groups have very few samples")

        if is_imbalanced:
            score -= 20
            warnings.append("Dataset is imbalanced across sensitive groups")

        if is_small_dataset or has_small_groups:
            warnings.append("Results may not be statistically significant")

        confidence_score = max(0, min(100, score))

        if confidence_score >= 70:
            data_quality_label = "High"
        elif confidence_score >= 40:
            data_quality_label = "Medium"
        else:
            data_quality_label = "Low"

        confidence_explanation: List[str] = []
        if is_very_small_dataset:
            confidence_explanation.append(
                f"Dataset is extremely small ({total_rows} rows)")
        elif is_small_dataset:
            confidence_explanation.append(
                f"Dataset is small ({total_rows} rows)")

        if has_small_groups:
            confidence_explanation.append(
                "One or more groups have insufficient samples")

        if is_imbalanced:
            confidence_explanation.append("Data is imbalanced across groups")

        if not confidence_explanation:
            confidence_explanation.append(
                "Dataset size and group balance support reliable analysis")

        score_reliability_warning = None
        if confidence_score < 40:
            score_reliability_warning = "Fairness score may not be reliable due to low data quality"

        return (
            total_rows,
            group_counts,
            confidence_score,
            list(dict.fromkeys(warnings)),
            data_quality_label,
            confidence_explanation,
            score_reliability_warning,
            has_small_groups,
            is_imbalanced,
        )

    @staticmethod
    def _verdict_message(fairness_risk_level: str, confidence_score: int) -> str:
        if confidence_score < 40:
            return "⚠ Potential bias detected, but results are unreliable due to insufficient data"

        if fairness_risk_level == "High Risk":
            return "🔴 Significant bias detected"
        if fairness_risk_level == "Moderate Risk":
            return "🟡 Potential bias detected"
        return "🟢 No significant bias detected"

    @staticmethod
    def _recommendations(
        analysis_type: str,
        bias_detected: bool,
        total_rows: int,
        has_small_groups: bool,
        is_imbalanced: bool,
    ) -> List[str]:
        recommendations: List[str] = []

        if total_rows < 30:
            recommendations.append(
                "Collect at least 30 samples for reliable analysis")

        if has_small_groups or is_imbalanced:
            recommendations.append(
                "Ensure balanced representation across sensitive groups")

        if analysis_type == "model_prediction" and bias_detected:
            recommendations.append("Review model decision thresholds")
            recommendations.append("Audit features for potential bias")

        if not recommendations:
            recommendations.append(
                "Continue monitoring fairness as more data becomes available")

        return recommendations

    @staticmethod
    def _fairness_score_and_risk(demographic_parity_difference: float) -> tuple[int, str]:
        fairness_score = int(
            round(max(0.0, 100 - (demographic_parity_difference * 100))))

        if fairness_score >= 80:
            fairness_risk_level = "Low Risk"
        elif fairness_score >= 50:
            fairness_risk_level = "Moderate Risk"
        else:
            fairness_risk_level = "High Risk"

        return fairness_score, fairness_risk_level

    @staticmethod
    def _model_fairness_score(
        disparate_impact: float,
        equal_opportunity_difference: float | None,
        false_positive_rates: Dict[str, float] | None,
    ) -> int:
        penalty = 0.0

        if disparate_impact < 0.8:
            penalty += (0.8 - disparate_impact) * 100

        if equal_opportunity_difference is not None:
            penalty += equal_opportunity_difference * 100

        if false_positive_rates:
            fpr_values = list(false_positive_rates.values())
            if fpr_values:
                fpr_gap = max(fpr_values) - min(fpr_values)
                penalty += fpr_gap * 100

        return int(round(max(0.0, 100 - penalty)))

    @staticmethod
    def _affected_group_metrics(selection_rates: Dict[str, float]) -> tuple[str, float]:
        if not selection_rates:
            return "Insufficient data", 0.0

        sorted_groups = sorted(selection_rates.items(),
                               key=lambda item: (item[1], item[0]))
        most_affected_group = sorted_groups[0][0]
        min_rate = sorted_groups[0][1]
        max_rate = max(selection_rates.values())
        impact_gap_percentage = round((max_rate - min_rate) * 100, 2)

        return most_affected_group, impact_gap_percentage

    @staticmethod
    def _normalize_binary_column(series: pd.Series, column_name: str) -> pd.Series:
        numeric = pd.to_numeric(series, errors="coerce")
        valid = numeric.dropna().isin([0, 1])
        if not valid.all():
            raise ValueError(
                f"Column '{column_name}' must contain binary values 0 or 1")
        return numeric.fillna(0).astype(int)

    @staticmethod
    def _base_insights(disparate_impact: float) -> List[str]:
        if disparate_impact < 0.8:
            return [
                "Approval rates differ significantly between sensitive groups.",
                "Disparate Impact is below the fairness threshold of 0.8.",
                "This dataset may contain historical bias affecting automated decisions.",
            ]
        return [
            "No major bias detected between sensitive groups.",
            "Selection rates are relatively balanced across groups.",
        ]

    @staticmethod
    def _append_data_shape_insights(
        insights: List[str], selection_rates: Dict[str, float]
    ) -> List[str]:
        augmented = list(insights)

        if len(selection_rates) == 1:
            augmented.append(
                "Only one group detected; disparity comparisons are limited."
            )

        if selection_rates and all(rate == 0 for rate in selection_rates.values()):
            augmented.append("All groups have 0% selection rate.")

        return augmented

    @staticmethod
    def _prediction_insights(
        disparate_impact: float,
        equal_opportunity_difference: float,
        false_positive_rates: Dict[str, float],
    ) -> List[str]:
        insights = BiasService._base_insights(disparate_impact)
        fpr_values = list(false_positive_rates.values())
        fpr_difference = max(fpr_values) - \
            min(fpr_values) if fpr_values else 0.0

        if equal_opportunity_difference > 0.1:
            insights.append(
                "The model predicts positive outcomes at significantly different rates across groups.")

        if fpr_difference > 0.1:
            insights.append(
                "Certain groups receive incorrect positive predictions more frequently.")

        if equal_opportunity_difference <= 0.1 and fpr_difference <= 0.1:
            insights.append(
                "Model error rates appear relatively consistent across sensitive groups.")

        return insights

    @staticmethod
    def _dataset_metrics(
        dataframe: pd.DataFrame,
        target_column: str,
        sensitive_attribute: str,
    ) -> Tuple[Dict[str, float], Dict[str, Dict[str, int]], float, float, bool, List[str]]:
        if target_column not in dataframe.columns:
            raise ValueError(f"Column '{target_column}' not found")
        if sensitive_attribute not in dataframe.columns:
            raise ValueError(f"Column '{sensitive_attribute}' not found")

        working = dataframe[[target_column, sensitive_attribute]].dropna(
            subset=[sensitive_attribute]).copy()
        if working.empty:
            return (
                {},
                {},
                0.0,
                1.0,
                False,
                ["Insufficient valid rows after handling missing values."],
            )

        working[target_column] = BiasService._normalize_binary_column(
            working[target_column], target_column)

        grouped = working.groupby(sensitive_attribute, dropna=True)

        selection_rates: Dict[str, float] = {}
        selection_counts: Dict[str, Dict[str, int]] = {}

        for group_name, group_frame in grouped:
            total = int(len(group_frame))
            selected = int(group_frame[target_column].sum())
            rate = selected / total if total else 0.0

            key = str(group_name)
            selection_rates[key] = round(rate, 4)
            selection_counts[key] = {"selected": selected, "total": total}

        if not selection_rates:
            return (
                {},
                {},
                0.0,
                1.0,
                False,
                ["Insufficient valid rows after grouping by sensitive attribute."],
            )

        rates = list(selection_rates.values())
        max_rate = max(rates)
        min_rate = min(rates)

        demographic_parity_difference = round(max_rate - min_rate, 4)
        disparate_impact = round(
            (min_rate / max_rate), 4) if max_rate > 0 else 1.0
        bias_detected = disparate_impact < 0.8
        insights = BiasService._base_insights(disparate_impact)

        return (
            selection_rates,
            selection_counts,
            demographic_parity_difference,
            disparate_impact,
            bias_detected,
            insights,
        )

    @staticmethod
    def _model_prediction_metrics(
        dataframe: pd.DataFrame,
        target_column: str,
        sensitive_attribute: str,
        prediction_column: str,
    ) -> Tuple[
        Dict[str, float],
        Dict[str, Dict[str, int]],
        float,
        float,
        bool,
        List[str],
        Dict[str, float],
        float,
    ]:
        required_columns = [target_column,
                            sensitive_attribute, prediction_column]
        for column in required_columns:
            if column not in dataframe.columns:
                raise ValueError(f"Column '{column}' not found")

        working = dataframe[required_columns].dropna(
            subset=[sensitive_attribute]).copy()
        if working.empty:
            return (
                {},
                {},
                0.0,
                1.0,
                False,
                ["Insufficient valid rows after handling missing values."],
                {},
                0.0,
            )

        working[target_column] = BiasService._normalize_binary_column(
            working[target_column], target_column)
        working[prediction_column] = BiasService._normalize_binary_column(
            working[prediction_column], prediction_column)

        grouped = working.groupby(sensitive_attribute, dropna=True)

        selection_rates: Dict[str, float] = {}
        selection_counts: Dict[str, Dict[str, int]] = {}
        true_positive_rates: Dict[str, float] = {}
        false_positive_rates: Dict[str, float] = {}

        for group_name, group_frame in grouped:
            key = str(group_name)

            total = int(len(group_frame))
            predicted_positive = int(
                (group_frame[prediction_column] == 1).sum())
            selection_rate = predicted_positive / total if total else 0.0

            actual_positive = int((group_frame[target_column] == 1).sum())
            true_positive = int(((group_frame[target_column] == 1) & (
                group_frame[prediction_column] == 1)).sum())
            tpr = true_positive / actual_positive if actual_positive else 0.0

            actual_negative = int((group_frame[target_column] == 0).sum())
            false_positive = int(((group_frame[target_column] == 0) & (
                group_frame[prediction_column] == 1)).sum())
            fpr = false_positive / actual_negative if actual_negative else 0.0

            selection_rates[key] = round(selection_rate, 4)
            selection_counts[key] = {
                "selected": predicted_positive, "total": total}
            true_positive_rates[key] = tpr
            false_positive_rates[key] = round(fpr, 4)

        if not selection_rates:
            return (
                {},
                {},
                0.0,
                1.0,
                False,
                ["Insufficient valid rows after grouping by sensitive attribute."],
                {},
                0.0,
            )

        rates = list(selection_rates.values())
        max_rate = max(rates)
        min_rate = min(rates)

        tpr_values = list(true_positive_rates.values())
        max_tpr = max(tpr_values) if tpr_values else 0.0
        min_tpr = min(tpr_values) if tpr_values else 0.0

        demographic_parity_difference = round(max_rate - min_rate, 4)
        disparate_impact = round(
            (min_rate / max_rate), 4) if max_rate > 0 else 1.0
        equal_opportunity_difference = round(max_tpr - min_tpr, 4)

        fpr_values = list(false_positive_rates.values())
        fpr_difference = (max(fpr_values) - min(fpr_values)
                          ) if fpr_values else 0.0

        bias_detected = disparate_impact < 0.8 or equal_opportunity_difference > 0.1 or fpr_difference > 0.1
        insights = BiasService._append_data_shape_insights(
            BiasService._prediction_insights(
                disparate_impact=disparate_impact,
                equal_opportunity_difference=equal_opportunity_difference,
                false_positive_rates=false_positive_rates,
            ),
            selection_rates,
        )

        return (
            selection_rates,
            selection_counts,
            demographic_parity_difference,
            disparate_impact,
            bias_detected,
            insights,
            false_positive_rates,
            equal_opportunity_difference,
        )

    @staticmethod
    def compute_analysis(
        dataframe: pd.DataFrame,
        target_column: str,
        sensitive_attribute: str,
        prediction_column: str | None = None,
    ) -> dict:
        resolved_target = BiasService._resolve_column_name(
            dataframe, target_column, "Target column"
        )
        resolved_sensitive = BiasService._resolve_column_name(
            dataframe, sensitive_attribute, "Sensitive attribute"
        )
        normalized_prediction = BiasService._normalize_optional_prediction(
            prediction_column)
        resolved_prediction = None

        if normalized_prediction is not None:
            resolved_prediction = BiasService._resolve_column_name(
                dataframe, normalized_prediction, "Prediction column"
            )

        mode = "dataset" if resolved_prediction is None else "model"

        if mode == "model":
            (
                selection_rates,
                selection_counts,
                demographic_parity_difference,
                disparate_impact,
                bias_detected,
                insights,
                false_positive_rates,
                equal_opportunity_difference,
            ) = BiasService._model_prediction_metrics(
                dataframe=dataframe,
                target_column=resolved_target,
                sensitive_attribute=resolved_sensitive,
                prediction_column=resolved_prediction,
            )

            (
                total_rows,
                _,
                confidence_score,
                warnings,
                data_quality_label,
                confidence_explanation,
                score_reliability_warning,
                has_small_groups,
                is_imbalanced,
            ) = BiasService._dataset_quality_metadata(
                dataframe=dataframe,
                sensitive_attribute=resolved_sensitive,
            )

            fairness_score = BiasService._model_fairness_score(
                disparate_impact=disparate_impact,
                equal_opportunity_difference=equal_opportunity_difference,
                false_positive_rates=false_positive_rates,
            )
            _, fairness_risk_level = BiasService._fairness_score_and_risk(
                demographic_parity_difference)
            if fairness_score >= 80:
                fairness_risk_level = "Low Risk"
            elif fairness_score >= 50:
                fairness_risk_level = "Moderate Risk"
            else:
                fairness_risk_level = "High Risk"

            most_affected_group, impact_gap_percentage = BiasService._affected_group_metrics(
                selection_rates)
            verdict_message = BiasService._verdict_message(
                fairness_risk_level, confidence_score)
            recommendations = BiasService._recommendations(
                analysis_type="model_prediction",
                bias_detected=bias_detected,
                total_rows=total_rows,
                has_small_groups=has_small_groups,
                is_imbalanced=is_imbalanced,
            )

            return {
                "analysis_type": "model_prediction",
                "selection_rates": selection_rates,
                "selection_counts": selection_counts,
                "demographic_parity_difference": demographic_parity_difference,
                "disparate_impact": disparate_impact,
                "false_positive_rates": false_positive_rates,
                "equal_opportunity_difference": equal_opportunity_difference,
                "fairness_score": fairness_score,
                "fairness_risk_level": fairness_risk_level,
                "bias_detected": bias_detected,
                "insights": insights,
                "most_affected_group": most_affected_group,
                "impact_gap_percentage": impact_gap_percentage,
                "confidence_score": confidence_score,
                "warnings": warnings,
                "data_quality_label": data_quality_label,
                "verdict_message": verdict_message,
                "confidence_explanation": confidence_explanation,
                "score_reliability_warning": score_reliability_warning,
                "recommendations": recommendations,
            }

        (
            selection_rates,
            selection_counts,
            demographic_parity_difference,
            disparate_impact,
            bias_detected,
            insights,
        ) = BiasService._dataset_metrics(
            dataframe=dataframe,
            target_column=resolved_target,
            sensitive_attribute=resolved_sensitive,
        )

        (
            total_rows,
            _,
            confidence_score,
            warnings,
            data_quality_label,
            confidence_explanation,
            score_reliability_warning,
            has_small_groups,
            is_imbalanced,
        ) = BiasService._dataset_quality_metadata(
            dataframe=dataframe,
            sensitive_attribute=resolved_sensitive,
        )

        fairness_score, fairness_risk_level = BiasService._fairness_score_and_risk(
            demographic_parity_difference
        )
        most_affected_group, impact_gap_percentage = BiasService._affected_group_metrics(
            selection_rates)
        verdict_message = BiasService._verdict_message(
            fairness_risk_level, confidence_score)
        recommendations = BiasService._recommendations(
            analysis_type="dataset",
            bias_detected=bias_detected,
            total_rows=total_rows,
            has_small_groups=has_small_groups,
            is_imbalanced=is_imbalanced,
        )

        return {
            "analysis_type": "dataset",
            "selection_rates": selection_rates,
            "selection_counts": selection_counts,
            "demographic_parity_difference": demographic_parity_difference,
            "disparate_impact": disparate_impact,
            "false_positive_rates": None,
            "equal_opportunity_difference": None,
            "fairness_score": fairness_score,
            "fairness_risk_level": fairness_risk_level,
            "bias_detected": bias_detected,
            "insights": insights,
            "most_affected_group": most_affected_group,
            "impact_gap_percentage": impact_gap_percentage,
            "confidence_score": confidence_score,
            "warnings": warnings,
            "data_quality_label": data_quality_label,
            "verdict_message": verdict_message,
            "confidence_explanation": confidence_explanation,
            "score_reliability_warning": score_reliability_warning,
            "recommendations": recommendations,
        }

from __future__ import annotations

from dataclasses import dataclass

import math
import pandas as pd

from app.services.bias_service import BiasService


@dataclass(frozen=True)
class MitigationMetadata:
    rows_adjusted: int
    adjustment_cap_applied: bool
    fairness_improvement_estimate: float
    method_id: str = "deterministic_rebalancing"
    method_label: str = "Deterministic Rebalancing"


@dataclass(frozen=True)
class MitigationResult:
    dataframe: pd.DataFrame
    metadata: MitigationMetadata
    target_column: str
    sensitive_attribute: str
    prediction_column: str | None


class MitigationService:
    DEFAULT_GROUP_ADJUSTMENT_CAP = 0.15

    @staticmethod
    def _resolve_columns(
        dataframe: pd.DataFrame,
        target_column: str,
        sensitive_attribute: str,
        prediction_column: str | None,
    ) -> tuple[str, str, str | None]:
        resolved_target = BiasService._resolve_column_name(
            dataframe, target_column, "Target column"
        )
        resolved_sensitive = BiasService._resolve_column_name(
            dataframe, sensitive_attribute, "Sensitive attribute"
        )
        normalized_prediction = BiasService._normalize_optional_prediction(prediction_column)

        if normalized_prediction is None:
            return resolved_target, resolved_sensitive, None

        resolved_prediction = BiasService._resolve_column_name(
            dataframe, normalized_prediction, "Prediction column"
        )
        return resolved_target, resolved_sensitive, resolved_prediction

    @staticmethod
    def apply_mitigation(
        dataframe: pd.DataFrame,
        target_column: str,
        sensitive_attribute: str,
        prediction_column: str | None = None,
        group_adjustment_cap: float = DEFAULT_GROUP_ADJUSTMENT_CAP,
    ) -> MitigationResult:
        if dataframe.empty:
            raise ValueError("Uploaded CSV is empty")

        if group_adjustment_cap < 0 or group_adjustment_cap > 1:
            raise ValueError("Adjustment cap must be between 0 and 1")

        resolved_target, resolved_sensitive, resolved_prediction = MitigationService._resolve_columns(
            dataframe=dataframe,
            target_column=target_column,
            sensitive_attribute=sensitive_attribute,
            prediction_column=prediction_column,
        )
        decision_column = resolved_prediction or resolved_target

        adjusted = dataframe.copy(deep=True)
        normalized_decisions = BiasService._normalize_binary_column(
            adjusted[decision_column], decision_column
        )

        working = pd.DataFrame(
            {
                "row_index": adjusted.index,
                "group": adjusted[resolved_sensitive],
                "decision": normalized_decisions,
            }
        ).dropna(subset=["group"])

        if working.empty:
            raise ValueError("Insufficient valid rows after handling missing values")

        group_stats: dict[str, dict[str, int | float | list[int]]] = {}
        for group_name, group_frame in working.groupby("group", dropna=True, sort=False):
            group_key = str(group_name)
            total = int(len(group_frame))
            selected = int(group_frame["decision"].sum())
            eligible_indexes = [
                int(index)
                for index in group_frame.loc[group_frame["decision"] == 0, "row_index"].tolist()
            ]
            group_stats[group_key] = {
                "total": total,
                "selected": selected,
                "rate": selected / total if total else 0.0,
                "eligible_indexes": eligible_indexes,
            }

        if not group_stats:
            raise ValueError("Insufficient valid rows after grouping by sensitive attribute")

        best_rate = max(float(stats["rate"]) for stats in group_stats.values())
        before_gap = best_rate - min(float(stats["rate"]) for stats in group_stats.values())
        rows_adjusted = 0
        adjustment_cap_applied = False

        for stats in group_stats.values():
            total = int(stats["total"])
            selected = int(stats["selected"])
            current_rate = float(stats["rate"])
            eligible_indexes = list(stats["eligible_indexes"])

            if total == 0 or current_rate >= best_rate or not eligible_indexes:
                continue

            desired_selected = math.ceil(best_rate * total)
            needed = max(0, desired_selected - selected)
            cap = math.floor(total * group_adjustment_cap)
            allowed = min(needed, cap, len(eligible_indexes))

            if needed > allowed:
                adjustment_cap_applied = True

            if allowed <= 0:
                continue

            indexes_to_adjust = eligible_indexes[:allowed]
            adjusted.loc[indexes_to_adjust, decision_column] = 1
            rows_adjusted += allowed

        after_analysis = BiasService.compute_analysis(
            dataframe=adjusted,
            target_column=resolved_target,
            sensitive_attribute=resolved_sensitive,
            prediction_column=resolved_prediction,
        )
        after_gap = float(after_analysis["demographic_parity_difference"])
        fairness_improvement_estimate = round(max(0.0, before_gap - after_gap) * 100, 2)

        return MitigationResult(
            dataframe=adjusted,
            metadata=MitigationMetadata(
                rows_adjusted=rows_adjusted,
                adjustment_cap_applied=adjustment_cap_applied,
                fairness_improvement_estimate=fairness_improvement_estimate,
            ),
            target_column=resolved_target,
            sensitive_attribute=resolved_sensitive,
            prediction_column=resolved_prediction,
        )

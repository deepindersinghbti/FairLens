import { AnalysisResult, ApplyMitigationResponse } from "@/lib/api";
import { formatRate, formatSignedNumberDelta } from "@/lib/fairness-ui/formatters";

export function mitigationNarrative(result: ApplyMitigationResponse | null) {
    if (!result) {
        return "Adjust the controls to preview how fairness-aware outcome rebalancing changes the comparison.";
    }

    const before = result.comparison.before;
    const after = result.comparison.after;
    const group = before.most_affected_group;
    const beforeRate = before.selection_rates[group];
    const afterRate = after.selection_rates[group];
    const scoreDelta = after.fairness_score - before.fairness_score;

    if (typeof beforeRate !== "number" || typeof afterRate !== "number") {
        return `FairLens adjusted ${result.metadata.rowsAdjusted} rows and changed the fairness score by ${formatSignedNumberDelta(scoreDelta)} points.`;
    }

    const capText = result.metadata.adjustmentCapApplied
        ? " The safety cap limited additional adjustments."
        : "";
    const ceilingText = result.metadata.targetRateCeilingApplied
        ? " The aggressive ceiling prevented an unrealistic jump toward full parity."
        : "";

    return `${group} selection rates moved from ${formatRate(beforeRate)} to ${formatRate(afterRate)}. Fairness score changed by ${formatSignedNumberDelta(scoreDelta)} points after ${result.metadata.rowsAdjusted} simulated row adjustments.${capText}${ceilingText}`;
}

export function analysisNarrative(result: AnalysisResult) {
    const group = result.most_affected_group;
    return `${group} has the lowest observed selection rate in this analysis. The current fairness score is ${result.fairness_score}/100 with a ${formatRate(result.demographic_parity_difference)} selection-rate gap.`;
}

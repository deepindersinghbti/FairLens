import { AnalysisResult, ApplyMitigationResponse } from "@/lib/api";

export interface GroupRateRow {
    group: string;
    beforeRate: number;
    afterRate: number;
    delta: number;
    before: number;
    after: number;
}

export function groupRateRows(before: AnalysisResult, after: AnalysisResult): GroupRateRow[] {
    const groupNames = Array.from(
        new Set([...Object.keys(before.selection_rates), ...Object.keys(after.selection_rates)])
    ).sort((a, b) => a.localeCompare(b));

    return groupNames.map((group) => {
        const beforeRate = before.selection_rates[group] ?? 0;
        const afterRate = after.selection_rates[group] ?? 0;

        return {
            group,
            beforeRate,
            afterRate,
            delta: afterRate - beforeRate,
            before: Number((beforeRate * 100).toFixed(2)),
            after: Number((afterRate * 100).toFixed(2)),
        };
    });
}

export function previewCacheKey(
    datasetId: string,
    targetColumn: string,
    sensitiveAttribute: string,
    predictionColumn: string,
    strength: string,
    targetShare: number
) {
    return [
        datasetId,
        targetColumn,
        sensitiveAttribute,
        predictionColumn || "none",
        strength,
        Math.round(targetShare * 100),
    ].join("|");
}

export function timelineCacheKey(
    datasetId: string,
    targetColumn: string,
    sensitiveAttribute: string,
    predictionColumn: string,
    strength: string
) {
    return [datasetId, targetColumn, sensitiveAttribute, predictionColumn || "none", strength].join("|");
}

export function interventionLevel(result: ApplyMitigationResponse | null) {
    if (!result) {
        return "Pending";
    }

    const adjusted = result.metadata.rowsAdjusted;
    const eligible = result.metadata.rowsEligible;

    if (adjusted === 0) {
        return "None";
    }
    if (!eligible || adjusted / eligible < 0.25) {
        return "Light";
    }
    if (adjusted / eligible < 0.6) {
        return "Moderate";
    }
    return "High";
}

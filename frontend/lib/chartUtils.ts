export interface NormalizedRatePoint {
    group: string;
    total: number;
    selected: number;
    selectionRate: number;
}

export interface NormalizedFprPoint {
    group: string;
    falsePositiveRate: number;
}

function toPercent(value: unknown): number {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return 0;
    }

    const scaled = value * 100;
    if (scaled < 0) {
        return 0;
    }
    if (scaled > 100) {
        return 100;
    }
    return Number(scaled.toFixed(2));
}

export function normalizeSelectionRates(
    selectionRates: Record<string, number>,
    selectionCounts: Record<string, { selected: number; total: number }>
): NormalizedRatePoint[] {
    const baseGroups = new Set<string>([
        ...Object.keys(selectionRates ?? {}),
        ...Object.keys(selectionCounts ?? {}),
    ]);

    return Array.from(baseGroups)
        .sort((a, b) => a.localeCompare(b))
        .map((group) => {
            const counts = selectionCounts[group] ?? { selected: 0, total: 0 };
            const rawRate = selectionRates[group] ?? 0;

            return {
                group,
                total: Number.isFinite(counts.total) ? counts.total : 0,
                selected: Number.isFinite(counts.selected) ? counts.selected : 0,
                selectionRate: toPercent(rawRate),
            };
        });
}

export function normalizeFalsePositiveRates(
    falsePositiveRates?: Record<string, number> | null
): NormalizedFprPoint[] {
    if (!falsePositiveRates) {
        return [];
    }

    return Object.entries(falsePositiveRates)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([group, rate]) => ({
            group,
            falsePositiveRate: toPercent(rate),
        }));
}

export function formatPercent(value: number, decimals = 0): string {
    if (!Number.isFinite(value)) {
        return "N/A";
    }
    return `${value.toFixed(decimals)}%`;
}

export function chartEdgeMessages(selectionData: NormalizedRatePoint[]): string[] {
    const messages: string[] = [];

    if (selectionData.length === 0) {
        messages.push("No group data available for charting.");
        return messages;
    }

    if (selectionData.length === 1) {
        messages.push("Only one group detected; disparity comparisons are limited.");
    }

    const hasAnyPositive = selectionData.some((item) => item.selectionRate > 0);
    if (!hasAnyPositive) {
        messages.push("All groups have 0% selection rate.");
    }

    return messages;
}

"use client";

import { AnalysisResult, MitigationMetadata } from "@/lib/api";

interface MitigationComparisonProps {
    before: AnalysisResult;
    after: AnalysisResult;
    metadata: MitigationMetadata;
}

interface ComparisonRow {
    label: string;
    before: string;
    after: string;
    improved: boolean;
    neutral?: boolean;
}

function formatPercent(value: number) {
    return `${(value * 100).toFixed(1)}%`;
}

function formatDelta(value: number) {
    if (value === 0) {
        return "No change";
    }

    const prefix = value > 0 ? "+" : "";
    return `${prefix}${value.toFixed(1)}`;
}

export function MitigationComparison({ before, after, metadata }: MitigationComparisonProps) {
    const beforeDisparateImpactGap = Math.abs(1 - before.disparate_impact);
    const afterDisparateImpactGap = Math.abs(1 - after.disparate_impact);

    const rows: ComparisonRow[] = [
        {
            label: "Fairness Score",
            before: `${before.fairness_score}`,
            after: `${after.fairness_score}`,
            improved: after.fairness_score > before.fairness_score,
            neutral: after.fairness_score === before.fairness_score,
        },
        {
            label: "Bias Gap",
            before: formatPercent(before.demographic_parity_difference),
            after: formatPercent(after.demographic_parity_difference),
            improved: after.demographic_parity_difference < before.demographic_parity_difference,
            neutral: after.demographic_parity_difference === before.demographic_parity_difference,
        },
        {
            label: "Disparate Impact Gap",
            before: formatPercent(beforeDisparateImpactGap),
            after: formatPercent(afterDisparateImpactGap),
            improved: afterDisparateImpactGap < beforeDisparateImpactGap,
            neutral: afterDisparateImpactGap === beforeDisparateImpactGap,
        },
    ];

    const scoreDelta = after.fairness_score - before.fairness_score;

    return (
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Rows adjusted</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-100">{metadata.rowsAdjusted}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Score change</p>
                    <p className={`mt-2 text-2xl font-semibold ${scoreDelta > 0 ? "text-emerald-700 dark:text-emerald-300" : scoreDelta < 0 ? "text-amber-700 dark:text-amber-300" : "text-slate-950 dark:text-slate-100"}`}>
                        {formatDelta(scoreDelta)}
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Method</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">{metadata.method.label}</p>
                </div>
            </div>

            {metadata.adjustmentCapApplied && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
                    The safety cap limited additional adjustments for at least one protected group.
                </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[620px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Metric</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Original Results</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Fairness-Adjusted Results</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Signal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                        {rows.map((row) => (
                            <tr key={row.label} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{row.label}</td>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.before}</td>
                                <td className="px-4 py-3 font-semibold text-slate-950 dark:text-slate-100">{row.after}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${row.neutral
                                        ? "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400"
                                        : row.improved
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200"
                                            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
                                        }`}>
                                        {row.neutral ? "No change" : row.improved ? "Improved" : "Watch"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

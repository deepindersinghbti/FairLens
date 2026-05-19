"use client";

import { AnalysisResult } from "@/lib/api";
import { metricDefinitions } from "@/lib/fairness-ui/definitions";
import { formatRate } from "@/lib/fairness-ui/formatters";
import { MetricHelp } from "@/components/analysis/MetricHelp";

interface DatasetDiagnosticsProps {
    result: AnalysisResult;
}

export function DatasetDiagnostics({ result }: DatasetDiagnosticsProps) {
    const groups = Object.entries(result.selection_counts);
    if (!groups.length) {
        return null;
    }

    const totals = groups.map(([, counts]) => counts.total);
    const totalRows = totals.reduce((sum, count) => sum + count, 0);
    const smallestGroup = groups.reduce(
        (smallest, current) => current[1].total < smallest[1].total ? current : smallest,
        groups[0]
    );
    const largestGroup = groups.reduce(
        (largest, current) => current[1].total > largest[1].total ? current : largest,
        groups[0]
    );

    const confidence = result.confidence_score ?? 0;
    const confidenceStyle = confidence >= 70
        ? "bg-emerald-500"
        : confidence >= 40
            ? "bg-amber-500"
            : "bg-rose-500";

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h4 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Dataset diagnostics</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        A quick reliability snapshot before interpreting mitigation results.
                    </p>
                </div>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-400">
                    {totalRows} analyzed rows
                </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Representation</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">
                        Smallest group: {smallestGroup[0]} ({smallestGroup[1].total})
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Largest group: {largestGroup[0]} ({largestGroup[1].total})
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                        <MetricHelp label="Outcome gap" description={metricDefinitions.demographicParity} />
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-100">
                        {formatRate(result.demographic_parity_difference)}
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                        <MetricHelp label="Confidence" description={metricDefinitions.confidence} />
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div className={`h-full ${confidenceStyle}`} style={{ width: `${Math.max(0, Math.min(100, confidence))}%` }} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">{Math.round(confidence)}%</p>
                </div>
            </div>

            {(result.warnings ?? []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {(result.warnings ?? []).map((warning) => (
                        <span key={warning} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
                            {warning}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

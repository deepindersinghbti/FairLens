"use client";

import { AnalysisResult, MitigationMetadata } from "@/lib/api";
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { formatPercent } from "@/lib/chartUtils";
import { ResolvedTheme, useTheme } from "@/components/ThemeProvider";

interface MitigationComparisonProps {
    before: AnalysisResult;
    after: AnalysisResult;
    metadata: MitigationMetadata;
}

interface ComparisonRow {
    label: string;
    before: string;
    after: string;
    change: string;
    improved: boolean;
    neutral?: boolean;
}

function formatScoreDelta(value: number) {
    if (value === 0) {
        return "No change";
    }

    const prefix = value > 0 ? "+" : "";
    return `${prefix}${value.toFixed(0)}`;
}

function formatPercentFromRate(value: number) {
    return formatPercent(value * 100, 1);
}

function formatPercentDelta(value: number) {
    if (value === 0) {
        return "No change";
    }

    const prefix = value > 0 ? "+" : "";
    return `${prefix}${(value * 100).toFixed(1)}%`;
}

const chartTheme = {
    light: {
        axis: "#475569",
        axisLine: "#cbd5e1",
        grid: "#e2e8f0",
        label: "#334155",
        tooltipBg: "#ffffff",
        tooltipBorder: "#cbd5e1",
        tooltipMuted: "#475569",
        tooltipText: "#0f172a",
        cursor: "rgba(15, 23, 42, 0.06)",
    },
    dark: {
        axis: "#94a3b8",
        axisLine: "#334155",
        grid: "#1e293b",
        label: "#e2e8f0",
        tooltipBg: "#0f172a",
        tooltipBorder: "#334155",
        tooltipMuted: "#cbd5e1",
        tooltipText: "#f8fafc",
        cursor: "rgba(148, 163, 184, 0.08)",
    },
} satisfies Record<ResolvedTheme, Record<string, string>>;

interface RateTooltipPayload {
    payload: {
        group: string;
        before: number;
        after: number;
    };
}

function RateTooltip({
    active,
    payload,
    resolvedTheme,
}: {
    active?: boolean;
    payload?: RateTooltipPayload[];
    resolvedTheme: ResolvedTheme;
}) {
    if (!active || !payload?.length) {
        return null;
    }

    const point = payload[0].payload;
    const colors = chartTheme[resolvedTheme];

    return (
        <div
            className="rounded-md border px-3 py-2 text-sm shadow-sm"
            style={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder }}
        >
            <p className="font-semibold" style={{ color: colors.tooltipText }}>{point.group}</p>
            <p style={{ color: colors.tooltipMuted }}>Original: {formatPercent(point.before, 1)}</p>
            <p style={{ color: colors.tooltipMuted }}>Fairness-Adjusted: {formatPercent(point.after, 1)}</p>
        </div>
    );
}

export function MitigationComparison({ before, after, metadata }: MitigationComparisonProps) {
    const { resolvedTheme } = useTheme();
    const colors = chartTheme[resolvedTheme];
    const beforeDisparateImpactGap = Math.abs(1 - before.disparate_impact);
    const afterDisparateImpactGap = Math.abs(1 - after.disparate_impact);
    const scoreDelta = after.fairness_score - before.fairness_score;
    const biasGapDelta = after.demographic_parity_difference - before.demographic_parity_difference;
    const disparateImpactGapDelta = afterDisparateImpactGap - beforeDisparateImpactGap;

    const groupNames = Array.from(
        new Set([...Object.keys(before.selection_rates), ...Object.keys(after.selection_rates)])
    ).sort((a, b) => a.localeCompare(b));
    const groupRows = groupNames.map((group) => {
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

    const rows: ComparisonRow[] = [
        {
            label: "Fairness Score",
            before: `${before.fairness_score}`,
            after: `${after.fairness_score}`,
            change: formatScoreDelta(scoreDelta),
            improved: scoreDelta > 0,
            neutral: scoreDelta === 0,
        },
        {
            label: "Bias Gap",
            before: formatPercentFromRate(before.demographic_parity_difference),
            after: formatPercentFromRate(after.demographic_parity_difference),
            change: formatPercentDelta(biasGapDelta),
            improved: biasGapDelta < 0,
            neutral: biasGapDelta === 0,
        },
        {
            label: "Disparate Impact Gap",
            before: formatPercentFromRate(beforeDisparateImpactGap),
            after: formatPercentFromRate(afterDisparateImpactGap),
            change: formatPercentDelta(disparateImpactGapDelta),
            improved: disparateImpactGapDelta < 0,
            neutral: disparateImpactGapDelta === 0,
        },
    ];

    return (
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Rows eligible</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-100">{metadata.rowsEligible}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Rows adjusted</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-100">{metadata.rowsAdjusted}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Bias reduction</p>
                    <p className={`mt-2 text-2xl font-semibold ${metadata.fairnessImprovementEstimate > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-slate-950 dark:text-slate-100"}`}>
                        {metadata.fairnessImprovementEstimate.toFixed(1)}%
                    </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Method</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">{metadata.method.label}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Strength</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">{metadata.strength.label}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{metadata.strength.description}</p>
                </div>
            </div>

            {metadata.adjustmentCapApplied && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
                    The safety cap limited additional adjustments for at least one protected group.
                </div>
            )}

            {metadata.targetRateCeilingApplied && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200">
                    The aggressive safety ceiling prevented an unrealistic jump toward full parity.
                </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full min-w-[620px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Metric</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Original Results</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Fairness-Adjusted Results</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Change</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Signal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                        {rows.map((row) => (
                            <tr key={row.label} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{row.label}</td>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.before}</td>
                                <td className="px-4 py-3 font-semibold text-slate-950 dark:text-slate-100">{row.after}</td>
                                <td className={`px-4 py-3 font-semibold ${row.neutral
                                    ? "text-slate-700 dark:text-slate-300"
                                    : row.improved
                                        ? "text-emerald-700 dark:text-emerald-300"
                                        : "text-amber-700 dark:text-amber-300"
                                    }`}>
                                    {row.change}
                                </td>
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

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">
                    <h4 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Selection rate by group</h4>
                    <div className="mt-4 h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            {/* compute top margin so bar labels don't overflow when bars are very tall */}
                            {(() => {
                                const maxValRaw = groupRows.length ? Math.max(...groupRows.map((r) => Math.max(r.before, r.after))) : 0;
                                const maxVal = maxValRaw <= 1 ? maxValRaw * 100 : maxValRaw;
                                const topMargin = 24 + Math.ceil((maxVal / 100) * 56);

                                return (
                                    <BarChart data={groupRows} margin={{ top: topMargin, right: 20, left: 20, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                                        <XAxis dataKey="group" tick={{ fill: colors.axis, fontSize: 12 }} axisLine={{ stroke: colors.axisLine }} tickLine={{ stroke: colors.axisLine }} />
                                        <YAxis
                                            domain={[0, 100]}
                                            ticks={[0, 20, 40, 60, 80, 100]}
                                            tick={{ fill: colors.axis, fontSize: 12 }}
                                            axisLine={{ stroke: colors.axisLine }}
                                            tickLine={{ stroke: colors.axisLine }}
                                            label={{ value: "Selection Rate (%)", angle: -90, position: "insideLeft", fill: colors.label }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: colors.cursor }}
                                            content={<RateTooltip resolvedTheme={resolvedTheme} />}
                                        />
                                        <Bar dataKey="before" fill="#64748b" name="Original" radius={[8, 8, 0, 0]}>
                                            <LabelList dataKey="before" position="top" fill={colors.label} formatter={(value) => formatPercent(Number(value), 0)} />
                                        </Bar>
                                        <Bar dataKey="after" fill="#2563eb" name="Fairness-Adjusted" radius={[8, 8, 0, 0]}>
                                            <LabelList dataKey="after" position="top" fill={colors.label} formatter={(value) => formatPercent(Number(value), 0)} />
                                        </Bar>
                                    </BarChart>
                                );
                            })()}
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full min-w-[520px] text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Group</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Original Results</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Fairness-Adjusted Results</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Change</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                            {groupRows.map((row) => (
                                <tr key={row.group} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{row.group}</td>
                                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatPercentFromRate(row.beforeRate)}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-950 dark:text-slate-100">{formatPercentFromRate(row.afterRate)}</td>
                                    <td className={`px-4 py-3 font-semibold ${row.delta > 0 ? "text-emerald-700 dark:text-emerald-300" : row.delta < 0 ? "text-amber-700 dark:text-amber-300" : "text-slate-700 dark:text-slate-300"}`}>
                                        {formatPercentDelta(row.delta)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

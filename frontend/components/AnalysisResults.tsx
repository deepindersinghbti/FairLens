"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    LabelList,
    ResponsiveContainer,
} from "recharts";
import { AnalysisResult, simplifyInsight } from "@/lib/api";
import {
    chartEdgeMessages,
    formatPercent,
    normalizeFalsePositiveRates,
    normalizeSelectionRates,
} from "@/lib/chartUtils";
import { ResolvedTheme, useTheme } from "@/components/ThemeProvider";

interface AnalysisResultsProps {
    result: AnalysisResult;
    targetColumn: string;
    sensitiveAttribute: string;
}

interface TooltipPayload {
    name: string;
    value: number;
    payload: {
        group: string;
        selectionRate: number;
        falsePositiveRate?: number;
        selected?: number;
        total?: number;
    };
}

interface ChartTooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    resolvedTheme: ResolvedTheme;
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

function CustomSelectionTooltip({ active, payload, resolvedTheme }: ChartTooltipProps) {
    if (!active || !payload || !payload.length) {
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
            <p style={{ color: colors.tooltipMuted }}>Selection Rate: {formatPercent(point.selectionRate, 0)}</p>
            <p style={{ color: colors.tooltipMuted }}>
                Selected: {point.selected} / {point.total}
            </p>
        </div>
    );
}

function CustomRateTooltip({ active, payload, resolvedTheme }: ChartTooltipProps) {
    if (!active || !payload || !payload.length) {
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
            <p style={{ color: colors.tooltipMuted }}>
                False Positive Rate: {formatPercent(Number(point.falsePositiveRate ?? 0), 0)}
            </p>
        </div>
    );
}

export function AnalysisResults({ result, targetColumn, sensitiveAttribute }: AnalysisResultsProps) {
    const { resolvedTheme } = useTheme();
    const [simpleExplanation, setSimpleExplanation] = useState("");
    const [simpleExplanationError, setSimpleExplanationError] = useState("");
    const [isSimplifying, setIsSimplifying] = useState(false);

    useEffect(() => {
        setSimpleExplanation("");
        setSimpleExplanationError("");
        setIsSimplifying(false);
    }, [result, targetColumn, sensitiveAttribute]);

    const confidenceScore = result.confidence_score ?? 0;
    const confidenceValue = Math.round(confidenceScore);
    const confidenceExplanation = result.confidence_explanation ?? [];
    const colors = chartTheme[resolvedTheme];
    const markdownClass = "prose prose-sm max-w-none prose-slate dark:prose-invert dark:prose-headings:text-slate-100 dark:prose-p:text-slate-300 dark:prose-strong:text-slate-100 dark:prose-li:text-slate-300 dark:prose-a:text-blue-300 dark:prose-code:text-slate-100";

    const confidenceStyle =
        confidenceScore >= 70
            ? "bg-green-50 border-green-300 text-green-700 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-200"
            : confidenceScore >= 40
                ? "bg-yellow-50 border-yellow-300 text-yellow-700 dark:border-yellow-900/70 dark:bg-yellow-950/40 dark:text-yellow-200"
                : "bg-red-50 border-red-300 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200";

    const selectionChartData = normalizeSelectionRates(result.selection_rates, result.selection_counts);
    const selectionMessages = chartEdgeMessages(selectionChartData);

    const falsePositiveRateMap = result.false_positive_rates ?? {};
    const modelChartData = normalizeFalsePositiveRates(result.false_positive_rates);

    const fprValues = Object.values(falsePositiveRateMap);
    const falsePositiveRateDifference = fprValues.length
        ? Math.max(...fprValues) - Math.min(...fprValues)
        : 0;

    const riskStyleByLevel: Record<string, string> = {
        "Low Risk": "bg-green-50 border-green-300 text-green-700 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-200",
        "Moderate Risk": "bg-yellow-50 border-yellow-300 text-yellow-700 dark:border-yellow-900/70 dark:bg-yellow-950/40 dark:text-yellow-200",
        "High Risk": "bg-red-50 border-red-300 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200",
    };

    const riskStyle = riskStyleByLevel[result.fairness_risk_level] || riskStyleByLevel["Moderate Risk"];

    const verdictByRisk: Record<string, { text: string; style: string }> = {
        "High Risk": {
            text: "🔴 Significant bias detected",
            style: "bg-red-50 border-red-300 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200",
        },
        "Moderate Risk": {
            text: "🟡 Potential bias detected",
            style: "bg-yellow-50 border-yellow-300 text-yellow-700 dark:border-yellow-900/70 dark:bg-yellow-950/40 dark:text-yellow-200",
        },
        "Low Risk": {
            text: "🟢 No significant bias detected",
            style: "bg-green-50 border-green-300 text-green-700 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-200",
        },
    };

    const verdict = verdictByRisk[result.fairness_risk_level] || verdictByRisk["Moderate Risk"];
    const referenceGroup = Object.entries(result.selection_rates).sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    )[0]?.[0] ?? "other groups";
    const warnings = result.warnings ?? [];
    const recommendations = result.recommendations ?? [];
    const lowConfidenceDisclaimer = confidenceScore < 40
        ? "⚠ Results may be unreliable due to insufficient data"
        : null;
    const verdictText = result.verdict_message ?? verdict.text;
    const panelClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900";
    const aiInsights = result.ai_fairness_insights ?? null;
    const aiSource = result.ai_insights_source ?? null;
    const aiWarning = result.ai_insights_warning ?? null;
    const aiSourceLabel = aiSource === "gemini" ? "Source: Gemini" : aiSource === "fallback" ? "Source: Local fallback" : null;
    const aiRiskStyle: Record<string, string> = {
        Low: "bg-green-50 border-green-200 text-green-800 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-200",
        Medium: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:border-yellow-900/70 dark:bg-yellow-950/40 dark:text-yellow-200",
        High: "bg-red-50 border-red-200 text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200",
    };
    const aiRiskClass = aiInsights ? aiRiskStyle[aiInsights.risk_level] ?? aiRiskStyle.High : "";

    const normalInsight = aiInsights
        ? [
            aiInsights.summary,
            aiInsights.issues.length ? `Key issues: ${aiInsights.issues.join(" ")}` : "",
            aiInsights.recommendations.length ? `Recommendations: ${aiInsights.recommendations.join(" ")}` : "",
        ].filter(Boolean).join("\n\n")
        : "AI insights could not be generated for this run.";

    const compactMetrics = {
        analysis_type: result.analysis_type,
        fairness_score: result.fairness_score,
        fairness_risk_level: result.fairness_risk_level,
        bias_detected: result.bias_detected,
        demographic_parity_difference: result.demographic_parity_difference,
        disparate_impact: result.disparate_impact,
        selection_rates: result.selection_rates,
        selection_counts: result.selection_counts,
        false_positive_rates: result.false_positive_rates ?? null,
        equal_opportunity_difference: result.equal_opportunity_difference ?? null,
        most_affected_group: result.most_affected_group,
        impact_gap_percentage: result.impact_gap_percentage,
        target_column: targetColumn,
        sensitive_attribute: sensitiveAttribute,
    };

    const handleSimplifyInsight = async () => {
        if (isSimplifying || simpleExplanation) {
            return;
        }

        setIsSimplifying(true);
        setSimpleExplanationError("");
        try {
            const response = await simplifyInsight({
                metrics: compactMetrics,
                normal_insight: normalInsight,
                target_column: targetColumn,
                sensitive_attribute: sensitiveAttribute,
                mode: result.analysis_type === "model_prediction" ? "model" : "dataset",
            });
            setSimpleExplanation(response.simple_explanation);
        } catch {
            setSimpleExplanationError(
                "We could not simplify this explanation right now. The original AI insight above is still available."
            );
        } finally {
            setIsSimplifying(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                    {result.analysis_type === "model_prediction"
                        ? "Model prediction bias analysis"
                        : "Dataset bias analysis"}
                </div>

                {result.data_quality_label && (
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                        Data quality: {result.data_quality_label}
                    </div>
                )}
            </div>

            {warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/70 dark:bg-amber-950/40">
                    <h4 className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-200">Warnings</h4>
                    <ul className="space-y-2">
                        {warnings.map((warning, index) => (
                            <li key={`${index}-${warning}`} className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
                                <span className="mt-0.5 font-bold">⚠</span>
                                <span>{warning}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className={`rounded-[1.75rem] border p-6 shadow-sm ${riskStyle}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] opacity-80">Fairness score</h4>
                        <p className="mt-3 text-5xl font-semibold tracking-tight">{result.fairness_score} / 100</p>
                        <p className="mt-2 text-sm font-semibold">Risk level: {result.fairness_risk_level}</p>
                    </div>
                    <div className="max-w-md rounded-2xl border border-white/40 bg-white/50 px-4 py-3 backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-950/35">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{verdictText}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                            {result.most_affected_group} applicants receive {result.impact_gap_percentage.toFixed(1)}% lower selection rate than {referenceGroup} applicants.
                        </p>
                    </div>
                </div>
                <div className={`mt-5 rounded-2xl border px-4 py-4 ${confidenceStyle}`}>
                    <p className="text-sm font-semibold">Confidence score: {confidenceValue}%</p>
                    <p className="mt-1 text-xs opacity-90">Confidence reflects dataset size and balance.</p>
                    {confidenceExplanation.length > 0 && (
                        <div className="mt-3">
                            <p className="mb-1 text-xs font-semibold">Confidence details:</p>
                            <ul className="space-y-1">
                                {confidenceExplanation.map((item, index) => (
                                    <li key={`${index}-${item}`} className="text-xs flex items-start gap-2">
                                        <span>•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {result.score_reliability_warning && (
                        <p className="mt-3 border-t border-current/20 pt-2 text-xs font-semibold">
                            {result.score_reliability_warning}
                        </p>
                    )}
                </div>
            </div>

            <div className={`rounded-2xl border p-5 shadow-sm ${verdict.style}`}>
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] mb-2">Final verdict</h4>
                <p className="text-base font-semibold">{verdictText}</p>
                {lowConfidenceDisclaimer && (
                    <p className="mt-2 text-sm font-semibold">{lowConfidenceDisclaimer}</p>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className={panelClass}>
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Demographic parity difference</h4>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                        {result.demographic_parity_difference.toFixed(4)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Max - min selection rate</p>
                </div>

                <div className={panelClass}>
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Disparate impact ratio</h4>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                        {result.disparate_impact.toFixed(4)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Min / max selection rate</p>
                    <p className={`mt-2 text-xs font-semibold ${result.bias_detected ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-300"}`}>
                        {result.disparate_impact < 0.8 ? "⚠ Below 0.8 threshold" : "✓ Above 0.8 threshold"}
                    </p>
                </div>

                <div className={panelClass}>
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Selection rate</h4>
                    <div className="mt-4 space-y-2">
                        {Object.entries(result.selection_rates).map(([group, rate]) => (
                            <div key={group} className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">{group}:</span>
                                <span className="font-semibold text-slate-950 dark:text-slate-100">{formatPercent(rate * 100, 0)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {result.analysis_type === "model_prediction" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className={panelClass}>
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">False positive rate difference</h4>
                        <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">{falsePositiveRateDifference.toFixed(4)}</p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Max - min false positive rate</p>
                    </div>

                    <div className={panelClass}>
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Equal opportunity difference</h4>
                        <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                            {(result.equal_opportunity_difference ?? 0).toFixed(4)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Max - min true positive rate</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className={panelClass}>
                    <h4 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Selection rate by group</h4>
                    {selectionMessages.length > 0 && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/70 dark:bg-amber-950/40">
                            {selectionMessages.map((message) => (
                                <p key={message} className="text-xs font-medium text-amber-900 dark:text-amber-200">
                                    {message}
                                </p>
                            ))}
                        </div>
                    )}
                    <div className="mt-4">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={selectionChartData} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
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
                                    content={<CustomSelectionTooltip resolvedTheme={resolvedTheme} />}
                                />
                                <Bar dataKey="selectionRate" fill="#1d4ed8" name="Selection Rate" radius={[8, 8, 0, 0]}>
                                    <LabelList dataKey="selectionRate" position="top" fill={colors.label} formatter={(value) => formatPercent(Number(value), 0)} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {result.analysis_type === "model_prediction" && (
                    <div className={panelClass}>
                        <h4 className="text-lg font-semibold text-slate-950 dark:text-slate-100">False positive rate by group</h4>
                        <div className="mt-4">
                            {modelChartData.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                                    False positive rate data is unavailable for the selected groups.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={modelChartData} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                                        <XAxis dataKey="group" tick={{ fill: colors.axis, fontSize: 12 }} axisLine={{ stroke: colors.axisLine }} tickLine={{ stroke: colors.axisLine }} />
                                        <YAxis
                                            domain={[0, 100]}
                                            ticks={[0, 20, 40, 60, 80, 100]}
                                            tick={{ fill: colors.axis, fontSize: 12 }}
                                            axisLine={{ stroke: colors.axisLine }}
                                            tickLine={{ stroke: colors.axisLine }}
                                            label={{ value: "False Positive Rate (%)", angle: -90, position: "insideLeft", fill: colors.label }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: colors.cursor }}
                                            content={<CustomRateTooltip resolvedTheme={resolvedTheme} />}
                                        />
                                        <Bar dataKey="falsePositiveRate" fill="#ea580c" name="False Positive Rate" radius={[8, 8, 0, 0]}>
                                            <LabelList dataKey="falsePositiveRate" position="top" fill={colors.label} formatter={(value) => formatPercent(Number(value), 0)} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className={panelClass}>
                <h4 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Selection counts by group</h4>
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Group</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Selected</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Total</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                            {Object.entries(result.selection_counts).map(([group, counts]) => (
                                <tr key={group} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{group}</td>
                                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{counts.selected}</td>
                                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{counts.total}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                                        {counts.total > 0 ? `${((counts.selected / counts.total) * 100).toFixed(0)}%` : "N/A"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {recommendations.length > 0 && (
                <div className={panelClass}>
                    <h4 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Recommended actions</h4>
                    <ul className="space-y-2">
                        {recommendations.map((recommendation, index) => (
                            <li key={`${index}-${recommendation}`} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                <span className="mt-0.5 font-bold text-emerald-600">•</span>
                                <span>{recommendation}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className={panelClass}>
                <h4 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Bias insights</h4>
                <ul className="space-y-2">
                    {result.insights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                            <span className="mt-0.5 font-bold text-blue-600">•</span>
                            <span>{insight}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className={panelClass}>
                <h4 className="text-lg font-semibold text-slate-950 dark:text-slate-100">AI Fairness Insights</h4>
                {aiSourceLabel && (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{aiSourceLabel}</p>
                )}
                {aiInsights ? (
                    <div className="mt-3 space-y-4">
                        {aiWarning && (
                            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">{aiWarning}</p>
                        )}
                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Summary</p>
                            <div className={`mt-1 ${markdownClass}`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {aiInsights.summary}
                                </ReactMarkdown>
                            </div>
                        </div>

                        <div className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${aiRiskClass}`}>
                            Risk Level: {aiInsights.risk_level}
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Key Issues</p>
                            <ul className="mt-2 space-y-2">
                                {aiInsights.issues.map((issue, index) => (
                                    <li key={`${index}-${issue}`} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                        <span className="mt-0.5 font-bold text-amber-600">•</span>
                                        <div className={markdownClass}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {issue}
                                            </ReactMarkdown>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Recommendations</p>
                            <ul className="mt-2 space-y-2">
                                {aiInsights.recommendations.map((item, index) => (
                                    <li key={`${index}-${item}`} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                                        <span className="mt-0.5 font-bold text-emerald-600">•</span>
                                        <div className={markdownClass}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {item}
                                            </ReactMarkdown>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">AI insights could not be generated for this run. Review the metric-based insights above.</p>
                )}
                <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={handleSimplifyInsight}
                        disabled={isSimplifying || Boolean(simpleExplanation)}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:disabled:border-slate-800 dark:disabled:bg-slate-900/60 dark:disabled:text-slate-500"
                    >
                        {simpleExplanation ? "Simplified explanation ready" : "Explain like I'm 15"}
                    </button>
                    {isSimplifying && (
                        <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">Simplifying explanation...</p>
                    )}
                </div>
            </div>

            {(simpleExplanation || simpleExplanationError) && (
                <div className={panelClass}>
                    <h4 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Explain like I&apos;m 15</h4>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                        {simpleExplanation ? (
                            <div className={markdownClass}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {simpleExplanation}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <p>{simpleExplanationError}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

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
import { AnalysisResult } from "@/lib/api";
import {
    chartEdgeMessages,
    formatPercent,
    normalizeFalsePositiveRates,
    normalizeSelectionRates,
} from "@/lib/chartUtils";

interface AnalysisResultsProps {
    result: AnalysisResult;
}

interface TooltipPayload {
    name: string;
    value: number;
    payload: {
        group: string;
        selectionRate: number;
        selected?: number;
        total?: number;
    };
}

interface ChartTooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
}

function CustomSelectionTooltip({ active, payload }: ChartTooltipProps) {
    if (!active || !payload || !payload.length) {
        return null;
    }

    const point = payload[0].payload;
    return (
        <div className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm">
            <p className="font-semibold text-gray-900">{point.group}</p>
            <p className="text-gray-700">Selection Rate: {formatPercent(point.selectionRate, 0)}</p>
            <p className="text-gray-700">
                Selected: {point.selected} / {point.total}
            </p>
        </div>
    );
}

export function AnalysisResults({ result }: AnalysisResultsProps) {
    const confidenceScore = result.confidence_score ?? 0;
    const confidenceValue = Math.round(confidenceScore);
    const confidenceExplanation = result.confidence_explanation ?? [];
    const confidenceStyle =
        confidenceScore >= 70
            ? "bg-green-50 border-green-300 text-green-700"
            : confidenceScore >= 40
                ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                : "bg-red-50 border-red-300 text-red-700";

    const selectionChartData = normalizeSelectionRates(result.selection_rates, result.selection_counts);
    const selectionMessages = chartEdgeMessages(selectionChartData);

    const falsePositiveRateMap = result.false_positive_rates ?? {};
    const modelChartData = normalizeFalsePositiveRates(result.false_positive_rates);

    const fprValues = Object.values(falsePositiveRateMap);
    const falsePositiveRateDifference = fprValues.length
        ? Math.max(...fprValues) - Math.min(...fprValues)
        : 0;

    const riskStyleByLevel: Record<string, string> = {
        "Low Risk": "bg-green-50 border-green-300 text-green-700",
        "Moderate Risk": "bg-yellow-50 border-yellow-300 text-yellow-700",
        "High Risk": "bg-red-50 border-red-300 text-red-700",
    };

    const riskStyle = riskStyleByLevel[result.fairness_risk_level] || riskStyleByLevel["Moderate Risk"];

    const verdictByRisk: Record<string, { text: string; style: string }> = {
        "High Risk": {
            text: "🔴 Significant bias detected",
            style: "bg-red-50 border-red-300 text-red-700",
        },
        "Moderate Risk": {
            text: "🟡 Potential bias detected",
            style: "bg-yellow-50 border-yellow-300 text-yellow-700",
        },
        "Low Risk": {
            text: "🟢 No significant bias detected",
            style: "bg-green-50 border-green-300 text-green-700",
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
    const panelClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
    const aiInsights = result.ai_fairness_insights ?? null;
    const aiRiskStyle: Record<string, string> = {
        Low: "bg-green-50 border-green-200 text-green-800",
        Medium: "bg-yellow-50 border-yellow-200 text-yellow-800",
        High: "bg-red-50 border-red-200 text-red-800",
    };
    const aiRiskClass = aiInsights ? aiRiskStyle[aiInsights.risk_level] ?? aiRiskStyle.High : "";

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                    {result.analysis_type === "model_prediction"
                        ? "Model prediction bias analysis"
                        : "Dataset bias analysis"}
                </div>

                {result.data_quality_label && (
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
                        Data quality: {result.data_quality_label}
                    </div>
                )}
            </div>

            {warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-amber-900">Warnings</h4>
                    <ul className="space-y-2">
                        {warnings.map((warning, index) => (
                            <li key={`${index}-${warning}`} className="flex items-start gap-2 text-sm text-amber-900">
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
                    <div className="max-w-md rounded-2xl border border-white/40 bg-white/50 px-4 py-3 backdrop-blur-sm">
                        <p className="text-sm font-semibold text-slate-900">{verdictText}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
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
                    <h4 className="text-sm font-medium text-slate-500">Demographic parity difference</h4>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                        {result.demographic_parity_difference.toFixed(4)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">Max - min selection rate</p>
                </div>

                <div className={panelClass}>
                    <h4 className="text-sm font-medium text-slate-500">Disparate impact ratio</h4>
                    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                        {result.disparate_impact.toFixed(4)}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">Min / max selection rate</p>
                    <p className={`mt-2 text-xs font-semibold ${result.bias_detected ? "text-rose-600" : "text-emerald-600"}`}>
                        {result.disparate_impact < 0.8 ? "⚠ Below 0.8 threshold" : "✓ Above 0.8 threshold"}
                    </p>
                </div>

                <div className={panelClass}>
                    <h4 className="text-sm font-medium text-slate-500">Selection rate</h4>
                    <div className="mt-4 space-y-2">
                        {Object.entries(result.selection_rates).map(([group, rate]) => (
                            <div key={group} className="flex justify-between text-sm">
                                <span className="text-slate-600">{group}:</span>
                                <span className="font-semibold text-slate-950">{formatPercent(rate * 100, 0)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {result.analysis_type === "model_prediction" && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className={panelClass}>
                        <h4 className="text-sm font-medium text-slate-500">False positive rate difference</h4>
                        <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{falsePositiveRateDifference.toFixed(4)}</p>
                        <p className="mt-2 text-xs text-slate-500">Max - min false positive rate</p>
                    </div>

                    <div className={panelClass}>
                        <h4 className="text-sm font-medium text-slate-500">Equal opportunity difference</h4>
                        <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                            {(result.equal_opportunity_difference ?? 0).toFixed(4)}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">Max - min true positive rate</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className={panelClass}>
                    <h4 className="text-lg font-semibold text-slate-950">Selection rate by group</h4>
                    {selectionMessages.length > 0 && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                            {selectionMessages.map((message) => (
                                <p key={message} className="text-xs font-medium text-amber-900">
                                    {message}
                                </p>
                            ))}
                        </div>
                    )}
                    <div className="mt-4">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={selectionChartData} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="group" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={{ stroke: "#cbd5e1" }} tickLine={{ stroke: "#cbd5e1" }} />
                                <YAxis
                                    domain={[0, 100]}
                                    ticks={[0, 20, 40, 60, 80, 100]}
                                    tick={{ fill: "#64748b", fontSize: 12 }}
                                    axisLine={{ stroke: "#cbd5e1" }}
                                    tickLine={{ stroke: "#cbd5e1" }}
                                    label={{ value: "Selection Rate (%)", angle: -90, position: "insideLeft" }}
                                />
                                <Tooltip content={<CustomSelectionTooltip />} />
                                <Bar dataKey="selectionRate" fill="#1d4ed8" name="Selection Rate" radius={[8, 8, 0, 0]}>
                                    <LabelList dataKey="selectionRate" position="top" formatter={(value) => formatPercent(Number(value), 0)} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {result.analysis_type === "model_prediction" && (
                    <div className={panelClass}>
                        <h4 className="text-lg font-semibold text-slate-950">False positive rate by group</h4>
                        <div className="mt-4">
                            {modelChartData.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                                    False positive rate data is unavailable for the selected groups.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={modelChartData} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="group" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={{ stroke: "#cbd5e1" }} tickLine={{ stroke: "#cbd5e1" }} />
                                        <YAxis
                                            domain={[0, 100]}
                                            ticks={[0, 20, 40, 60, 80, 100]}
                                            tick={{ fill: "#64748b", fontSize: 12 }}
                                            axisLine={{ stroke: "#cbd5e1" }}
                                            tickLine={{ stroke: "#cbd5e1" }}
                                            label={{ value: "False Positive Rate (%)", angle: -90, position: "insideLeft" }}
                                        />
                                        <Tooltip formatter={(value) => formatPercent(Number(value), 0)} />
                                        <Bar dataKey="falsePositiveRate" fill="#ea580c" name="False Positive Rate" radius={[8, 8, 0, 0]}>
                                            <LabelList dataKey="falsePositiveRate" position="top" formatter={(value) => formatPercent(Number(value), 0)} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className={panelClass}>
                <h4 className="text-lg font-semibold text-slate-950">Selection counts by group</h4>
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Group</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Selected</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Total</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {Object.entries(result.selection_counts).map(([group, counts]) => (
                                <tr key={group} className="transition-colors hover:bg-slate-50/80">
                                    <td className="px-4 py-3 font-medium text-slate-900">{group}</td>
                                    <td className="px-4 py-3 text-slate-700">{counts.selected}</td>
                                    <td className="px-4 py-3 text-slate-700">{counts.total}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-900">
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
                    <h4 className="text-lg font-semibold text-slate-950">Recommended actions</h4>
                    <ul className="space-y-2">
                        {recommendations.map((recommendation, index) => (
                            <li key={`${index}-${recommendation}`} className="flex items-start gap-3 text-slate-700">
                                <span className="mt-0.5 font-bold text-emerald-600">•</span>
                                <span>{recommendation}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className={panelClass}>
                <h4 className="text-lg font-semibold text-slate-950">Bias insights</h4>
                <ul className="space-y-2">
                    {result.insights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-slate-700">
                            <span className="mt-0.5 font-bold text-blue-600">•</span>
                            <span>{insight}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className={panelClass}>
                <h4 className="text-lg font-semibold text-slate-950">AI Fairness Insights</h4>
                {aiInsights ? (
                    <div className="mt-3 space-y-4">
                        <div>
                            <p className="text-sm font-semibold text-slate-500">Summary</p>
                            <p className="mt-1 text-sm leading-6 text-slate-700">{aiInsights.summary}</p>
                        </div>

                        <div className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${aiRiskClass}`}>
                            Risk Level: {aiInsights.risk_level}
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-slate-500">Key Issues</p>
                            <ul className="mt-2 space-y-2">
                                {aiInsights.issues.map((issue, index) => (
                                    <li key={`${index}-${issue}`} className="flex items-start gap-3 text-slate-700">
                                        <span className="mt-0.5 font-bold text-amber-600">•</span>
                                        <span>{issue}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-slate-500">Recommendations</p>
                            <ul className="mt-2 space-y-2">
                                {aiInsights.recommendations.map((item, index) => (
                                    <li key={`${index}-${item}`} className="flex items-start gap-3 text-slate-700">
                                        <span className="mt-0.5 font-bold text-emerald-600">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : (
                    <p className="mt-2 text-sm text-slate-600">AI insights are currently unavailable.</p>
                )}
            </div>
        </div>
    );
}

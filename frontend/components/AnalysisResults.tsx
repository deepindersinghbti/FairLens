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

interface AnalysisResultsProps {
    result: AnalysisResult;
}

interface TooltipPayload {
    name: string;
    value: number;
    payload: {
        name: string;
        rate: number;
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
            <p className="font-semibold text-gray-900">{point.name}</p>
            <p className="text-gray-700">Selection Rate: {point.rate}%</p>
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

    const selectionChartData = Object.entries(result.selection_rates).map(([group, rate]) => ({
        name: group,
        rate: Number((rate * 100).toFixed(0)),
        selected: result.selection_counts[group]?.selected ?? 0,
        total: result.selection_counts[group]?.total ?? 0,
    }));

    const falsePositiveRateMap = result.false_positive_rates ?? {};
    const modelChartData = Object.entries(falsePositiveRateMap).map(([group, rate]) => ({
        name: group,
        rate: Number((rate * 100).toFixed(0)),
    }));

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

    return (
        <div className="w-full space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center rounded-md bg-blue-50 border border-blue-200 px-3 py-1">
                    <span className="text-sm font-semibold text-blue-700">
                        {result.analysis_type === "model_prediction"
                            ? "Model Prediction Bias Analysis"
                            : "Dataset Bias Analysis"}
                    </span>
                </div>

                {result.data_quality_label && (
                    <div className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 py-1">
                        <span className="text-sm font-semibold text-slate-700">
                            Data Quality: {result.data_quality_label}
                        </span>
                    </div>
                )}
            </div>

            {warnings.length > 0 && (
                <div className="rounded-lg border border-orange-300 bg-orange-50 p-4">
                    <h4 className="text-sm font-semibold text-orange-800 mb-2">Warnings</h4>
                    <ul className="space-y-2">
                        {warnings.map((warning, index) => (
                            <li key={`${index}-${warning}`} className="flex items-start gap-2 text-sm text-orange-800">
                                <span className="mt-0.5 font-bold">⚠</span>
                                <span>{warning}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className={`rounded-lg border p-6 ${riskStyle}`}>
                <h4 className="text-sm font-semibold mb-3">Fairness Score</h4>
                <p className="text-4xl font-bold mb-2">{result.fairness_score} / 100</p>
                <p className="text-sm font-semibold">Risk Level: {result.fairness_risk_level}</p>
                <div className={`mt-4 rounded-md border px-4 py-3 ${confidenceStyle}`}>
                    <p className="text-sm font-semibold">Confidence Score: {confidenceValue}%</p>
                    <p className="text-xs mt-1 opacity-90">Confidence score reflects reliability based on dataset size and balance.</p>
                    {confidenceExplanation.length > 0 && (
                        <div className="mt-2">
                            <p className="text-xs font-semibold mb-1">Confidence details:</p>
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
                        <p className="text-xs font-semibold mt-3 border-t border-current/20 pt-2">
                            {result.score_reliability_warning}
                        </p>
                    )}
                </div>
            </div>

            <div className={`rounded-lg border p-5 ${verdict.style}`}>
                <h4 className="text-sm font-semibold mb-2">Final Verdict</h4>
                <p className="text-base font-semibold">{verdictText}</p>
                {lowConfidenceDisclaimer && (
                    <p className="text-sm font-semibold mt-2">{lowConfidenceDisclaimer}</p>
                )}
                <p className="text-sm mt-3">
                    {result.most_affected_group} applicants receive {result.impact_gap_percentage.toFixed(1)}% lower selection rate than {referenceGroup} applicants
                </p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-sm font-medium text-gray-600 mb-4">Demographic Parity Difference</h4>
                    <p className="text-3xl font-bold text-gray-900">
                        {result.demographic_parity_difference.toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Max - Min selection rate</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-sm font-medium text-gray-600 mb-4">Disparate Impact Ratio</h4>
                    <p className="text-3xl font-bold text-gray-900">
                        {result.disparate_impact.toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Min / Max selection rate</p>
                    <p className={`text-xs mt-2 font-semibold ${result.bias_detected ? 'text-red-600' : 'text-green-600'}`}>
                        {result.disparate_impact < 0.8 ? '⚠ Below 0.8 threshold' : '✓ Above 0.8 threshold'}
                    </p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-sm font-medium text-gray-600 mb-4">Selection Rate</h4>
                    <div className="space-y-2">
                        {Object.entries(result.selection_rates).map(([group, rate]) => (
                            <div key={group} className="flex justify-between text-sm">
                                <span className="text-gray-700">{group}:</span>
                                <span className="font-semibold text-gray-900">{(rate * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {result.analysis_type === "model_prediction" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-sm font-medium text-gray-600 mb-4">False Positive Rate Difference</h4>
                        <p className="text-3xl font-bold text-gray-900">{falsePositiveRateDifference.toFixed(4)}</p>
                        <p className="text-xs text-gray-500 mt-2">Max - Min false positive rate</p>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 className="text-sm font-medium text-gray-600 mb-4">Equal Opportunity Difference</h4>
                        <p className="text-3xl font-bold text-gray-900">
                            {(result.equal_opportunity_difference ?? 0).toFixed(4)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">Max - Min true positive rate</p>
                    </div>
                </div>
            )}

            {/* Selection Rate Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Selection Rate by Group</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={selectionChartData} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis
                            domain={[0, 100]}
                            ticks={[0, 20, 40, 60, 80, 100]}
                            label={{ value: "Selection Rate (%)", angle: -90, position: "insideLeft" }}
                        />
                        <Tooltip content={<CustomSelectionTooltip />} />
                        <Bar dataKey="rate" fill="#3b82f6" name="Selection Rate">
                            <LabelList dataKey="rate" position="top" formatter={(value: number) => `${value}%`} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {result.analysis_type === "model_prediction" && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">False Positive Rate by Group</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={modelChartData} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis
                                domain={[0, 100]}
                                ticks={[0, 20, 40, 60, 80, 100]}
                                label={{ value: "False Positive Rate (%)", angle: -90, position: "insideLeft" }}
                            />
                            <Tooltip formatter={(value: number | string) => `${value}%`} />
                            <Bar dataKey="rate" fill="#f97316" name="False Positive Rate">
                                <LabelList dataKey="rate" position="top" formatter={(value: number) => `${value}%`} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Selection Count Table */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Selection Counts by Group</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Group</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Selected</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Total</th>
                                <th className="px-4 py-2 text-left font-semibold text-gray-700">Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(result.selection_counts).map(([group, counts]) => (
                                <tr key={group} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="px-4 py-2 text-gray-800 font-medium">{group}</td>
                                    <td className="px-4 py-2 text-gray-800">{counts.selected}</td>
                                    <td className="px-4 py-2 text-gray-800">{counts.total}</td>
                                    <td className="px-4 py-2 font-semibold text-gray-800">
                                        {counts.total > 0 ? `${((counts.selected / counts.total) * 100).toFixed(0)}%` : "N/A"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {recommendations.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions</h4>
                    <ul className="space-y-2">
                        {recommendations.map((recommendation, index) => (
                            <li key={`${index}-${recommendation}`} className="flex items-start gap-3 text-gray-700">
                                <span className="text-emerald-600 font-bold mt-0.5">•</span>
                                <span>{recommendation}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Bias Insights Panel */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Bias Insights</h4>
                <ul className="space-y-2">
                    {result.insights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-gray-700">
                            <span className="text-blue-500 font-bold mt-0.5">•</span>
                            <span>{insight}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

"use client";

import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { chartTheme } from "@/components/charts/chartTheme";
import { MitigationSimulationPoint } from "@/lib/api";

interface MitigationTimelineChartProps {
    points: MitigationSimulationPoint[];
    selectedStep: number;
    onSelectPoint: (point: MitigationSimulationPoint) => void;
}

export function MitigationTimelineChart({ points, selectedStep, onSelectPoint }: MitigationTimelineChartProps) {
    const { resolvedTheme } = useTheme();
    const colors = chartTheme[resolvedTheme];
    const chartData = points.map((point) => ({
        ...point,
        bias_gap_percent: Number((point.bias_gap * 100).toFixed(2)),
    }));

    return (
        <div className="space-y-3">
            <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 12, right: 24, left: 12, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                        <XAxis dataKey="step" tick={{ fill: colors.axis, fontSize: 12 }} axisLine={{ stroke: colors.axisLine }} tickLine={{ stroke: colors.axisLine }} tickFormatter={(value) => `${value}%`} />
                        <YAxis yAxisId="score" domain={[0, 100]} tick={{ fill: colors.axis, fontSize: 12 }} axisLine={{ stroke: colors.axisLine }} tickLine={{ stroke: colors.axisLine }} />
                        <YAxis yAxisId="gap" orientation="right" domain={[0, 100]} tick={{ fill: colors.axis, fontSize: 12 }} axisLine={{ stroke: colors.axisLine }} tickLine={{ stroke: colors.axisLine }} />
                        <Tooltip
                            cursor={{ stroke: colors.axisLine }}
                            contentStyle={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, color: colors.tooltipText }}
                            formatter={(value, name) => [
                                name === "bias_gap_percent" ? `${Number(value).toFixed(1)}%` : Number(value).toFixed(0),
                                name === "bias_gap_percent" ? "Bias gap" : "Fairness score",
                            ]}
                            labelFormatter={(value) => `Target intensity ${value}%`}
                        />
                        <Line yAxisId="score" type="monotone" dataKey="fairness_score" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} isAnimationActive>
                            <LabelList dataKey="fairness_score" position="top" fill={colors.label} fontSize={11} />
                        </Line>
                        <Line yAxisId="gap" type="monotone" dataKey="bias_gap_percent" stroke="#ea580c" strokeWidth={2} dot={{ r: 4 }} isAnimationActive />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2">
                {points.map((point) => (
                    <button
                        key={point.step}
                        type="button"
                        onClick={() => onSelectPoint(point)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${selectedStep === point.step
                            ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
                            }`}
                    >
                        {point.step}% target
                    </button>
                ))}
            </div>
        </div>
    );
}

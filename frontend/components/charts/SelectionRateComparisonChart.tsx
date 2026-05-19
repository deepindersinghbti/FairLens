"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { chartTheme } from "@/components/charts/chartTheme";
import { formatPercent } from "@/lib/chartUtils";
import { GroupRateRow } from "@/lib/fairness-ui/dashboard";

interface SelectionRateComparisonChartProps {
    rows: GroupRateRow[];
}

interface RateTooltipPayload {
    payload: GroupRateRow;
}

export function SelectionRateComparisonChart({ rows }: SelectionRateComparisonChartProps) {
    const { resolvedTheme } = useTheme();
    const colors = chartTheme[resolvedTheme];

    return (
        <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
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
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) {
                                return null;
                            }

                            const point = (payload[0] as RateTooltipPayload).payload;

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
                        }}
                    />
                    <Bar dataKey="before" fill="#64748b" name="Original" radius={[8, 8, 0, 0]} isAnimationActive>
                        <LabelList dataKey="before" position="top" fill={colors.label} formatter={(value) => formatPercent(Number(value), 0)} />
                    </Bar>
                    <Bar dataKey="after" fill="#2563eb" name="Fairness-Adjusted" radius={[8, 8, 0, 0]} isAnimationActive>
                        <LabelList dataKey="after" position="top" fill={colors.label} formatter={(value) => formatPercent(Number(value), 0)} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

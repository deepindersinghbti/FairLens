'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ReportSelectionData } from '@/lib/api';

interface SelectionRateChartReportProps {
    data?: Record<string, unknown>;
    selectionData: ReportSelectionData[];
}

export default function SelectionRateChartReport({
    data,
    selectionData,
}: SelectionRateChartReportProps) {
    const chartData = selectionData.map((item) => ({
        name: item.group,
        rate: Math.round(item.rate * 100),
        selected: item.selected,
        total: item.total,
    }));

    // Custom Y axis label component to ensure vertical centering
    const YAxisCenteredLabel = (props: any) => {
        const { x, y, width, height, value, stroke } = props;
        // compute center of the axis area
        const centerY = (y ?? 0) + (height ?? 0) / 2;
        const centerX = (x ?? 0);
        const fill = stroke ?? '#475569';
        return (
            <text
                x={centerX}
                y={centerY}
                transform={`rotate(-90 ${centerX} ${centerY})`}
                textAnchor="middle"
                fill={fill}
                style={{ fontSize: 12 }}
            >
                {value}
            </text>
        );
    };

    return (
        <div className="page-break-inside-avoid bg-white border border-slate-200 rounded p-4">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 48, right: 20, left: 20, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="name" stroke="#475569" />
                    <YAxis
                        stroke="#475569"
                        label={{ value: 'Selection Rate (%)', angle: -90, position: 'insideLeft', dy: 6 }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #cbd5e1',
                        }}
                        labelStyle={{ color: '#0f172a' }}
                        formatter={(value) => `${value}%`}
                    />
                    <Legend />
                    <Bar
                        dataKey="rate"
                        fill="#1e40af"
                        name="Selection Rate %"
                        isAnimationActive={false}
                    />
                </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-xs text-slate-600">
                <p className="font-semibold text-slate-700 mb-2">Selection Counts by Group:</p>
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="px-2 py-1">Group</th>
                            <th className="px-2 py-1">Selected</th>
                            <th className="px-2 py-1">Total</th>
                            <th className="px-2 py-1">Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectionData.map((item) => (
                            <tr key={item.group} className="border-b border-slate-100">
                                <td className="px-2 py-1">{item.group}</td>
                                <td className="px-2 py-1">{item.selected}</td>
                                <td className="px-2 py-1">{item.total}</td>
                                <td className="px-2 py-1">{(item.rate * 100).toFixed(1)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
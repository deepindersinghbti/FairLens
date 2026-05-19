import { ReportMetrics, ReportSelectionData } from '@/lib/api';

interface MetricsTableProps {
    fairnessScore: number;
    riskLevel: string;
    metrics: ReportMetrics;
    selectionData: ReportSelectionData[];
    confidenceScore?: number;
}

export default function MetricsTable({
    fairnessScore,
    riskLevel,
    metrics,
    selectionData,
    confidenceScore,
}: MetricsTableProps) {
    return (
        <div className="page-break-inside-avoid">
            <h2 className="report-subheader">Detailed Fairness Metrics</h2>

            <div className="overflow-x-auto">
                <table className="report-table w-full bg-white border border-slate-300">
                    <tbody>
                        <tr className="bg-slate-50 border-b border-slate-300">
                            <td className="font-semibold px-4 py-2 w-1/2 bg-slate-100">Fairness Score</td>
                            <td className="px-4 py-2 font-semibold text-slate-900">{fairnessScore} / 100</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                            <td className="font-semibold px-4 py-2 bg-slate-100">Risk Level</td>
                            <td className="px-4 py-2">{riskLevel}</td>
                        </tr>
                        <tr className="bg-slate-50 border-b border-slate-300">
                            <td className="font-semibold px-4 py-2 bg-slate-100">Demographic Parity Difference</td>
                            <td className="px-4 py-2">{metrics.demographic_parity_difference.toFixed(4)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                            <td className="font-semibold px-4 py-2 bg-slate-100">Disparate Impact Ratio</td>
                            <td className="px-4 py-2">{metrics.disparate_impact.toFixed(4)}</td>
                        </tr>
                        {metrics.equal_opportunity_difference !== null && (
                            <tr className="bg-slate-50 border-b border-slate-300">
                                <td className="font-semibold px-4 py-2 bg-slate-100">Equal Opportunity Difference</td>
                                <td className="px-4 py-2">{metrics.equal_opportunity_difference?.toFixed(4)}</td>
                            </tr>
                        )}
                        {confidenceScore !== undefined && (
                            <tr className="border-b border-slate-300">
                                <td className="font-semibold px-4 py-2 bg-slate-100">Confidence Score</td>
                                <td className="px-4 py-2">{confidenceScore.toFixed(1)}%</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-6">
                <h3 className="font-semibold text-slate-900 mb-3">Selection Rates by Group</h3>
                <div className="overflow-x-auto">
                    <table className="report-table w-full bg-white border border-slate-300">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-300">
                                <th className="font-semibold px-4 py-2 text-left">Group</th>
                                <th className="font-semibold px-4 py-2 text-right">Selection Rate</th>
                                <th className="font-semibold px-4 py-2 text-right">Selected</th>
                                <th className="font-semibold px-4 py-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectionData.map((item, idx) => (
                                <tr key={item.group} className={idx % 2 === 0 ? 'bg-slate-50' : 'border-b border-slate-300'}>
                                    <td className="px-4 py-2 font-medium text-slate-900">{item.group}</td>
                                    <td className="px-4 py-2 text-right">{(item.rate * 100).toFixed(1)}%</td>
                                    <td className="px-4 py-2 text-right">{item.selected}</td>
                                    <td className="px-4 py-2 text-right">{item.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
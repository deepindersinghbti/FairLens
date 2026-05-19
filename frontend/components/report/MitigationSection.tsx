import { ReportMitigationData } from '@/lib/api';

interface MitigationSectionProps {
    mitigation: ReportMitigationData;
}

export default function MitigationSection({ mitigation }: MitigationSectionProps) {
    return (
        <div className="page-break-inside-avoid">
            <h2 className="report-subheader">Mitigation Impact Summary</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Before/After Cards */}
                <div className="report-card border-2 border-slate-300">
                    <div className="text-sm font-semibold text-slate-700 mb-3">Before Mitigation</div>
                    <div className="text-3xl font-bold text-red-700">{mitigation.before_fairness_score}</div>
                    <div className="text-xs text-slate-600 mt-1">Fairness Score / 100</div>
                </div>

                <div className="report-card border-2 border-green-300 bg-green-50">
                    <div className="text-sm font-semibold text-slate-700 mb-3">After Mitigation</div>
                    <div className="text-3xl font-bold text-green-700">{mitigation.after_fairness_score}</div>
                    <div className="text-xs text-slate-600 mt-1">Fairness Score / 100</div>
                </div>
            </div>

            {/* Mitigation Details */}
            <div className="bg-slate-50 border border-slate-200 rounded p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="font-semibold text-slate-700">Mitigation Strength</div>
                        <div className="text-slate-900 mt-1">{mitigation.strength_label}</div>
                    </div>
                    <div>
                        <div className="font-semibold text-slate-700">Fairness Improvement</div>
                        <div className="text-slate-900 mt-1">{mitigation.fairness_improvement_estimate.toFixed(2)}%</div>
                    </div>
                    <div>
                        <div className="font-semibold text-slate-700">Rows Adjusted</div>
                        <div className="text-slate-900 mt-1">{mitigation.rows_adjusted} / {mitigation.rows_eligible} eligible</div>
                    </div>
                    <div>
                        <div className="font-semibold text-slate-700">Cap Applied</div>
                        <div className="text-slate-900 mt-1">{mitigation.adjustment_cap_applied ? 'Yes' : 'No'}</div>
                    </div>
                </div>
            </div>

            {/* Selection Rate Comparison */}
            <div>
                <h3 className="font-semibold text-slate-900 mb-3">Selection Rate Changes by Group</h3>
                <div className="overflow-x-auto">
                    <table className="report-table w-full bg-white border border-slate-300">
                        <thead>
                            <tr className="bg-slate-100 border-b border-slate-300">
                                <th className="font-semibold px-4 py-2 text-left">Group</th>
                                <th className="font-semibold px-4 py-2 text-right">Before</th>
                                <th className="font-semibold px-4 py-2 text-right">After</th>
                                <th className="font-semibold px-4 py-2 text-right">Change</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(mitigation.before_selection_rates).map(([group, beforeRate], idx) => {
                                const afterRate = mitigation.after_selection_rates[group] || 0;
                                const change = afterRate - beforeRate;
                                return (
                                    <tr key={group} className={idx % 2 === 0 ? 'bg-slate-50' : ''}>
                                        <td className="px-4 py-2 font-medium text-slate-900">{group}</td>
                                        <td className="px-4 py-2 text-right">{(beforeRate * 100).toFixed(1)}%</td>
                                        <td className="px-4 py-2 text-right text-green-700 font-semibold">{(afterRate * 100).toFixed(1)}%</td>
                                        <td className={`px-4 py-2 text-right font-semibold ${change > 0 ? 'text-green-700' : change < 0 ? 'text-red-700' : 'text-slate-900'
                                            }`}>
                                            {change > 0 ? '+' : ''}{(change * 100).toFixed(1)}%
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
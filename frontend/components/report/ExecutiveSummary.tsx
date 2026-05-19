interface ExecutiveSummaryProps {
    fairnessScore: number;
    riskLevel: string;
    mostAffectedGroup: string;
    impactGapPercentage: number;
}

function getRiskColor(level: string): string {
    if (level === 'High Risk') return 'text-red-700 bg-red-50';
    if (level === 'Moderate Risk') return 'text-amber-700 bg-amber-50';
    return 'text-green-700 bg-green-50';
}

function getRiskBadgeColor(level: string): string {
    if (level === 'High Risk') return 'bg-red-100 text-red-900';
    if (level === 'Moderate Risk') return 'bg-amber-100 text-amber-900';
    return 'bg-green-100 text-green-900';
}

function getScoreColor(score: number): string {
    if (score >= 70) return 'text-green-700';
    if (score >= 40) return 'text-amber-700';
    return 'text-red-700';
}

export default function ExecutiveSummary({
    fairnessScore,
    riskLevel,
    mostAffectedGroup,
    impactGapPercentage,
}: ExecutiveSummaryProps) {
    return (
        <div className="page-break-inside-avoid">
            <h2 className="report-subheader">Executive Summary</h2>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {/* Fairness Score */}
                <div className="report-card">
                    <div className="report-metric-label text-slate-700 dark:text-slate-200">Fairness Score</div>
                    <div className={`report-metric-value ${getScoreColor(fairnessScore)} `}>
                        {fairnessScore}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">out of 100</div>
                </div>

                {/* Risk Level */}
                <div className="report-card">
                    <div className="report-metric-label text-slate-700 dark:text-slate-200">Risk Level</div>
                    <div className={`font-semibold py-2 rounded text-center ${getRiskBadgeColor(riskLevel)}`}>
                        {riskLevel.replace(' Risk', '')}
                    </div>
                </div>

                {/* Most Affected Group */}
                <div className="report-card">
                    <div className="report-metric-label text-slate-700 dark:text-slate-200">Most Affected Group</div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mt-2 text-sm">
                        {mostAffectedGroup}
                    </div>
                </div>

                {/* Impact Gap */}
                <div className="report-card">
                    <div className="report-metric-label text-slate-700 dark:text-slate-200">Impact Gap</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                        {impactGapPercentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-600 mt-1">Lower selection rate</div>
                </div>
            </div>
        </div>
    );
}
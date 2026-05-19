import { ReportPayload } from '@/lib/api';
import ReportHeader from './ReportHeader';
import ExecutiveSummary from './ExecutiveSummary';
import PlainLanguageSummary from './PlainLanguageSummary';
import KeyFindings from './KeyFindings';
import SelectionRateChartReport from './SelectionRateChartReport';
import MetricsTable from './MetricsTable';
import MitigationSection from './MitigationSection';
import SupplementaryInsights from './SupplementaryInsights';
import Recommendations from './Recommendations';
import ReportFooter from './ReportFooter';

interface FairnessAuditReportProps {
    data: ReportPayload;
}

export default function FairnessAuditReport({ data }: FairnessAuditReportProps) {
    return (
        <div className="report-container space-y-8">
            <ReportHeader data={data} />

            <ExecutiveSummary
                fairnessScore={data.fairness_score}
                riskLevel={data.fairness_risk_level}
                mostAffectedGroup={data.most_affected_group}
                impactGapPercentage={data.impact_gap_percentage}
            />

            <PlainLanguageSummary summary={data.plain_language_summary} />

            <KeyFindings findings={data.key_findings} />

            <div className="page-break-inside-avoid">
                <h2 className="report-subheader">Selection Rates by Group</h2>
                <SelectionRateChartReport data={data.chart_data} selectionData={data.selection_data} />
            </div>

            <MetricsTable
                fairnessScore={data.fairness_score}
                riskLevel={data.fairness_risk_level}
                metrics={data.fairness_metrics}
                selectionData={data.selection_data}
                confidenceScore={data.confidence_score}
            />

            {data.mitigation_data && <MitigationSection mitigation={data.mitigation_data} />}

            {data.ai_insights && (
                <SupplementaryInsights
                    insights={data.ai_insights}
                    source={data.ai_insights_source}
                    disclaimer={data.ai_insights_disclaimer}
                />
            )}

            <Recommendations recommendations={data.recommendations} />

            <ReportFooter
                generatedAt={data.generated_at}
                disclaimer={data.report_disclaimer}
            />
        </div>
    );
}

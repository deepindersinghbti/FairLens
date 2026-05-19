'use client';

import { useState } from 'react';
import { ReportAIInsights } from '@/lib/api';

interface SupplementaryInsightsProps {
    insights: ReportAIInsights;
    source?: string;
    disclaimer: string;
}

export default function SupplementaryInsights({
    insights,
    source = 'fallback',
    disclaimer,
}: SupplementaryInsightsProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="page-break-inside-avoid">
            <h2 className="report-subheader">Supplementary AI Insights</h2>

            {/* Disclaimer */}
            <div className="report-disclaimer mb-4">
                <p className="text-sm">{disclaimer}</p>
            </div>

            {/* Source Attribution */}
            <div className="text-xs text-slate-600 mb-4 italic">
                Source: {source === 'gemini' ? 'AI Model (Gemini)' : 'Local Analysis'}
            </div>

            {/* Interactive: Expanded in print, toggleable in screen */}
            <div className="print:block">
                <div className="bg-slate-50 border border-slate-200 rounded p-4 space-y-4">
                    {/* Summary */}
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-2">Summary</h3>
                        <p className="text-sm text-slate-700 leading-relaxed">{insights.summary}</p>
                    </div>

                    {/* Risk Level */}
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-2">AI Risk Assessment</h3>
                        <div className="inline-block px-3 py-1 bg-slate-200 text-slate-900 text-sm rounded">
                            {insights.risk_level}
                        </div>
                    </div>

                    {/* Issues */}
                    {insights.issues && insights.issues.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-2">Identified Issues</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                                {insights.issues.map((issue, idx) => (
                                    <li key={idx}>{issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Recommendations */}
                    {insights.recommendations && insights.recommendations.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-2">AI Recommendations</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                                {insights.recommendations.map((rec, idx) => (
                                    <li key={idx}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
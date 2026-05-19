'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ReportPayload } from '@/lib/api';
import FairnessAuditReport from '@/components/report/FairnessAuditReport';
import ReportExpiredPage from '@/components/report/ReportExpiredPage';
import { LoadingMessage } from '@/components/LoadingMessage';

export default function ReportPage() {
    const params = useParams();
    const analysisId = params.analysisId as string;

    const [reportData, setReportData] = useState<ReportPayload | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPrintReady, setIsPrintReady] = useState(false);

    useEffect(() => {
        const fetchReportData = async () => {
            try {
                const response = await fetch(`/api/report-data/${analysisId}`);

                if (response.status === 404) {
                    setError('expired');
                    setIsLoading(false);
                    return;
                }

                if (!response.ok) {
                    throw new Error('Failed to load report data');
                }

                const data: ReportPayload = await response.json();
                setReportData(data);
                setIsLoading(false);

                // Delay to ensure all charts render before enabling print
                setTimeout(() => {
                    setIsPrintReady(true);
                }, 500);
            } catch (err) {
                setError('network');
                setIsLoading(false);
            }
        };

        if (analysisId) {
            fetchReportData();
        }
    }, [analysisId]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto mb-4"></div>
                    <p className="text-slate-700">Loading audit report...</p>
                </div>
            </div>
        );
    }

    // Error: Session expired
    if (error === 'expired') {
        return <ReportExpiredPage />;
    }

    // Error: Network/other error
    if (error === 'network' || !reportData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="max-w-md text-center p-6 bg-slate-50 rounded-lg border border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Unable to Load Report</h2>
                    <p className="text-slate-600 mb-6">
                        There was an error retrieving your audit report. Please try again or run a new analysis.
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-900"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="light min-h-screen bg-white">
            {/* Print-only action bar */}
            <div className="no-print sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
                <h1 className="text-lg font-semibold text-slate-900">AI Fairness Audit Report</h1>
                <div className="flex items-center gap-4">
                    <span className={`text-sm ${isPrintReady ? 'text-green-700' : 'text-amber-700'}`}>
                        {isPrintReady ? '✓ Ready to print' : 'Loading...'}
                    </span>
                    <button
                        onClick={() => window.print()}
                        disabled={!isPrintReady}
                        className={`px-4 py-2 rounded font-medium ${isPrintReady
                                ? 'bg-blue-800 text-white hover:bg-blue-900 cursor-pointer'
                                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        Print / Save as PDF
                    </button>
                </div>
            </div>

            {/* Report content */}
            <main className="max-w-4xl mx-auto px-6 py-8">
                <FairnessAuditReport data={reportData} />
            </main>
        </div>
    );
}

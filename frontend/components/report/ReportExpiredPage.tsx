'use client';

const useRouter = () => ({ push: (url: string) => window.location.href = url });

export default function ReportExpiredPage() {
    const router = useRouter();

    return (
        <div className="light min-h-screen bg-white flex items-center justify-center px-6 py-12">
            <div className="max-w-md text-center space-y-6 bg-slate-50 p-8 rounded-lg border border-slate-200">
                <div className="text-5xl">⏰</div>

                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Report Session Expired</h1>
                    <p className="text-slate-600">
                        This audit report session is no longer available.
                    </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-slate-700">
                    <p className="mb-2">
                        <span className="font-semibold">Why did this happen?</span>
                    </p>
                    <p>
                        Analysis sessions are available for 24 hours from generation. Your report was either automatically cleaned up or the server was restarted.
                    </p>
                </div>

                <div className="space-y-3 text-left bg-slate-100 p-4 rounded text-sm">
                    <p className="font-semibold text-slate-900">To generate a fresh report:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700">
                        <li>Return to the FairLens Dashboard</li>
                        <li>Load or upload your dataset</li>
                        <li>Run a new analysis</li>
                        <li>Generate the audit report</li>
                    </ol>
                </div>

                <button
                    onClick={() => router.push('/')}
                    className="w-full px-6 py-3 bg-blue-800 text-white font-semibold rounded hover:bg-blue-900 transition"
                >
                    Return to Dashboard
                </button>

                <p className="text-xs text-slate-500">
                    Need help? Contact support or consult the FairLens documentation.
                </p>
            </div>
        </div>
    );
}
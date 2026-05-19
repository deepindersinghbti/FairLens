interface ReportFooterProps {
    generatedAt: string;
    disclaimer: string;
}

export default function ReportFooter({ generatedAt, disclaimer }: ReportFooterProps) {
    const formattedDate = new Date(generatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    return (
        <div className="print-only mt-12 pt-6 border-t border-slate-300 text-xs text-slate-600 space-y-2">
            <div className="flex justify-between">
                <div>
                    <p className="font-semibold text-slate-700">FairLens AI Fairness Audit Platform</p>
                    <p>Generated: {formattedDate}</p>
                </div>
                <div className="text-right">
                    <p>Page <span className="page-number">1</span></p>
                </div>
            </div>

            <div className="bg-slate-100 p-2 rounded text-xs">
                <p className="text-slate-700">{disclaimer}</p>
            </div>
        </div>
    );
}
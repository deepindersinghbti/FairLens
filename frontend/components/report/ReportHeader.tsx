import { ReportPayload } from '@/lib/api';

interface ReportHeaderProps {
    data: ReportPayload;
}

export default function ReportHeader({ data }: ReportHeaderProps) {
    const formattedDate = new Date(data.generated_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const formattedTime = new Date(data.generated_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="page-break-inside-avoid text-center border-b-2 border-slate-300 pb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">FairLens</h1>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">AI Fairness Audit Report</h2>

            <div className="text-sm text-slate-600 space-y-1">
                <div><span className="font-semibold">Analysis ID:</span> {data.analysis_id.substring(0, 8)}...</div>
                <div><span className="font-semibold">Generated:</span> {formattedDate} at {formattedTime}</div>
                <div><span className="font-semibold">Dataset:</span> {data.dataset_name}</div>
                <div><span className="font-semibold">Analysis Type:</span> {data.analysis_type === 'dataset' ? 'Dataset Bias' : 'Model Prediction Bias'}</div>
            </div>
        </div>
    );
}
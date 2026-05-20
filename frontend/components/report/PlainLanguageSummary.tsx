interface PlainLanguageSummaryProps {
    summary: string;
}

import MarkdownRenderer from '@/components/common/MarkdownRenderer';

export default function PlainLanguageSummary({ summary }: PlainLanguageSummaryProps) {
    return (
        <div className="page-break-inside-avoid">
            <h2 className="report-subheader">Plain Language Summary</h2>

            <div className="bg-blue-50 border-l-4 border-blue-800 p-4 rounded text-slate-800 leading-relaxed">
                <MarkdownRenderer content={summary} className="m-0" />
            </div>
        </div>
    );
}
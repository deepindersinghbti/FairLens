interface RecommendationsProps {
    recommendations: string[];
}

import MarkdownRenderer from '@/components/common/MarkdownRenderer';

export default function Recommendations({ recommendations }: RecommendationsProps) {
    return (
        <div className="page-break-inside-avoid">
            <h2 className="report-subheader">Recommendations</h2>

            <ul className="space-y-3 list-disc list-inside text-slate-800">
                {recommendations.map((rec, index) => (
                    <li key={index} className="text-sm leading-relaxed">
                        <MarkdownRenderer content={rec} className="m-0" inline />
                    </li>
                ))}
            </ul>
        </div>
    );
}
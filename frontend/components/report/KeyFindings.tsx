interface KeyFindingsProps {
    findings: string[];
}

export default function KeyFindings({ findings }: KeyFindingsProps) {
    return (
        <div className="page-break-inside-avoid">
            <h2 className="report-subheader">Key Findings</h2>

            <ol className="space-y-3 list-decimal list-inside text-slate-800">
                {findings.map((finding, index) => (
                    <li key={index} className="text-sm leading-relaxed">
                        {finding}
                    </li>
                ))}
            </ol>
        </div>
    );
}
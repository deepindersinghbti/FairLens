"use client";

interface DatasetPreviewProps {
    columns: string[];
    preview: Record<string, unknown>[];
    rowCount?: number;
}

export function DatasetPreview({ columns, preview, rowCount }: DatasetPreviewProps) {
    if (!columns.length || !preview.length) {
        return null;
    }

    return (
        <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
                <h3 className="text-base font-semibold text-slate-950">
                    Dataset preview
                </h3>
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {rowCount || preview.length} rows
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                        <tr className="border-b border-slate-200 bg-slate-50">
                            {columns.map((col) => (
                                <th
                                    key={col}
                                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600"
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {preview.map((row, idx) => (
                            <tr key={idx} className="transition-colors hover:bg-slate-50/80">
                                {columns.map((col) => (
                                    <td key={`${idx}-${col}`} className="px-4 py-3 text-slate-700">
                                        {String(row[col] ?? "")}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

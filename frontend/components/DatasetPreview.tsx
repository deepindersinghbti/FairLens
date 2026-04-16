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
        <div className="w-full overflow-x-auto bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                    Dataset Preview ({rowCount || preview.length} rows)
                </h3>
            </div>
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                        {columns.map((col) => (
                            <th
                                key={col}
                                className="px-4 py-2 text-left font-semibold text-gray-700"
                            >
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {preview.map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                            {columns.map((col) => (
                                <td key={`${idx}-${col}`} className="px-4 py-2 text-gray-800">
                                    {String(row[col] ?? "")}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

"use client";

import { useState } from "react";
import { downloadDataset } from "@/lib/api";

interface DownloadMitigatedCsvButtonProps {
    datasetId: string;
}

export function DownloadMitigatedCsvButton({ datasetId }: DownloadMitigatedCsvButtonProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState("");

    const handleDownload = async () => {
        setIsDownloading(true);
        setError("");

        try {
            const blob = await downloadDataset(datasetId);
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = "fairlens_fairness_adjusted_dataset.csv";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Dataset download failed");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:disabled:border-slate-800 dark:disabled:bg-slate-900/60 dark:disabled:text-slate-500 sm:w-auto"
            >
                {isDownloading ? "Preparing CSV..." : "Download Fairness-Adjusted CSV"}
            </button>
            {error && (
                <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{error}</p>
            )}
        </div>
    );
}

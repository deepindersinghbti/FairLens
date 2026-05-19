"use client";

import { AnalysisResult, ApplyMitigationResponse } from "@/lib/api";
import { mitigationNarrative } from "@/lib/fairness-ui/narratives";
import { formatRate } from "@/lib/fairness-ui/formatters";

interface PrintableFairnessReportProps {
    original: AnalysisResult;
    preview: ApplyMitigationResponse | null;
}

export function PrintableFairnessReport({ original, preview }: PrintableFairnessReportProps) {
    const after = preview?.comparison.after;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 print:border-slate-300 print:bg-white print:text-slate-950 print:shadow-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
                <div>
                    <h4 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Printable fairness report</h4>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        Create a lightweight browser PDF snapshot of the current exploration.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                >
                    Print / Save as PDF
                </button>
            </div>

            <div className="mt-5 space-y-4 print:mt-0">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 print:text-slate-600">FairLens snapshot</p>
                    <h4 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-100 print:text-slate-950">
                        Fairness Exploration Report
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 print:text-slate-700">
                        {mitigationNarrative(preview)}
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 print:border-slate-300">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Original score</p>
                        <p className="mt-2 text-2xl font-semibold">{original.fairness_score}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 print:border-slate-300">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Adjusted score</p>
                        <p className="mt-2 text-2xl font-semibold">{after ? after.fairness_score : "Pending"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 print:border-slate-300">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Original bias gap</p>
                        <p className="mt-2 text-2xl font-semibold">{formatRate(original.demographic_parity_difference)}</p>
                    </div>
                </div>

                {preview && (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 print:border-slate-300">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Rows adjusted</p>
                            <p className="mt-2 text-2xl font-semibold">{preview.metadata.rowsAdjusted}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 print:border-slate-300">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Strength</p>
                            <p className="mt-2 text-sm font-semibold">{preview.metadata.strength.label}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 print:border-slate-300">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Adjusted bias gap</p>
                            <p className="mt-2 text-2xl font-semibold">{formatRate(preview.comparison.after.demographic_parity_difference)}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

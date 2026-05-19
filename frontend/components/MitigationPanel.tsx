"use client";

import { useEffect, useRef } from "react";
import { ApplyMitigationResponse } from "@/lib/api";
import { DownloadMitigatedCsvButton } from "@/components/DownloadMitigatedCsvButton";
import { MitigationComparison } from "@/components/MitigationComparison";

interface MitigationPanelProps {
    mitigationResult: ApplyMitigationResponse | null;
    error: string;
    isApplying: boolean;
    isDisabled?: boolean;
    onApply: () => Promise<void>;
}

export function MitigationPanel({ mitigationResult, error, isApplying, isDisabled = false, onApply }: MitigationPanelProps) {
    const comparisonRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (mitigationResult) {
            comparisonRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [mitigationResult]);

    return (
        <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/50 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Outcome rebalancing
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                        Fairness adjustment
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                        Run a deterministic adjustment on a copied dataset to compare original results against fairness-adjusted outcomes.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onApply}
                    disabled={isApplying || isDisabled}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 sm:w-auto"
                >
                    {isApplying ? "Applying mitigation..." : "Apply Fairness Mitigation"}
                </button>
            </div>

            {error && (
                <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-200">
                    {error}
                </div>
            )}

            {mitigationResult && (
                <div ref={comparisonRef} className="mt-6 space-y-5 scroll-mt-6">
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200">
                        This mitigation simulates fairness adjustments by rebalancing outcomes across demographic groups for analytical comparison purposes.
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Before vs After Comparison</p>
                            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                                Original Results vs Fairness-Adjusted Results
                            </h3>
                        </div>
                        <DownloadMitigatedCsvButton datasetId={mitigationResult.adjusted_dataset_id} />
                    </div>

                    <MitigationComparison
                        before={mitigationResult.comparison.before}
                        after={mitigationResult.comparison.after}
                        metadata={mitigationResult.metadata}
                    />
                </div>
            )}
        </div>
    );
}

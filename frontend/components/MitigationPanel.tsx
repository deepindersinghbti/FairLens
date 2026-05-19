"use client";

import { useEffect, useRef } from "react";
import { AnalysisResult, ApplyMitigationResponse, MitigationStrength } from "@/lib/api";
import { DownloadMitigatedCsvButton } from "@/components/DownloadMitigatedCsvButton";
import { MitigationComparison } from "@/components/MitigationComparison";

interface MitigationPanelProps {
    analysisResult: AnalysisResult;
    mitigationResult: ApplyMitigationResponse | null;
    error: string;
    isApplying: boolean;
    isDisabled?: boolean;
    strength: MitigationStrength;
    onStrengthChange: (strength: MitigationStrength) => void;
    onApply: () => Promise<void>;
}

const strengthOptions: Array<{ id: MitigationStrength; label: string; description: string }> = [
    { id: "conservative", label: "Conservative", description: "Minimal adjustments" },
    { id: "balanced", label: "Balanced", description: "Moderate fairness improvement" },
    { id: "aggressive", label: "Aggressive", description: "Maximum fairness improvement" },
];

export function MitigationPanel({
    analysisResult,
    mitigationResult,
    error,
    isApplying,
    isDisabled = false,
    strength,
    onStrengthChange,
    onApply,
}: MitigationPanelProps) {
    const comparisonRef = useRef<HTMLDivElement | null>(null);
    const noSignificantMitigationNeeded =
        analysisResult.fairness_score >= 90 && analysisResult.demographic_parity_difference <= 0.1;

    useEffect(() => {
        if (mitigationResult) {
            comparisonRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [mitigationResult]);

    return (
        <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/50 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
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
                <div className="w-full space-y-3 lg:max-w-md">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {strengthOptions.map((option) => {
                            const isSelected = strength === option.id;

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => onStrengthChange(option.id)}
                                    disabled={isApplying || isDisabled}
                                    className={`rounded-xl border px-3 py-2 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${isSelected
                                        ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                                        }`}
                                >
                                    <span className="block text-sm font-semibold">{option.label}</span>
                                    <span className={`mt-1 block text-xs leading-5 ${isSelected ? "text-white/80 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"}`}>
                                        {option.description}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        onClick={onApply}
                        disabled={isApplying || isDisabled || noSignificantMitigationNeeded}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                    >
                        {isApplying ? "Applying mitigation..." : "Apply Fairness Mitigation"}
                    </button>
                </div>
            </div>

            <details className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-100">
                    How mitigation works
                </summary>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    FairLens simulates fairness-adjusted outcomes by rebalancing approval rates across demographic groups for analytical comparison purposes.
                </p>
            </details>

            {noSignificantMitigationNeeded && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <p className="font-semibold">No significant mitigation needed</p>
                    <p className="mt-1">The current analysis already shows a high fairness score and a low bias gap.</p>
                </div>
            )}

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

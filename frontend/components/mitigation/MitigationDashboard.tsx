"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    AnalysisResult,
    ApplyMitigationResponse,
    MitigationSimulationPoint,
    MitigationSimulationResponse,
    MitigationStrength,
    applyMitigation,
    downloadDataset,
    previewMitigation,
    simulateMitigation,
} from "@/lib/api";
import { DatasetDiagnostics } from "@/components/analysis/DatasetDiagnostics";
import { MetricHelp } from "@/components/analysis/MetricHelp";
import { MitigationTimelineChart } from "@/components/charts/MitigationTimelineChart";
import { SelectionRateComparisonChart } from "@/components/charts/SelectionRateComparisonChart";
import { metricDefinitions } from "@/lib/fairness-ui/definitions";
import { groupRateRows, interventionLevel, previewCacheKey, timelineCacheKey } from "@/lib/fairness-ui/dashboard";
import { formatRate, formatSignedNumberDelta, formatSignedPercentDelta } from "@/lib/fairness-ui/formatters";
import { analysisNarrative, mitigationNarrative } from "@/lib/fairness-ui/narratives";

interface MitigationDashboardProps {
    datasetId: string;
    analysisResult: AnalysisResult;
    targetColumn: string;
    sensitiveAttribute: string;
    predictionColumn: string;
    isDisabled?: boolean;
}

const strengthOptions: Array<{ id: MitigationStrength; label: string; description: string; targetShare: number }> = [
    { id: "conservative", label: "Conservative", description: "Minimal adjustments", targetShare: 0.35 },
    { id: "balanced", label: "Balanced", description: "Moderate fairness improvement", targetShare: 0.65 },
    { id: "aggressive", label: "Aggressive", description: "Maximum fairness improvement", targetShare: 1 },
];

const tabs = ["Overview", "Selection Rates", "Timeline", "Metadata", "Report"] as const;
type DashboardTab = typeof tabs[number];

export function MitigationDashboard({
    datasetId,
    analysisResult,
    targetColumn,
    sensitiveAttribute,
    predictionColumn,
    isDisabled = false,
}: MitigationDashboardProps) {
    const [strength, setStrength] = useState<MitigationStrength>("balanced");
    const [targetShare, setTargetShare] = useState(0.65);
    const [activeTab, setActiveTab] = useState<DashboardTab>("Overview");
    const [preview, setPreview] = useState<ApplyMitigationResponse | null>(null);
    const [timeline, setTimeline] = useState<MitigationSimulationResponse | null>(null);
    const [error, setError] = useState("");
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [isTimelineLoading, setIsTimelineLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const previewCache = useRef(new Map<string, ApplyMitigationResponse>());
    const timelineCache = useRef(new Map<string, MitigationSimulationResponse>());
    const requestIdRef = useRef(0);

    const noSignificantMitigationNeeded =
        analysisResult.fairness_score >= 90 && analysisResult.demographic_parity_difference <= 0.1;
    const roundedTargetShare = Math.round(targetShare * 100) / 100;
    const selectedStep = Math.round(roundedTargetShare * 100);

    const rows = useMemo(
        () => preview ? groupRateRows(preview.comparison.before, preview.comparison.after) : [],
        [preview]
    );
    const scoreDelta = preview ? preview.comparison.after.fairness_score - preview.comparison.before.fairness_score : 0;
    const biasGapDelta = preview ? preview.comparison.after.demographic_parity_difference - preview.comparison.before.demographic_parity_difference : 0;

    useEffect(() => {
        previewCache.current.clear();
        timelineCache.current.clear();
        setPreview(null);
        setTimeline(null);
        setError("");
        setActiveTab("Overview");
    }, [datasetId, targetColumn, sensitiveAttribute, predictionColumn, analysisResult]);

    useEffect(() => {
        if (noSignificantMitigationNeeded) {
            setPreview(null);
            return;
        }

        const cacheKey = previewCacheKey(datasetId, targetColumn, sensitiveAttribute, predictionColumn, strength, roundedTargetShare);
        const cached = previewCache.current.get(cacheKey);
        if (cached) {
            setPreview(cached);
            setError("");
            return;
        }

        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        setIsPreviewLoading(true);
        const timer = window.setTimeout(async () => {
            try {
                const response = await previewMitigation(
                    datasetId,
                    targetColumn,
                    sensitiveAttribute,
                    predictionColumn,
                    strength,
                    roundedTargetShare
                );
                previewCache.current.set(cacheKey, response);
                if (requestIdRef.current === requestId) {
                    setPreview(response);
                    setError("");
                }
            } catch (err) {
                if (requestIdRef.current === requestId) {
                    setError(err instanceof Error ? err.message : "Mitigation preview failed");
                }
            } finally {
                if (requestIdRef.current === requestId) {
                    setIsPreviewLoading(false);
                }
            }
        }, 275);

        return () => {
            window.clearTimeout(timer);
        };
    }, [datasetId, targetColumn, sensitiveAttribute, predictionColumn, strength, roundedTargetShare, noSignificantMitigationNeeded]);

    useEffect(() => {
        if (noSignificantMitigationNeeded) {
            setTimeline(null);
            return;
        }

        const cacheKey = timelineCacheKey(datasetId, targetColumn, sensitiveAttribute, predictionColumn, strength);
        const cached = timelineCache.current.get(cacheKey);
        if (cached) {
            setTimeline(cached);
            return;
        }

        setIsTimelineLoading(true);
        simulateMitigation(datasetId, targetColumn, sensitiveAttribute, predictionColumn, strength)
            .then((response) => {
                timelineCache.current.set(cacheKey, response);
                setTimeline(response);
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : "Mitigation simulation failed");
            })
            .finally(() => {
                setIsTimelineLoading(false);
            });
    }, [datasetId, targetColumn, sensitiveAttribute, predictionColumn, strength, noSignificantMitigationNeeded]);

    const handleStrengthChange = (nextStrength: MitigationStrength) => {
        const option = strengthOptions.find((item) => item.id === nextStrength);
        setStrength(nextStrength);
        setTargetShare(option?.targetShare ?? 0.65);
    };

    const resetRecommended = () => {
        setStrength("balanced");
        setTargetShare(0.65);
        setActiveTab("Overview");
    };

    const handleTimelinePoint = (point: MitigationSimulationPoint) => {
        setTargetShare(point.targetShare);
        setActiveTab("Overview");
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        setError("");

        try {
            const response = await applyMitigation(
                datasetId,
                targetColumn,
                sensitiveAttribute,
                predictionColumn,
                strength,
                roundedTargetShare
            );
            setPreview(response);
            if (!response.adjusted_dataset_id) {
                throw new Error("Fairness-adjusted dataset was not created");
            }

            const blob = await downloadDataset(response.adjusted_dataset_id);
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
        <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/50 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Interactive fairness playground
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                        Explore mitigation tradeoffs
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {analysisNarrative(analysisResult)}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={resetRecommended}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                >
                    Reset to Recommended
                </button>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="grid gap-2 sm:grid-cols-3">
                        {strengthOptions.map((option) => {
                            const isSelected = strength === option.id;

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleStrengthChange(option.id)}
                                    disabled={isDisabled}
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

                    <div className="mt-5">
                        <div className="flex items-center justify-between gap-3">
                            <label htmlFor="fairness-target" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                <MetricHelp label="Fairness Target" description={metricDefinitions.targetIntensity} />
                            </label>
                            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-400">
                                {selectedStep}%
                            </span>
                        </div>
                        <input
                            id="fairness-target"
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={selectedStep}
                            disabled={isDisabled || noSignificantMitigationNeeded}
                            onChange={(event) => setTargetShare(Number(event.target.value) / 100)}
                            className="mt-3 w-full accent-slate-900 dark:accent-slate-100"
                        />
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Tradeoff snapshot</p>
                    <div className="mt-3 grid gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Fairness Improvement</span>
                            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                {preview ? formatSignedNumberDelta(scoreDelta) : "Pending"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Rows Modified</span>
                            <span className="text-sm font-semibold text-slate-950 dark:text-slate-100">{preview?.metadata.rowsAdjusted ?? "Pending"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 dark:text-slate-400">Intervention Level</span>
                            <span className="text-sm font-semibold text-slate-950 dark:text-slate-100">{interventionLevel(preview)}</span>
                        </div>
                    </div>
                </div>
            </div>

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

            <div className="mt-6 flex flex-wrap gap-2">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${activeTab === tab
                            ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="mt-5 space-y-5">
                {isPreviewLoading && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                        Updating fairness preview...
                    </div>
                )}

                {activeTab === "Overview" && (
                    <div className="space-y-5">
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200">
                            {mitigationNarrative(preview)}
                        </div>
                        <DatasetDiagnostics result={analysisResult} />
                        {preview && (
                            <div className="grid gap-4 lg:grid-cols-3">
                                <MetricCard label="Fairness Score" before={`${preview.comparison.before.fairness_score}`} after={`${preview.comparison.after.fairness_score}`} delta={formatSignedNumberDelta(scoreDelta)} positive={scoreDelta >= 0} />
                                <MetricCard label="Bias Gap" before={formatRate(preview.comparison.before.demographic_parity_difference)} after={formatRate(preview.comparison.after.demographic_parity_difference)} delta={formatSignedPercentDelta(biasGapDelta)} positive={biasGapDelta <= 0} />
                                <MetricCard label="Rows Adjusted" before={`${preview.metadata.rowsEligible} eligible`} after={`${preview.metadata.rowsAdjusted} adjusted`} delta={interventionLevel(preview)} positive />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "Selection Rates" && (
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <h4 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Selection rate by group</h4>
                            {preview ? <SelectionRateComparisonChart rows={rows} /> : <EmptyState />}
                        </div>
                        <SelectionRateTable rows={rows} />
                    </div>
                )}

                {activeTab === "Timeline" && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h4 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Fairness timeline</h4>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Click a point to preview that target intensity.</p>
                        {isTimelineLoading && <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">Loading simulation...</p>}
                        {timeline ? (
                            <div className="mt-4">
                                <MitigationTimelineChart points={timeline.points} selectedStep={selectedStep} onSelectPoint={handleTimelinePoint} />
                            </div>
                        ) : !isTimelineLoading ? <EmptyState /> : null}
                    </div>
                )}

                {activeTab === "Metadata" && (
                    <div className="space-y-4">
                        {preview ? (
                            <>
                                <MetadataGrid preview={preview} />
                                <details className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                                    <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-100">How mitigation works</summary>
                                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                        FairLens simulates fairness-adjusted outcomes by rebalancing approval rates across demographic groups for analytical comparison purposes.
                                    </p>
                                </details>
                            </>
                        ) : <EmptyState />}
                    </div>
                )}

                {activeTab === "Report" && (
                    <div className="space-y-4">
                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={isDownloading || isDisabled || noSignificantMitigationNeeded}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 sm:w-auto"
                        >
                            {isDownloading ? "Preparing CSV..." : "Download Fairness-Adjusted CSV"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricCard({ label, before, after, delta, positive }: { label: string; before: string; after: string; delta: string; positive: boolean }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="text-slate-500 dark:text-slate-400">Original</p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-slate-100">{before}</p>
                </div>
                <div>
                    <p className="text-slate-500 dark:text-slate-400">Adjusted</p>
                    <p className="mt-1 font-semibold text-slate-950 dark:text-slate-100">{after}</p>
                </div>
            </div>
            <p className={`mt-4 text-sm font-semibold ${positive ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                {delta}
            </p>
        </div>
    );
}

function SelectionRateTable({ rows }: { rows: ReturnType<typeof groupRateRows> }) {
    if (!rows.length) {
        return <EmptyState />;
    }

    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[520px] text-sm">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Group</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Original</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Adjusted</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">Change</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                    {rows.map((row) => (
                        <tr key={row.group} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{row.group}</td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatRate(row.beforeRate)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-950 dark:text-slate-100">{formatRate(row.afterRate)}</td>
                            <td className={`px-4 py-3 font-semibold ${row.delta > 0 ? "text-emerald-700 dark:text-emerald-300" : row.delta < 0 ? "text-amber-700 dark:text-amber-300" : "text-slate-700 dark:text-slate-300"}`}>
                                {formatSignedPercentDelta(row.delta)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function MetadataGrid({ preview }: { preview: ApplyMitigationResponse }) {
    const items = [
        ["Rows Eligible", preview.metadata.rowsEligible],
        ["Rows Adjusted", preview.metadata.rowsAdjusted],
        ["Method", preview.metadata.method.label],
        ["Strength", preview.metadata.strength.label],
        ["Target Share", formatRate(preview.metadata.strength.targetShare)],
        ["Adjustment Cap", formatRate(preview.metadata.strength.adjustmentCap)],
        ["Cap Applied", preview.metadata.adjustmentCapApplied ? "Yes" : "No"],
        ["Ceiling Applied", preview.metadata.targetRateCeilingApplied ? "Yes" : "No"],
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {items.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">{value}</p>
                </div>
            ))}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Preview data is not available yet.
        </div>
    );
}

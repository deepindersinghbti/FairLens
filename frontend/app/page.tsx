"use client";

import { useState, useRef, useEffect } from "react";
import { AnalysisControls } from "@/components/AnalysisControls";
import { AnalysisResults } from "@/components/AnalysisResults";
import { CSVUpload } from "@/components/CSVUpload";
import { DatasetPreview } from "@/components/DatasetPreview";
import { LoadingMessage } from "@/components/LoadingMessage";
import { MitigationDashboard } from "@/components/mitigation/MitigationDashboard";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  analyzeBias,
  uploadDataset,
  AnalysisResult,
  downloadFairnessReport,
  loadDemoDataset,
  LoadDemoResponse,
} from "@/lib/api";

export default function Home() {
  const [datasetId, setDatasetId] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [targetColumn, setTargetColumn] = useState<string>("");
  const [sensitiveAttribute, setSensitiveAttribute] = useState<string>("");
  const [predictionColumn, setPredictionColumn] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [showSlowRequest, setShowSlowRequest] = useState(false);

  // Ref to store timer ID for cleanup
  const slowRequestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived boolean: true if any loading operation is in progress
  const isAnyLoading = isLoadingDemo || isUploading || isAnalyzing;

  // Unified loading state: show "waking up server" message after 2.5 seconds
  useEffect(() => {
    // If loading started, set a timer to show slow request message
    if (isAnyLoading) {
      slowRequestTimerRef.current = setTimeout(() => {
        setShowSlowRequest(true);
      }, 2500); // 2.5 seconds
    } else {
      // If loading stopped, clear timer and hide message
      if (slowRequestTimerRef.current !== null) {
        clearTimeout(slowRequestTimerRef.current);
        slowRequestTimerRef.current = null;
      }
      setShowSlowRequest(false);
    }

    // Cleanup: always clear timer on unmount
    return () => {
      if (slowRequestTimerRef.current !== null) {
        clearTimeout(slowRequestTimerRef.current);
        slowRequestTimerRef.current = null;
      }
    };
  }, [isAnyLoading]);

  const applyLoadedDataset = (
    response: Pick<LoadDemoResponse, "dataset_id" | "columns" | "preview">,
    defaults?: Pick<LoadDemoResponse, "suggested_target" | "suggested_sensitive" | "suggested_prediction">
  ) => {
    setDatasetId(response.dataset_id);
    setColumns(response.columns);
    setPreview(response.preview);
    setTargetColumn(defaults?.suggested_target || "");
    setSensitiveAttribute(defaults?.suggested_sensitive || "");
    setPredictionColumn(defaults?.suggested_prediction || "");
    setResult(null);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError("");
    setResult(null);
    try {
      const response = await uploadDataset(file);
      applyLoadedDataset(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadDemo = async (type: "loan" | "prediction") => {
    setIsLoadingDemo(true);
    setError("");
    setResult(null);
    try {
      const response = await loadDemoDataset(type);
      applyLoadedDataset(response, {
        suggested_target: response.suggested_target,
        suggested_sensitive: response.suggested_sensitive,
        suggested_prediction: response.suggested_prediction,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demo dataset");
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleAnalyze = async () => {
    if (!datasetId || !targetColumn || !sensitiveAttribute) {
      setError("Please select both target column and sensitive attribute");
      return;
    }

    const normalizedPrediction = predictionColumn.trim();
    const predictionForRequest = ["", "none", "null"].includes(normalizedPrediction.toLowerCase())
      ? undefined
      : normalizedPrediction;

    setIsAnalyzing(true);
    setError("");
    try {
      const analysisResult = await analyzeBias(
        datasetId,
        targetColumn,
        sensitiveAttribute,
        predictionForRequest
      );
      setResult(analysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!datasetId || !result) {
      return;
    }

    setIsDownloadingReport(true);
    setError("");
    try {
      const blob = await downloadFairnessReport(datasetId, result.analysis_type);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "fairlens_audit_report.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report download failed");
    } finally {
      setIsDownloadingReport(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 transition-colors duration-200 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 lg:gap-10">
        <div className="flex items-center justify-end">
          <ThemeToggle />
        </div>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
              AI Fairness Auditor
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-5xl lg:text-6xl">
                FairLens
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400 sm:text-xl">
                Audit datasets and model predictions for bias with a workflow designed for clear, defensible fairness review.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Dataset Bias Detection", "Review selection differences in raw data."],
                ["Model Prediction Analysis", "Inspect fairness in automated decisions."],
                ["Clear Fairness Insights", "Get concise risk and recommendation summaries."],
              ].map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <div role="alert" aria-live="polite" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 shadow-sm dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-200">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        <LoadingMessage
          show={showSlowRequest}
          message="Waking up the analysis server. This may take a few seconds on the first request."
        />

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)] sm:p-8">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Primary workflow</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                  Upload a dataset to begin
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Start with a CSV file or load a demo dataset to see how FairLens structures fairness auditing end to end.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                Step 1 of 3
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <CSVUpload onUpload={handleUpload} isLoading={isUploading} />
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Use a guided demo</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Load a representative example to review the product flow before uploading your own data.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => handleLoadDemo("loan")}
                      disabled={isLoadingDemo || isUploading}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:disabled:border-slate-800 dark:disabled:bg-slate-900/60 dark:disabled:text-slate-500 sm:w-auto"
                    >
                      {isLoadingDemo ? "Loading demo..." : "Try Loan Bias Demo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadDemo("prediction")}
                      disabled={isLoadingDemo || isUploading}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 sm:w-auto"
                    >
                      {isLoadingDemo ? "Loading demo..." : "Try Model Bias Demo"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Workflow cues</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-100">What judges see first</h3>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-400">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <p className="font-semibold text-slate-900 dark:text-slate-100">1. Upload or load data</p>
                <p className="mt-1">A polished upload surface makes the primary action obvious.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <p className="font-semibold text-slate-900 dark:text-slate-100">2. Configure the audit</p>
                <p className="mt-1">Select target and sensitive columns with clear validation feedback.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <p className="font-semibold text-slate-900 dark:text-slate-100">3. Review fairness signals</p>
                <p className="mt-1">Results are grouped into risk, metrics, charts, and recommendations.</p>
              </div>
            </div>
          </aside>
        </section>

        {datasetId && columns.length > 0 && (
          <section className="grid gap-6 lg:grid-cols-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)] lg:col-span-3 sm:p-8">
              <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Step 2</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">Dataset preview</h2>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  {preview.length} rows loaded
                </div>
              </div>
              <div className="mt-6">
                <DatasetPreview columns={columns} preview={preview} rowCount={preview.length} />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)] lg:col-span-2 sm:p-8">
              <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Step 3</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">Configure analysis</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Choose the outcome column and protected attribute. The prediction column is optional for model audits.
                </p>
              </div>
              <div className="mt-6">
                <AnalysisControls
                  columns={columns}
                  targetColumn={targetColumn}
                  sensitiveAttribute={sensitiveAttribute}
                  predictionColumn={predictionColumn}
                  onTargetChange={setTargetColumn}
                  onSensitiveChange={setSensitiveAttribute}
                  onPredictionChange={setPredictionColumn}
                  onAnalyze={handleAnalyze}
                  isLoading={isAnalyzing}
                />
              </div>
            </div>

            {result && (
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_16px_40px_rgba(0,0,0,0.22)] lg:col-span-5 sm:p-8">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Step 4</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                      Fairness analysis results
                    </h2>
                  </div>
                  <button
                    onClick={handleDownloadReport}
                    disabled={isDownloadingReport}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                  >
                    {isDownloadingReport ? "Generating report..." : "Download fairness audit report"}
                  </button>
                </div>

                <div className="mt-6">
                  <AnalysisResults
                    result={result}
                    targetColumn={targetColumn}
                    sensitiveAttribute={sensitiveAttribute}
                  />
                </div>

                <MitigationDashboard
                  datasetId={datasetId}
                  analysisResult={result}
                  targetColumn={targetColumn}
                  sensitiveAttribute={sensitiveAttribute}
                  predictionColumn={predictionColumn}
                  isDisabled={isAnyLoading}
                />
              </div>
            )}
          </section>
        )}

        <footer className="border-t border-slate-200 pt-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>Phase 3 MVP • Dataset and Model Prediction Bias Analysis</p>
        </footer>
      </div>
    </main>
  );
}

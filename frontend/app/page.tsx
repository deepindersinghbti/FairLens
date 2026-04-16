"use client";

import { useState } from "react";
import { AnalysisControls } from "@/components/AnalysisControls";
import { AnalysisResults } from "@/components/AnalysisResults";
import { CSVUpload } from "@/components/CSVUpload";
import { DatasetPreview } from "@/components/DatasetPreview";
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

    setIsAnalyzing(true);
    setError("");
    try {
      const analysisResult = await analyzeBias(
        datasetId,
        targetColumn,
        sensitiveAttribute,
        predictionColumn || undefined
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
    <main className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">FairLens</h1>
          <p className="text-lg font-medium text-gray-700">AI Fairness Auditor for Automated Decisions</p>
          <p className="text-gray-600 mt-2">
            Detect bias in datasets and machine learning models before they impact real people.
          </p>
        </div>

        {error && (
          <div className="w-full bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-red-700 font-semibold">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-5">
              Step 1: Upload Dataset
            </h2>
            <div className="space-y-5">
              <CSVUpload onUpload={handleUpload} isLoading={isUploading} />
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => handleLoadDemo("loan")}
                  disabled={isLoadingDemo || isUploading}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {isLoadingDemo ? "Loading Demo..." : "Try Loan Bias Demo"}
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadDemo("prediction")}
                  disabled={isLoadingDemo || isUploading}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-700 text-white font-semibold rounded-md hover:bg-slate-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {isLoadingDemo ? "Loading Demo..." : "Try Model Bias Demo"}
                </button>
              </div>
            </div>
          </div>

          {datasetId && columns.length > 0 && (
            <>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-5">
                  Step 2: Preview
                </h2>
                <DatasetPreview columns={columns} preview={preview} />
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-5">
                  Step 3: Configure Analysis
                </h2>
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

              {result && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Fairness Analysis Results
                  </h2>
                  <AnalysisResults result={result} />

                  <div className="mt-6">
                    <button
                      onClick={handleDownloadReport}
                      disabled={isDownloadingReport}
                      className="px-4 py-2 bg-gray-900 text-white font-semibold rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                    >
                      {isDownloadingReport ? "Generating Report..." : "Download Fairness Audit Report"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>Phase 3 MVP • Dataset and Model Prediction Bias Analysis</p>
        </div>
      </div>
    </main>
  );
}

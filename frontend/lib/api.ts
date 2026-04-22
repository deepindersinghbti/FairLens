const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export interface UploadResponse {
    dataset_id: string;
    columns: string[];
    preview: Record<string, unknown>[];
}

export interface LoadDemoResponse {
    dataset_id: string;
    columns: string[];
    preview: Record<string, unknown>[];
    suggested_target: string;
    suggested_sensitive: string;
    suggested_prediction?: string | null;
}

export interface GroupSelectionCount {
    selected: number;
    total: number;
}

export interface AIFairnessInsights {
    summary: string;
    risk_level: "Low" | "Medium" | "High";
    issues: string[];
    recommendations: string[];
}

export interface AnalysisResult {
    analysis_type: "dataset" | "model_prediction";
    selection_rates: Record<string, number>;
    selection_counts: Record<string, GroupSelectionCount>;
    false_positive_rates?: Record<string, number> | null;
    equal_opportunity_difference?: number | null;
    confidence_score?: number | null;
    warnings?: string[] | null;
    data_quality_label?: "High" | "Medium" | "Low" | null;
    verdict_message?: string | null;
    confidence_explanation?: string[] | null;
    score_reliability_warning?: string | null;
    recommendations?: string[] | null;
    demographic_parity_difference: number;
    disparate_impact: number;
    fairness_score: number;
    fairness_risk_level: "Low Risk" | "Moderate Risk" | "High Risk";
    most_affected_group: string;
    impact_gap_percentage: number;
    bias_detected: boolean;
    insights: string[];
    ai_fairness_insights?: AIFairnessInsights | null;
}

export async function uploadDataset(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/upload-dataset`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Upload failed");
    }

    return response.json();
}

export async function analyzeBias(
    datasetId: string,
    targetColumn: string,
    sensitiveAttribute: string,
    predictionColumn?: string
): Promise<AnalysisResult> {
    const normalizedPrediction = (predictionColumn ?? "").trim();
    const predictionForPayload = ["", "none", "null"].includes(normalizedPrediction.toLowerCase())
        ? undefined
        : normalizedPrediction;

    const payload: {
        dataset_id: string;
        target_column: string;
        sensitive_attribute: string;
        prediction_column?: string;
    } = {
        dataset_id: datasetId,
        target_column: targetColumn,
        sensitive_attribute: sensitiveAttribute,
    };

    if (predictionForPayload) {
        payload.prediction_column = predictionForPayload;
    }

    const response = await fetch(`${API_BASE}/analyze-bias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Analysis failed");
    }

    return response.json();
}

export async function downloadFairnessReport(
    datasetId: string,
    analysisType: "dataset" | "model_prediction"
): Promise<Blob> {
    const url = `${API_BASE}/generate-report?dataset_id=${encodeURIComponent(datasetId)}&analysis_type=${encodeURIComponent(analysisType)}`;
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Report generation failed");
    }

    return response.blob();
}

export async function loadDemoDataset(type: "loan" | "prediction"): Promise<LoadDemoResponse> {
    const response = await fetch(`${API_BASE}/load-demo?type=${encodeURIComponent(type)}`, {
        method: "GET",
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to load demo dataset");
    }

    return response.json();
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
    ai_insights_source?: "gemini" | "fallback" | string | null;
    ai_insights_warning?: string | null;
}

export interface MitigationMethod {
    id: "deterministic_rebalancing" | string;
    label: string;
}

export interface MitigationMetadata {
    rowsEligible: number;
    rowsAdjusted: number;
    adjustmentCapApplied: boolean;
    targetRateCeilingApplied: boolean;
    fairnessImprovementEstimate: number;
    method: MitigationMethod;
    strength: {
        id: MitigationStrength;
        label: string;
        description: string;
        adjustmentCap: number;
        targetShare: number;
    };
}

export interface MitigationComparison {
    before: AnalysisResult;
    after: AnalysisResult;
}

export interface ApplyMitigationResponse {
    original_dataset_id: string;
    adjusted_dataset_id?: string | null;
    columns: string[];
    preview: Record<string, unknown>[];
    metadata: MitigationMetadata;
    comparison: MitigationComparison;
}

export type MitigationStrength = "conservative" | "balanced" | "aggressive";

export interface MitigationSimulationPoint {
    step: number;
    targetShare: number;
    fairness_score: number;
    bias_gap: number;
    disparate_impact: number;
    selection_rates: Record<string, number>;
    metadata?: MitigationMetadata | null;
}

export interface MitigationSimulationResponse {
    points: MitigationSimulationPoint[];
}

export interface SimplifyInsightRequest {
    metrics: Record<string, unknown>;
    normal_insight: string;
    target_column: string;
    sensitive_attribute: string;
    mode: "dataset" | "model";
}

export interface SimplifyInsightResponse {
    simple_explanation: string;
}

export async function uploadDataset(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/api/upload-dataset`, {
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

    const response = await fetch(`${API_BASE_URL}/api/analyze-bias`, {
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
    const url = `${API_BASE_URL}/api/generate-report?dataset_id=${encodeURIComponent(datasetId)}&analysis_type=${encodeURIComponent(analysisType)}`;
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Report generation failed");
    }

    return response.blob();
}

export async function simplifyInsight(payload: SimplifyInsightRequest): Promise<SimplifyInsightResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/insights/simplify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to simplify explanation");
    }

    return response.json();
}

export async function applyMitigation(
    datasetId: string,
    targetColumn: string,
    sensitiveAttribute: string,
    predictionColumn?: string,
    strength: MitigationStrength = "balanced",
    targetShare?: number
): Promise<ApplyMitigationResponse> {
    return requestMitigation("apply-mitigation", datasetId, targetColumn, sensitiveAttribute, predictionColumn, strength, targetShare);
}

export async function previewMitigation(
    datasetId: string,
    targetColumn: string,
    sensitiveAttribute: string,
    predictionColumn?: string,
    strength: MitigationStrength = "balanced",
    targetShare?: number
): Promise<ApplyMitigationResponse> {
    return requestMitigation("preview-mitigation", datasetId, targetColumn, sensitiveAttribute, predictionColumn, strength, targetShare);
}

export async function simulateMitigation(
    datasetId: string,
    targetColumn: string,
    sensitiveAttribute: string,
    predictionColumn?: string,
    strength: MitigationStrength = "balanced"
): Promise<MitigationSimulationResponse> {
    const payload = mitigationPayload(datasetId, targetColumn, sensitiveAttribute, predictionColumn, strength);

    const response = await fetch(`${API_BASE_URL}/api/simulate-mitigation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Mitigation simulation failed");
    }

    return response.json();
}

function mitigationPayload(
    datasetId: string,
    targetColumn: string,
    sensitiveAttribute: string,
    predictionColumn?: string,
    strength: MitigationStrength = "balanced",
    targetShare?: number
) {
    const normalizedPrediction = (predictionColumn ?? "").trim();
    const predictionForPayload = ["", "none", "null"].includes(normalizedPrediction.toLowerCase())
        ? undefined
        : normalizedPrediction;

    const payload: {
        dataset_id: string;
        target_column: string;
        sensitive_attribute: string;
        prediction_column?: string;
        strength: MitigationStrength;
        targetShare?: number;
    } = {
        dataset_id: datasetId,
        target_column: targetColumn,
        sensitive_attribute: sensitiveAttribute,
        strength,
    };

    if (predictionForPayload) {
        payload.prediction_column = predictionForPayload;
    }

    if (typeof targetShare === "number") {
        payload.targetShare = targetShare;
    }

    return payload;
}

async function requestMitigation(
    endpoint: "apply-mitigation" | "preview-mitigation",
    datasetId: string,
    targetColumn: string,
    sensitiveAttribute: string,
    predictionColumn?: string,
    strength: MitigationStrength = "balanced",
    targetShare?: number
): Promise<ApplyMitigationResponse> {
    const payload = mitigationPayload(datasetId, targetColumn, sensitiveAttribute, predictionColumn, strength, targetShare);

    const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Mitigation failed");
    }

    return response.json();
}

export async function downloadDataset(datasetId: string): Promise<Blob> {
    const url = `${API_BASE_URL}/api/download-dataset?dataset_id=${encodeURIComponent(datasetId)}`;
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Dataset download failed");
    }

    return response.blob();
}

export async function loadDemoDataset(type: "loan" | "prediction"): Promise<LoadDemoResponse> {
    const response = await fetch(`${API_BASE_URL}/api/load-demo?type=${encodeURIComponent(type)}`, {
        method: "GET",
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to load demo dataset");
    }

    return response.json();
}

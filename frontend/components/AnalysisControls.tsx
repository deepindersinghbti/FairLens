"use client";

interface AnalysisControlsProps {
    columns: string[];
    targetColumn: string;
    sensitiveAttribute: string;
    predictionColumn: string;
    onTargetChange: (col: string) => void;
    onSensitiveChange: (col: string) => void;
    onPredictionChange: (col: string) => void;
    onAnalyze: () => Promise<void>;
    isLoading: boolean;
}

export function AnalysisControls({
    columns,
    targetColumn,
    sensitiveAttribute,
    predictionColumn,
    onTargetChange,
    onSensitiveChange,
    onPredictionChange,
    onAnalyze,
    isLoading,
}: AnalysisControlsProps) {
    const normalizedPrediction = predictionColumn.trim();
    const mode = normalizedPrediction ? "model" : "dataset";
    const invalidTargetSensitive =
        !!targetColumn && !!sensitiveAttribute && targetColumn === sensitiveAttribute;
    const invalidPredictionTarget =
        mode === "model" && normalizedPrediction === targetColumn;
    const invalidPredictionSensitive =
        mode === "model" && normalizedPrediction === sensitiveAttribute;
    const hasValidationError =
        invalidTargetSensitive || invalidPredictionTarget || invalidPredictionSensitive;
    const isValid = !!targetColumn && !!sensitiveAttribute && !hasValidationError;

    return (
        <div className="w-full space-y-5">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-950">Analysis configuration</h3>
                <p className="text-sm leading-6 text-slate-600">
                    Select the outcome and protected attribute to define the fairness audit.
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Mode: {mode === "model" ? "Model Fairness" : "Dataset Bias"}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        Target Column (Outcome)
                    </label>
                    <select
                        value={targetColumn}
                        onChange={(e) => onTargetChange(e.target.value)}
                        disabled={isLoading}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                    >
                        <option value="">Select target column</option>
                        {columns.map((col) => (
                            <option key={col} value={col}>
                                {col}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        Sensitive Attribute
                    </label>
                    <select
                        value={sensitiveAttribute}
                        onChange={(e) => onSensitiveChange(e.target.value)}
                        disabled={isLoading}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                    >
                        <option value="">Select sensitive attribute</option>
                        {columns.map((col) => (
                            <option key={col} value={col}>
                                {col}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        Prediction Column (Optional)
                    </label>
                    <select
                        value={predictionColumn}
                        onChange={(e) => onPredictionChange(e.target.value)}
                        disabled={isLoading}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                    >
                        <option value="">None (Dataset Bias Analysis)</option>
                        {columns
                            .filter((col) => col !== sensitiveAttribute)
                            .map((col) => (
                                <option key={col} value={col}>
                                    {col}
                                </option>
                            ))}
                    </select>
                </div>
            </div>

            {invalidTargetSensitive && (
                <p className="text-sm font-medium text-amber-700">
                    Choose different columns for the outcome and sensitive attribute.
                </p>
            )}

            {invalidPredictionTarget && (
                <p className="text-sm font-medium text-amber-700">
                    Prediction column and target column must be different.
                </p>
            )}

            {invalidPredictionSensitive && (
                <p className="text-sm font-medium text-amber-700">
                    Prediction column and sensitive attribute must be different.
                </p>
            )}

            <button
                onClick={onAnalyze}
                disabled={!isValid || isLoading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
                {isLoading ? "Analyzing..." : "Run Bias Analysis"}
            </button>
        </div>
    );
}

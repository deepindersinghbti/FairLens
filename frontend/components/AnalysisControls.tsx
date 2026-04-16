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
    const isValid = targetColumn && sensitiveAttribute && targetColumn !== sensitiveAttribute;

    return (
        <div className="w-full space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Column (Outcome)
                    </label>
                    <select
                        value={targetColumn}
                        onChange={(e) => onTargetChange(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sensitive Attribute
                    </label>
                    <select
                        value={sensitiveAttribute}
                        onChange={(e) => onSensitiveChange(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prediction Column (Optional)
                    </label>
                    <select
                        value={predictionColumn}
                        onChange={(e) => onPredictionChange(e.target.value)}
                        disabled={isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <button
                onClick={onAnalyze}
                disabled={!isValid || isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
                {isLoading ? "Analyzing..." : "Run Bias Analysis"}
            </button>
        </div>
    );
}

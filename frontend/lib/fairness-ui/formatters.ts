export function formatPercentValue(value: number, decimals = 1) {
    if (!Number.isFinite(value)) {
        return "N/A";
    }

    return `${value.toFixed(decimals)}%`;
}

export function formatRate(value: number, decimals = 1) {
    return formatPercentValue(value * 100, decimals);
}

export function formatSignedPercentDelta(value: number, decimals = 1) {
    if (!Number.isFinite(value) || value === 0) {
        return "No change";
    }

    const prefix = value > 0 ? "+" : "";
    return `${prefix}${(value * 100).toFixed(decimals)}%`;
}

export function formatSignedNumberDelta(value: number) {
    if (!Number.isFinite(value) || value === 0) {
        return "No change";
    }

    return `${value > 0 ? "+" : ""}${value.toFixed(0)}`;
}

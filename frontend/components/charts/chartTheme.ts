import { ResolvedTheme } from "@/components/ThemeProvider";

export const chartTheme = {
    light: {
        axis: "#475569",
        axisLine: "#cbd5e1",
        grid: "#e2e8f0",
        label: "#334155",
        tooltipBg: "#ffffff",
        tooltipBorder: "#cbd5e1",
        tooltipMuted: "#475569",
        tooltipText: "#0f172a",
        cursor: "rgba(15, 23, 42, 0.06)",
    },
    dark: {
        axis: "#94a3b8",
        axisLine: "#334155",
        grid: "#1e293b",
        label: "#e2e8f0",
        tooltipBg: "#0f172a",
        tooltipBorder: "#334155",
        tooltipMuted: "#cbd5e1",
        tooltipText: "#f8fafc",
        cursor: "rgba(148, 163, 184, 0.08)",
    },
} satisfies Record<ResolvedTheme, Record<string, string>>;

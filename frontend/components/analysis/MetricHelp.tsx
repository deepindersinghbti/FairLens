"use client";

interface MetricHelpProps {
    label: string;
    description: string;
}

export function MetricHelp({ label, description }: MetricHelpProps) {
    return (
        <span className="group relative inline-flex items-center gap-1">
            <span>{label}</span>
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                ?
            </span>
            <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium leading-5 text-slate-600 shadow-lg group-hover:block dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                {description}
            </span>
        </span>
    );
}

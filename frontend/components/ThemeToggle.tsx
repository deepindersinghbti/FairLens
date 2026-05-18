"use client";

import { Theme, useTheme } from "@/components/ThemeProvider";

const themeOptions: Array<{
    value: Theme;
    label: string;
    icon: "sun" | "moon" | "monitor";
}> = [
    { value: "light", label: "Use light theme", icon: "sun" },
    { value: "dark", label: "Use dark theme", icon: "moon" },
    { value: "system", label: "Use system theme", icon: "monitor" },
];

function ThemeIcon({ icon }: { icon: "sun" | "moon" | "monitor" }) {
    if (icon === "sun") {
        return (
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m8.25-9h-2.25M6 12H3.75m14.49-6.24-1.59 1.59M7.35 16.65l-1.59 1.59m12.48 0-1.59-1.59M7.35 7.35 5.76 5.76" />
                <circle cx="12" cy="12" r="3.75" />
            </svg>
        );
    }

    if (icon === "moon") {
        return (
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 14.5A7.5 7.5 0 0 1 9.5 3 9 9 0 1 0 21 14.5Z" />
            </svg>
        );
    }

    return (
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect width="16" height="11" x="4" y="5" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 19h8m-4-3v3" />
        </svg>
    );
}

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <div
            aria-label="Theme selection"
            className="inline-flex rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90"
            role="group"
        >
            {themeOptions.map((option) => {
                const isActive = theme === option.value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-label={option.label}
                        aria-pressed={isActive}
                        onClick={() => setTheme(option.value)}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-slate-950 ${
                            isActive
                                ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-950"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:active:bg-slate-700"
                        }`}
                    >
                        <ThemeIcon icon={option.icon} />
                    </button>
                );
            })}
        </div>
    );
}

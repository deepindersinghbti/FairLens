"use client";

import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
    theme: Theme;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: Theme) => void;
}

const THEME_STORAGE_KEY = "fairlens-theme";
const THEME_QUERY = "(prefers-color-scheme: dark)";
const themes: Theme[] = ["light", "dark", "system"];

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isTheme(value: string | null): value is Theme {
    return Boolean(value && themes.includes(value as Theme));
}

function getSystemTheme(): ResolvedTheme {
    if (typeof window === "undefined") {
        return "light";
    }

    return window.matchMedia(THEME_QUERY).matches ? "dark" : "light";
}

function resolveTheme(theme: Theme): ResolvedTheme {
    return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(resolvedTheme: ResolvedTheme) {
    if (typeof document === "undefined") {
        return;
    }

    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("system");
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
            const nextTheme = isTheme(storedTheme) ? storedTheme : "system";
            const nextResolvedTheme = resolveTheme(nextTheme);

            setThemeState(nextTheme);
            setResolvedTheme(nextResolvedTheme);
            applyTheme(nextResolvedTheme);
        });

        return () => window.cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia(THEME_QUERY);

        const syncResolvedTheme = () => {
            setResolvedTheme((currentResolvedTheme) => {
                const nextResolvedTheme = resolveTheme(theme);
                applyTheme(nextResolvedTheme);
                return currentResolvedTheme === nextResolvedTheme
                    ? currentResolvedTheme
                    : nextResolvedTheme;
            });
        };

        syncResolvedTheme();
        mediaQuery.addEventListener("change", syncResolvedTheme);

        return () => mediaQuery.removeEventListener("change", syncResolvedTheme);
    }, [theme]);

    const setTheme = (nextTheme: Theme) => {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        setThemeState(nextTheme);
    };

    const value = useMemo(
        () => ({ theme, resolvedTheme, setTheme }),
        [theme, resolvedTheme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }

    return context;
}

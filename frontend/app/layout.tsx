import type { Metadata } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "FairLens | AI Fairness Auditor",
  description:
    "FairLens audits datasets and model predictions for bias, fairness risk, and selection disparities.",
};

const themeInitScript = `
(() => {
  try {
    const storedTheme = window.localStorage.getItem("fairlens-theme");
    const theme = ["light", "dark", "system"].includes(storedTheme) ? storedTheme : "system";
    const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolvedTheme = theme === "system" ? (isSystemDark ? "dark" : "light") : theme;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  } catch {
    document.documentElement.classList.remove("dark");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

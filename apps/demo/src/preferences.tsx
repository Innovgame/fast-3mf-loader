import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { translate, type ContentKey, type Language } from "./content";

function readPreference(key: string) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writePreference(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* Preferences are optional. */
    }
}

function initialLanguage(): Language {
    const stored = readPreference("fast3mf-language");
    if (stored === "zh" || stored === "en") return stored;
    return navigator.language.startsWith("zh") ? "zh" : "en";
}

function initialTheme(): "light" | "dark" {
    const stored = readPreference("fast3mf-theme");
    if (stored === "light" || stored === "dark") return stored;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type Preferences = {
    language: Language;
    theme: "light" | "dark";
    t(key: ContentKey): string;
    toggleLanguage(): void;
    toggleTheme(): void;
};

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState(initialLanguage);
    const [theme, setTheme] = useState(initialTheme);
    useLayoutEffect(() => {
        document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
        document.documentElement.dataset.theme = theme;
        document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#10151c" : "#edf1f7");
        writePreference("fast3mf-language", language);
        writePreference("fast3mf-theme", theme);
    }, [language, theme]);
    return (
        <PreferencesContext.Provider
            value={{
                language,
                theme,
                t: (key) => translate(language, key),
                toggleLanguage: () => setLanguage((current) => (current === "en" ? "zh" : "en")),
                toggleTheme: () => setTheme((current) => (current === "light" ? "dark" : "light")),
            }}
        >
            {children}
        </PreferencesContext.Provider>
    );
}

export function usePreferences() {
    const value = useContext(PreferencesContext);
    if (!value) throw new Error("PreferencesProvider is required.");
    return value;
}

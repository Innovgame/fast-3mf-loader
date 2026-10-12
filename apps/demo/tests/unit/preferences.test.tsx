// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PreferencesProvider, usePreferences } from "../../src/preferences";

function Controls() {
    const { language, theme, toggleLanguage, toggleTheme } = usePreferences();
    return (
        <>
            <button onClick={toggleLanguage}>{language}</button>
            <button onClick={toggleTheme}>{theme}</button>
        </>
    );
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

it("keeps language and theme controls usable when browser storage is blocked", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
        throw new DOMException("Storage blocked", "SecurityError");
    });
    vi.spyOn(navigator, "language", "get").mockReturnValue("zh-CN");
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    render(
        <PreferencesProvider>
            <Controls />
        </PreferencesProvider>,
    );
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: /^zh$/ }));
    fireEvent.click(screen.getByRole("button", { name: /^dark$/ }));
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dataset.theme).toBe("light");
});

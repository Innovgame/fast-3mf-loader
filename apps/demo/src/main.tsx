import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { PreferencesProvider } from "./preferences";
import { TooltipProvider } from "./components/ui";
import "./style.css";

createRoot(document.getElementById("app")!).render(
    <StrictMode>
        <PreferencesProvider>
            <TooltipProvider delayDuration={250}>
                <App />
            </TooltipProvider>
        </PreferencesProvider>
    </StrictMode>,
);

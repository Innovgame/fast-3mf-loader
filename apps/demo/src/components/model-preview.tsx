import { useEffect, useRef, useState } from "react";
import { Box, Maximize2, RotateCcw, ScanLine } from "lucide-react";
import type { Group } from "three";
import type { createViewer } from "../viewer";
import { disposeModel } from "../model-resources";
import { usePreferences } from "../preferences";
import { Button, Hint } from "./ui";

export function ModelPreview({ model }: { model: Group | null }) {
    const { t } = usePreferences();
    const host = useRef<HTMLDivElement>(null);
    const viewer = useRef<ReturnType<typeof createViewer> | null>(null);
    const [ready, setReady] = useState(false);
    const [unavailable, setUnavailable] = useState(false);
    const [wireframe, setWireframe] = useState(false);
    useEffect(() => {
        setReady(false);
        setUnavailable(false);
        setWireframe(false);
        if (!model) return;
        let disposed = false;
        let released = false;
        let current: ReturnType<typeof createViewer> | undefined;
        function release() {
            if (released) return;
            released = true;
            if (current) current.dispose();
            else disposeModel(model!);
            viewer.current = null;
        }
        void import("../viewer")
            .then(({ createViewer }) => {
                if (disposed || !host.current) return;
                current = createViewer(host.current);
                current.setModel(model);
                viewer.current = current;
                setReady(true);
            })
            .catch(() => {
                release();
                if (!disposed) setUnavailable(true);
            });
        return () => {
            disposed = true;
            release();
        };
    }, [model]);

    async function fullscreen() {
        if (!host.current) return;
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await host.current.requestFullscreen();
        } catch {
            /* Browser fullscreen permissions may be restricted. */
        }
    }

    return (
        <div className="model-preview">
            <div className="viewport-surface" ref={host} role="region" aria-label={t("preview")}>
                {(!model || unavailable) && (
                    <div className="viewport-empty">
                        <div className="model-emblem" aria-hidden="true">
                            <Box strokeWidth={0.8} />
                        </div>
                        <strong>{t(unavailable ? "webglError" : "previewEmpty")}</strong>
                        {!unavailable && <p>{t("previewHint")}</p>}
                    </div>
                )}
                {model && !ready && !unavailable && (
                    <div className="viewport-empty">
                        <span className="loading-ring" />
                        <p>{t("building")}</p>
                    </div>
                )}
                <span className="axis-label" aria-hidden="true">
                    <span>X</span>
                    <span>Y</span>
                    <span>Z</span>
                </span>
                <div className="viewport-tools">
                    <Hint label={t("reset")}>
                        <Button variant="ghost" size="icon" aria-label={t("reset")} disabled={!ready} onClick={() => viewer.current?.fit()}>
                            <RotateCcw />
                        </Button>
                    </Hint>
                    <Hint label={t("wireframe")}>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("wireframe")}
                            aria-pressed={wireframe}
                            disabled={!ready}
                            onClick={() => {
                                viewer.current?.wireframe(!wireframe);
                                setWireframe(!wireframe);
                            }}
                        >
                            <ScanLine />
                        </Button>
                    </Hint>
                    <Hint label={t("fullscreen")}>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("fullscreen")}
                            disabled={!ready || !document.fullscreenEnabled}
                            onClick={() => {
                                void fullscreen();
                            }}
                        >
                            <Maximize2 />
                        </Button>
                    </Hint>
                </div>
            </div>
            <div className="viewport-caption">
                <span className={ready ? "status-dot is-ready" : "status-dot"} />
                {t("orbitHint")}
            </div>
        </div>
    );
}

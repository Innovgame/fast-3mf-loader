import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import type { ContentKey } from "./content";
import { measureComparison, measureModel } from "./model-runner";
import { disposeModel, isMesh } from "./model-resources";

export type ModelMetrics = {
    parse: number;
    build: number;
    total: number;
    meshes: number;
    triangles: number;
    textures: number;
    parts: string[];
};
type Failure = { message: ContentKey; detail?: string };
type Comparison = { total: number } | { error: string };

function errorText(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

export function useDemo() {
    const [file, setFile] = useState<File | null>(null);
    const [model, setModel] = useState<Group | null>(null);
    const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
    const [failure, setFailure] = useState<Failure | null>(null);
    const [comparison, setComparison] = useState<Comparison | null>(null);
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState<ContentKey>("idle");
    const [busy, setBusy] = useState(false);
    const running = useRef(false);
    const mounted = useRef(true);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    async function load(source: File, workerCount?: number) {
        if (running.current) return;
        if (!source.name.toLowerCase().endsWith(".3mf") || !source.size) {
            setFailure({ message: "invalidFile" });
            return;
        }
        if (typeof Worker === "undefined" || typeof Blob === "undefined") {
            setFailure({ message: "runtimeError" });
            return;
        }
        running.current = true;
        setBusy(true);
        setFile(source);
        setModel(null);
        setMetrics(null);
        setComparison(null);
        setFailure(null);
        setProgress(0);
        setPhase("loading");
        try {
            const { Fast3MFLoader, fast3mfBuilder } = await import("@innovgame/fast-3mf-loader");
            let textures = 0;
            let parts: string[] = [];
            const result = await measureModel(source, {
                parse: async (buffer) => {
                    const data = await new Fast3MFLoader().parse(buffer, {
                        workerCount,
                        onProgress: (value) => {
                            if (mounted.current) setProgress(Math.max(0, Math.min(100, value)));
                        },
                    });
                    textures = Object.keys(data.texture).length;
                    parts = Object.keys(data.model);
                    return data;
                },
                build: (data) => {
                    if (mounted.current) setPhase("building");
                    return fast3mfBuilder(data);
                },
            });
            if (!mounted.current) {
                disposeModel(result.group);
                return;
            }
            let meshes = 0;
            let triangles = 0;
            result.group.traverse((object) => {
                if (!isMesh(object)) return;
                meshes++;
                triangles += (object.geometry.index?.count ?? object.geometry.getAttribute("position")?.count ?? 0) / 3;
            });
            setModel(result.group);
            setMetrics({ parse: result.parse, build: result.build, total: result.total, meshes, triangles, textures, parts });
            setProgress(100);
            setPhase("ready");
        } catch (error) {
            if (mounted.current) {
                setFailure({ message: "failed", detail: errorText(error) });
                setPhase("failed");
            }
        } finally {
            running.current = false;
            if (mounted.current) setBusy(false);
        }
    }

    async function compare() {
        if (!file || !metrics || running.current) return;
        running.current = true;
        setBusy(true);
        setComparison(null);
        setPhase("comparing");
        try {
            // Load the baseline only on request; a baseline failure does not affect the preview.
            const { ThreeMFLoader } = await import("three/addons/loaders/3MFLoader.js");
            await new Promise<void>((resolve) =>
                requestAnimationFrame(() => {
                    setTimeout(resolve, 0);
                }),
            );
            const result = await measureComparison(file, (buffer) => new ThreeMFLoader().parse(buffer));
            disposeModel(result.group);
            if (mounted.current) setComparison({ total: result.total });
        } catch (error) {
            if (mounted.current) setComparison({ error: errorText(error) });
        } finally {
            running.current = false;
            if (mounted.current) {
                setBusy(false);
                setPhase("ready");
            }
        }
    }

    function clear() {
        if (running.current) return;
        setModel(null);
        setFile(null);
        setMetrics(null);
        setComparison(null);
        setFailure(null);
        setProgress(0);
        setPhase("idle");
    }

    return { file, model, metrics, failure, comparison, progress, phase, busy, load, compare, clear };
}

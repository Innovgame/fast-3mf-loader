import { performance } from "node:perf_hooks";
import { DOMParser } from "linkedom";
import * as THREE from "three";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { classifyThreeBenchmarkError, installNodeTextureLoaderFallback } from "./benchmark-core.mjs";

export function installThreeBenchmarkAdapter() {
    const restoreDomParser = installDomParserPolyfill();
    const restoreTextureLoader = installNodeTextureLoaderFallback({
        TextureLoader: THREE.TextureLoader,
        Texture: THREE.Texture,
    });

    return {
        ThreeMFLoader,
        restore() {
            restoreTextureLoader();
            restoreDomParser();
        },
    };
}

export function measureThreeFixture({
    fixtureName,
    fixtureBytes,
    now = () => performance.now(),
    ThreeMFLoaderClass = ThreeMFLoader,
}) {
    const loader = new ThreeMFLoaderClass();
    const input = fixtureBytes.slice().buffer;
    const messages = [];
    const restoreConsole = installThreeConsoleCapture(messages);
    const start = now();

    try {
        const group = loader.parse(input);
        const totalMs = now() - start;
        const unsupportedMessage = findUnsupportedThreeMessage(messages);

        if (unsupportedMessage) {
            return {
                fixture: fixtureName,
                sizeKiB: fixtureBytes.byteLength / 1024,
                status: "unsupported",
                detail: unsupportedMessage,
            };
        }

        return {
            fixture: fixtureName,
            sizeKiB: fixtureBytes.byteLength / 1024,
            parseMs: totalMs,
            buildMs: 0,
            totalMs,
            children: group.children.length,
            status: "ok",
        };
    } catch (error) {
        const detail = findUnsupportedThreeMessage(messages) ?? error;
        return {
            fixture: fixtureName,
            sizeKiB: fixtureBytes.byteLength / 1024,
            ...classifyThreeBenchmarkError(detail),
        };
    } finally {
        restoreConsole();
    }
}

function installDomParserPolyfill() {
    const originalDomParser = globalThis.DOMParser;
    globalThis.DOMParser = DOMParser;

    return () => {
        if (typeof originalDomParser === "undefined") {
            delete globalThis.DOMParser;
            return;
        }

        globalThis.DOMParser = originalDomParser;
    };
}

function installThreeConsoleCapture(messages) {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args) => {
        messages.push(formatConsoleMessage(args));
    };

    console.warn = (...args) => {
        messages.push(formatConsoleMessage(args));
    };

    return () => {
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
    };
}

function formatConsoleMessage(args) {
    return args
        .map((arg) => {
            if (arg instanceof Error) {
                return arg.message;
            }

            return typeof arg === "string" ? arg : String(arg);
        })
        .join(" ");
}

function findUnsupportedThreeMessage(messages) {
    for (const message of messages) {
        if (classifyThreeBenchmarkError(message).status === "unsupported") {
            return message;
        }
    }

    return null;
}

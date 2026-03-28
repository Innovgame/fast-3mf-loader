import { readFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { Worker as NodeWorker } from "node:worker_threads";

const fixtureNames = [
    "cube_gears.3mf",
    "multipletextures.3mf",
    "truck.3mf",
    "vertexcolors.3mf",
    "volumetric.3mf",
];
const warmupRuns = 1;
const measuredRuns = 5;
const hardwareConcurrency = availableParallelism();
const workerCount = Math.min(Math.max(1, hardwareConcurrency - 1), 15);
const distEntry = resolve(process.cwd(), "dist/fast-3mf-loader.js");

installNavigatorPolyfill(hardwareConcurrency);
installWorkerPolyfill();

let Fast3MFLoader;
try {
    ({ Fast3MFLoader } = await import(pathToFileURL(distEntry).href));
} catch (error) {
    console.error("Failed to load dist/fast-3mf-loader.js. Run `npm run build` first.");
    throw error;
}

const originalConsoleTime = console.time;
const originalConsoleTimeEnd = console.timeEnd;
console.time = () => {};
console.timeEnd = () => {};

try {
    const rows = [];
    for (const fixtureName of fixtureNames) {
        const file = await readFile(resolve(process.cwd(), "3mf", fixtureName));
        const fixtureBytes = Uint8Array.from(file);

        for (let i = 0; i < warmupRuns; i++) {
            await parseFixture(fixtureBytes);
        }

        const times = [];
        let modelCount = 0;
        for (let i = 0; i < measuredRuns; i++) {
            const start = performance.now();
            const result = await parseFixture(fixtureBytes);
            times.push(performance.now() - start);
            modelCount = Object.keys(result.model).length;
        }

        rows.push({
            fixture: fixtureName,
            sizeKiB: fixtureBytes.byteLength / 1024,
            avgMs: average(times),
            minMs: Math.min(...times),
            maxMs: Math.max(...times),
            models: modelCount,
        });
    }

    console.log(`fast-3mf-loader benchmark`);
    console.log(`Node ${process.version} | ${process.platform} ${process.arch} | workers=${workerCount}`);
    console.log(`Warmup runs: ${warmupRuns} | Measured runs: ${measuredRuns}`);
    console.log("");
    printTable(rows);
} finally {
    console.time = originalConsoleTime;
    console.timeEnd = originalConsoleTimeEnd;
}

async function parseFixture(fixtureBytes) {
    const loader = new Fast3MFLoader();
    const input = fixtureBytes.slice().buffer;

    return loader.parse(input, {
        onProgress() {},
        workerCount,
    });
}

function average(values) {
    return values.reduce((total, value) => total + value, 0) / values.length;
}

function installNavigatorPolyfill(concurrency) {
    if (typeof globalThis.navigator === "undefined") {
        Object.defineProperty(globalThis, "navigator", {
            configurable: true,
            value: { hardwareConcurrency: concurrency },
        });
        return;
    }

    if (!("hardwareConcurrency" in globalThis.navigator)) {
        Object.defineProperty(globalThis.navigator, "hardwareConcurrency", {
            configurable: true,
            value: concurrency,
        });
    }
}

function installWorkerPolyfill() {
    globalThis.Worker = class BrowserCompatibleWorker {
        constructor(specifier, options = {}) {
            const source = decodeWorkerSource(specifier);
            if (!source) {
                throw new Error(`Unsupported worker specifier: ${String(specifier)}`);
            }

            this.onmessage = null;
            this.onerror = null;
            this.messageListeners = new Set();
            this.errorListeners = new Set();
            this.worker = new NodeWorker(wrapWorkerSource(source), {
                eval: true,
                name: options.name,
            });

            this.worker.on("message", (data) => {
                const event = { data };
                this.onmessage?.(event);
                for (const listener of this.messageListeners) {
                    listener(event);
                }
            });

            this.worker.on("error", (error) => {
                const event = { error, message: error.message };
                this.onerror?.(event);
                for (const listener of this.errorListeners) {
                    listener(event);
                }
            });
        }

        addEventListener(type, listener) {
            if (type === "message") this.messageListeners.add(listener);
            if (type === "error") this.errorListeners.add(listener);
        }

        removeEventListener(type, listener) {
            if (type === "message") this.messageListeners.delete(listener);
            if (type === "error") this.errorListeners.delete(listener);
        }

        postMessage(message, options = { transfer: [] }) {
            const transferList = Array.isArray(options?.transfer) ? options.transfer : [];
            this.worker.postMessage(message, transferList);
        }

        terminate() {
            return this.worker.terminate();
        }
    };
}

function decodeWorkerSource(specifier) {
    if (typeof specifier !== "string") return null;
    if (!specifier.startsWith("data:text/javascript")) return null;

    const separator = specifier.indexOf(",");
    if (separator === -1) return null;

    return decodeURIComponent(specifier.slice(separator + 1));
}

function wrapWorkerSource(source) {
    return `
const { parentPort } = require("node:worker_threads");
globalThis.self = globalThis;
globalThis.postMessage = (message, options) => {
    if (Array.isArray(options?.transfer) && options.transfer.length > 0) {
        parentPort.postMessage(message, options.transfer);
        return;
    }
    parentPort.postMessage(message);
};
parentPort.on("message", (data) => {
    if (typeof globalThis.onmessage === "function") {
        globalThis.onmessage({ data });
    }
});
${source}
`;
}

function printTable(rows) {
    const formattedRows = rows.map((row) => ({
        Fixture: row.fixture,
        "Size (KiB)": row.sizeKiB.toFixed(1),
        "Avg (ms)": row.avgMs.toFixed(1),
        "Min (ms)": row.minMs.toFixed(1),
        "Max (ms)": row.maxMs.toFixed(1),
        Models: String(row.models),
    }));
    const columns = Object.keys(formattedRows[0]);
    const widths = Object.fromEntries(
        columns.map((column) => [
            column,
            Math.max(column.length, ...formattedRows.map((row) => row[column].length)),
        ]),
    );

    const header = columns.map((column) => column.padEnd(widths[column])).join("  ");
    const divider = columns.map((column) => "-".repeat(widths[column])).join("  ");
    console.log(header);
    console.log(divider);
    for (const row of formattedRows) {
        console.log(columns.map((column) => row[column].padEnd(widths[column])).join("  "));
    }
}

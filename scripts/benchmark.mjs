import { readFile } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { Worker as NodeWorker } from "node:worker_threads";
import { measureComparisonFixture, measureFixture, resolveBenchmarkConfig, summarizeComparisonRows, summarizeFixtureMeasurements, summarizeThreeMeasurements } from "./benchmark-core.mjs";
import { installThreeBenchmarkAdapter, measureThreeFixture } from "./benchmark-threejs-adapter.mjs";

const fixtureNames = [
    "multipletextures.3mf",
    "truck.3mf",
];
const hardwareConcurrency = availableParallelism();
const { warmupRuns, measuredRuns, workerCount } = resolveBenchmarkConfig({
    hardwareConcurrency,
    env: process.env,
});
const distEntry = resolve(process.cwd(), "dist/fast-3mf-loader.js");

installNavigatorPolyfill(hardwareConcurrency);
installWorkerPolyfill();
const threeAdapter = installThreeBenchmarkAdapter();

let Fast3MFLoader;
let fast3mfBuilder;
try {
    ({ Fast3MFLoader, fast3mfBuilder } = await import(pathToFileURL(distEntry).href));
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
    const failureNotes = [];
    for (const fixtureName of fixtureNames) {
        const file = await readFile(resolve(process.cwd(), "3mf", fixtureName));
        const fixtureBytes = Uint8Array.from(file);

        for (let i = 0; i < warmupRuns; i++) {
            await measureFixture({
                fixtureName,
                fixtureBytes,
                workerCount,
                Fast3MFLoader,
                fast3mfBuilder,
            });

            measureThreeFixture({
                fixtureName,
                fixtureBytes,
                ThreeMFLoaderClass: threeAdapter.ThreeMFLoader,
            });
        }

        const { fastMeasurements, threeMeasurements } = await measureComparisonFixture({
            fixtureName,
            measuredRuns,
            measureFastFixture: () => measureFixture({
                fixtureName,
                fixtureBytes,
                workerCount,
                Fast3MFLoader,
                fast3mfBuilder,
            }),
            measureThreeFixture: () => measureThreeFixture({
                fixtureName,
                fixtureBytes,
                ThreeMFLoaderClass: threeAdapter.ThreeMFLoader,
            }),
        });

        const fast = summarizeFixtureMeasurements(fastMeasurements);
        const three = summarizeThreeMeasurements(threeMeasurements);

        rows.push({
            fixture: fixtureName,
            sizeKiB: fast.sizeKiB,
            fast,
            three,
        });

        if (three.status !== "ok") {
            failureNotes.push(`${fixtureName} | three ${three.status} | ${three.detail}`);
        }
    }

    console.log(`fast-3mf-loader benchmark vs three.js ThreeMFLoader`);
    console.log(`Node ${process.version} | ${process.platform} ${process.arch} | workers=${workerCount}`);
    console.log(`Warmup runs: ${warmupRuns} | Measured runs: ${measuredRuns}`);
    console.log("");
    printTable(rows);
    console.log("");
    printSpread(rows.map((row) => row.fast));
    printFailureNotes(failureNotes);
} finally {
    threeAdapter.restore();
    console.time = originalConsoleTime;
    console.timeEnd = originalConsoleTimeEnd;
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
    const formattedRows = summarizeComparisonRows(rows);
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

function printSpread(rows) {
    for (const row of rows) {
        console.log(
            `${row.fixture} spread | parse ${formatRange(row.parseRangeMs)} | build ${formatRange(row.buildRangeMs)} | total ${formatRange(row.totalRangeMs)} | n=${row.runs}`,
        );
    }
}

function printFailureNotes(notes) {
    if (notes.length === 0) {
        return;
    }

    console.log("");
    console.log("three.js fixture notes");
    for (const note of notes) {
        console.log(note);
    }
}

function formatRange([minimum, maximum]) {
    return `${minimum.toFixed(1)}-${maximum.toFixed(1)}ms`;
}

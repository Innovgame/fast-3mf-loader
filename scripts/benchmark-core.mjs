import { performance } from "node:perf_hooks";

const DEFAULT_BENCHMARK_WARMUP_RUNS = 1;
const DEFAULT_BENCHMARK_MEASURED_RUNS = 5;
const DEFAULT_BENCHMARK_WORKER_COUNT = 4;
const MAX_BENCHMARK_WORKER_COUNT = 15;

export function installNodeTextureLoaderFallback({
    TextureLoader,
    Texture,
    document = globalThis.document,
}) {
    if (typeof document !== "undefined") {
        return () => {};
    }

    const originalLoad = TextureLoader.prototype.load;
    TextureLoader.prototype.load = function (_url, onLoad) {
        const texture = new Texture();
        onLoad?.(texture);
        return texture;
    };

    return () => {
        TextureLoader.prototype.load = originalLoad;
    };
}

export function resolveBenchmarkConfig({
    hardwareConcurrency,
    env = process.env,
}) {
    return {
        warmupRuns: readPositiveInteger(env.FAST3MF_BENCHMARK_WARMUP_RUNS) ?? DEFAULT_BENCHMARK_WARMUP_RUNS,
        measuredRuns: readPositiveInteger(env.FAST3MF_BENCHMARK_MEASURED_RUNS) ?? DEFAULT_BENCHMARK_MEASURED_RUNS,
        workerCount: readPositiveInteger(env.FAST3MF_BENCHMARK_WORKERS) ?? resolveWorkerCount(hardwareConcurrency),
    };
}

export async function measureFixture({
    fixtureName,
    fixtureBytes,
    workerCount,
    Fast3MFLoader,
    fast3mfBuilder,
    now = () => performance.now(),
}) {
    const loader = new Fast3MFLoader();
    const input = fixtureBytes.slice().buffer;

    const parseStart = now();
    const parsed = await loader.parse(input, {
        onProgress() {},
        workerCount,
    });
    const parseMs = now() - parseStart;

    const buildStart = now();
    const group = fast3mfBuilder(parsed);
    const buildMs = now() - buildStart;

    return {
        fixture: fixtureName,
        sizeKiB: fixtureBytes.byteLength / 1024,
        parseMs,
        buildMs,
        totalMs: parseMs + buildMs,
        models: Object.keys(parsed.model).length,
        children: group.children.length,
    };
}

export async function measureComparisonFixture({
    fixtureName,
    measuredRuns,
    measureFastFixture,
    measureThreeFixture,
}) {
    const fastMeasurements = [];
    const threeMeasurements = [];
    let threeStopped = false;

    for (let i = 0; i < measuredRuns; i++) {
        fastMeasurements.push(await measureFastFixture({
            fixtureName,
            runIndex: i,
        }));

        if (threeStopped) {
            continue;
        }

        const threeMeasurement = measureThreeFixture({
            fixtureName,
            runIndex: i,
        });
        threeMeasurements.push(threeMeasurement);

        if (threeMeasurement.status !== "ok") {
            threeStopped = true;
        }
    }

    return {
        fastMeasurements,
        threeMeasurements,
    };
}

export function summarizeFixtureMeasurements(rows) {
    if (rows.length === 0) {
        throw new Error("Cannot summarize an empty benchmark run.");
    }

    const first = rows[0];

    return {
        fixture: first.fixture,
        sizeKiB: first.sizeKiB,
        parseMs: median(rows.map((row) => row.parseMs)),
        buildMs: median(rows.map((row) => row.buildMs)),
        totalMs: median(rows.map((row) => row.totalMs)),
        models: first.models,
        children: first.children,
        parseRangeMs: range(rows.map((row) => row.parseMs)),
        buildRangeMs: range(rows.map((row) => row.buildMs)),
        totalRangeMs: range(rows.map((row) => row.totalMs)),
        runs: rows.length,
    };
}

export function classifyThreeBenchmarkError(error) {
    const detail = error instanceof Error ? error.message : String(error);
    const unsupportedPatterns = [
        /THREE\.3MFLoader: Unsupported resource type\./i,
        /THREE\.ThreeMFLoader: Cannot find relationship file `rels` in 3MF archive\./i,
        /THREE\.3MFLoader: Error loading 3MF - no 3MF document found/i,
    ];

    return {
        status: unsupportedPatterns.some((pattern) => pattern.test(detail)) ? "unsupported" : "failed",
        detail,
    };
}

export function summarizeThreeMeasurements(rows) {
    if (rows.length === 0) {
        throw new Error("Cannot summarize an empty three.js benchmark run.");
    }

    const firstFailure = rows.find((row) => row.status !== "ok");
    if (firstFailure) {
        return {
            fixture: firstFailure.fixture,
            sizeKiB: firstFailure.sizeKiB,
            status: firstFailure.status,
            detail: firstFailure.detail,
        };
    }

    const first = rows[0];

    return {
        fixture: first.fixture,
        sizeKiB: first.sizeKiB,
        parseMs: median(rows.map((row) => row.parseMs)),
        buildMs: median(rows.map((row) => row.buildMs)),
        totalMs: median(rows.map((row) => row.totalMs)),
        children: first.children,
        parseRangeMs: range(rows.map((row) => row.parseMs)),
        buildRangeMs: range(rows.map((row) => row.buildMs)),
        totalRangeMs: range(rows.map((row) => row.totalMs)),
        runs: rows.length,
        status: "ok",
    };
}

export function summarizeComparisonRows(rows) {
    return rows.map((row) => ({
        Fixture: row.fixture,
        "Size (KiB)": row.sizeKiB.toFixed(1),
        "fast Parse": row.fast.parseMs.toFixed(1),
        "fast Build": row.fast.buildMs.toFixed(1),
        "fast Total": row.fast.totalMs.toFixed(1),
        "three Parse": formatComparisonTiming(row.three, "parseMs"),
        "three Build": formatComparisonTiming(row.three, "buildMs"),
        "three Total": formatComparisonTiming(row.three, "totalMs"),
        Status: row.three.status === "ok" ? "ok (fused parse+build)" : `three ${row.three.status}`,
    }));
}

export function summarizeRows(rows) {
    return rows.map((row) => ({
        Fixture: row.fixture,
        "Size (KiB)": row.sizeKiB.toFixed(1),
        "Parse (ms)": row.parseMs.toFixed(1),
        "Build (ms)": row.buildMs.toFixed(1),
        "Total (ms)": row.totalMs.toFixed(1),
        Models: String(row.models),
        Children: String(row.children),
    }));
}

function formatComparisonTiming(row, key) {
    return row.status === "ok" ? row[key].toFixed(1) : "unsupported/failed";
}

function median(values) {
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

function range(values) {
    return [Math.min(...values), Math.max(...values)];
}

function resolveWorkerCount(hardwareConcurrency) {
    if (typeof hardwareConcurrency === "number" && Number.isFinite(hardwareConcurrency) && hardwareConcurrency > 0) {
        return Math.min(Math.max(1, Math.floor(hardwareConcurrency) - 1), MAX_BENCHMARK_WORKER_COUNT);
    }

    return DEFAULT_BENCHMARK_WORKER_COUNT;
}

function readPositiveInteger(value) {
    if (typeof value !== "string" || value.length === 0) {
        return null;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

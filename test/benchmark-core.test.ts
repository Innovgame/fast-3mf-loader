import { describe, expect, test } from "vitest";

const {
    classifyThreeBenchmarkError,
    installNodeTextureLoaderFallback,
    measureComparisonFixture,
    measureFixture,
    resolveBenchmarkConfig,
    summarizeComparisonRows,
    summarizeFixtureMeasurements,
    summarizeThreeMeasurements,
} = await import("../scripts/benchmark-core.mjs");

function createNow(values: number[]) {
    let index = 0;
    return () => values[index++] ?? values[values.length - 1];
}

describe("measureFixture", () => {
    test("reports parse, build, and total timings separately", async () => {
        class MockLoader {
            async parse() {
                return {
                    rels: [],
                    modelRels: [],
                    model: {
                        "3D/3dmodel.model": {
                            unit: "millimeter",
                            version: "1.3",
                            transform: {},
                            metadata: {},
                            resources: {
                                object: {},
                                basematerials: {},
                                texture2d: {},
                                colorgroup: {},
                                texture2dgroup: {},
                                pbmetallicdisplayproperties: {},
                            },
                            build: [],
                            extensions: {},
                        },
                    },
                    printTicket: {},
                    texture: {},
                };
            }
        }

        const row = await measureFixture({
            fixtureName: "truck.3mf",
            fixtureBytes: Uint8Array.from([1, 2, 3]),
            workerCount: 4,
            Fast3MFLoader: MockLoader,
            fast3mfBuilder() {
                return { children: [{}, {}] };
            },
            now: createNow([10, 26, 40, 73]),
        });

        expect(row.fixture).toBe("truck.3mf");
        expect(row.parseMs).toBe(16);
        expect(row.buildMs).toBe(33);
        expect(row.totalMs).toBe(49);
        expect(row.children).toBe(2);
    });
});

describe("measureComparisonFixture", () => {
    test("keeps all fast measurements even after three.js fails early", async () => {
        const calls: string[] = [];
        const result = await measureComparisonFixture({
            fixtureName: "truck.3mf",
            measuredRuns: 3,
            measureFastFixture: async () => {
                const call = calls.filter((value) => value === "fast").length + 1;
                calls.push("fast");
                return { fixture: "truck.3mf", parseMs: call };
            },
            measureThreeFixture: () => {
                const call = calls.filter((value) => value === "three").length + 1;
                calls.push("three");

                if (call === 1) {
                    return { fixture: "truck.3mf", status: "unsupported", detail: "unsupported" };
                }

                return { fixture: "truck.3mf", status: "ok", parseMs: 1 };
            },
        });

        expect(result.fastMeasurements).toEqual([
            { fixture: "truck.3mf", parseMs: 1 },
            { fixture: "truck.3mf", parseMs: 2 },
            { fixture: "truck.3mf", parseMs: 3 },
        ]);
        expect(result.threeMeasurements).toEqual([
            { fixture: "truck.3mf", status: "unsupported", detail: "unsupported" },
        ]);
        expect(calls).toEqual(["fast", "three", "fast", "fast"]);
    });
});

describe("summarizeFixtureMeasurements", () => {
    test("uses medians for the displayed timings and preserves run spread", () => {
        const summary = summarizeFixtureMeasurements([
            {
                fixture: "truck.3mf",
                sizeKiB: 2587.2,
                parseMs: 100,
                buildMs: 10,
                totalMs: 110,
                models: 1,
                children: 2,
            },
            {
                fixture: "truck.3mf",
                sizeKiB: 2587.2,
                parseMs: 120,
                buildMs: 8,
                totalMs: 128,
                models: 1,
                children: 2,
            },
            {
                fixture: "truck.3mf",
                sizeKiB: 2587.2,
                parseMs: 260,
                buildMs: 30,
                totalMs: 290,
                models: 1,
                children: 2,
            },
            {
                fixture: "truck.3mf",
                sizeKiB: 2587.2,
                parseMs: 110,
                buildMs: 11,
                totalMs: 121,
                models: 1,
                children: 2,
            },
            {
                fixture: "truck.3mf",
                sizeKiB: 2587.2,
                parseMs: 130,
                buildMs: 12,
                totalMs: 142,
                models: 1,
                children: 2,
            },
        ]);

        expect(summary.fixture).toBe("truck.3mf");
        expect(summary.parseMs).toBe(120);
        expect(summary.buildMs).toBe(11);
        expect(summary.totalMs).toBe(128);
        expect(summary.parseRangeMs).toEqual([100, 260]);
        expect(summary.buildRangeMs).toEqual([8, 30]);
        expect(summary.totalRangeMs).toEqual([110, 290]);
        expect(summary.runs).toBe(5);
    });
});

describe("summarizeComparisonRows", () => {
    test("renders fast and three columns together when three succeeds", () => {
        const rows = summarizeComparisonRows([
            {
                fixture: "truck.3mf",
                sizeKiB: 2587.2,
                fast: {
                    fixture: "truck.3mf",
                    sizeKiB: 2587.2,
                    parseMs: 120,
                    buildMs: 11,
                    totalMs: 131,
                    models: 1,
                    children: 2,
                    parseRangeMs: [100, 130],
                    buildRangeMs: [8, 12],
                    totalRangeMs: [110, 142],
                    runs: 5,
                },
                three: {
                    fixture: "truck.3mf",
                    sizeKiB: 2587.2,
                    parseMs: 210,
                    buildMs: 0,
                    totalMs: 210,
                    children: 2,
                    parseRangeMs: [205, 215],
                    buildRangeMs: [0, 0],
                    totalRangeMs: [205, 215],
                    runs: 5,
                    status: "ok",
                },
            },
        ]);

        expect(rows).toEqual([
            {
                Fixture: "truck.3mf",
                "Size (KiB)": "2587.2",
                "fast Parse": "120.0",
                "fast Build": "11.0",
                "fast Total": "131.0",
                "three Parse": "210.0",
                "three Build": "0.0",
                "three Total": "210.0",
                Status: "ok (fused parse+build)",
            },
        ]);
    });

    test("prints unsupported/failed when three cannot complete a fixture", () => {
        const rows = summarizeComparisonRows([
            {
                fixture: "multipletextures.3mf",
                sizeKiB: 3020.7,
                fast: {
                    fixture: "multipletextures.3mf",
                    sizeKiB: 3020.7,
                    parseMs: 414.7,
                    buildMs: 3.8,
                    totalMs: 424.2,
                    models: 1,
                    children: 1,
                    parseRangeMs: [389.9, 423.1],
                    buildRangeMs: [3.4, 19.9],
                    totalRangeMs: [393.8, 434.7],
                    runs: 5,
                },
                three: {
                    fixture: "multipletextures.3mf",
                    sizeKiB: 3020.7,
                    status: "unsupported",
                    detail: "THREE.3MFLoader: Unsupported resource type.",
                },
            },
        ]);

        expect(rows[0]["three Parse"]).toBe("unsupported/failed");
        expect(rows[0]["three Build"]).toBe("unsupported/failed");
        expect(rows[0]["three Total"]).toBe("unsupported/failed");
        expect(rows[0].Status).toBe("three unsupported");
    });
});

describe("classifyThreeBenchmarkError", () => {
    test("maps known three.js support-boundary errors to unsupported", () => {
        expect(classifyThreeBenchmarkError(new Error("THREE.3MFLoader: Unsupported resource type."))).toEqual({
            status: "unsupported",
            detail: "THREE.3MFLoader: Unsupported resource type.",
        });
    });
});

describe("summarizeThreeMeasurements", () => {
    test("uses medians for successful fused three.js runs", () => {
        const summary = summarizeThreeMeasurements([
            {
                fixture: "truck.3mf",
                sizeKiB: 2587.2,
                parseMs: 220,
                buildMs: 0,
                totalMs: 220,
                children: 2,
                status: "ok",
            },
            {
                fixture: "truck.3mf",
                sizeKiB: 2587.2,
                parseMs: 210,
                buildMs: 0,
                totalMs: 210,
                children: 2,
                status: "ok",
            },
            {
                fixture: "truck.3mf",
                sizeKiB: 2587.2,
                parseMs: 240,
                buildMs: 0,
                totalMs: 240,
                children: 2,
                status: "ok",
            },
        ]);

        expect(summary).toEqual({
            fixture: "truck.3mf",
            sizeKiB: 2587.2,
            parseMs: 220,
            buildMs: 0,
            totalMs: 220,
            children: 2,
            parseRangeMs: [210, 240],
            buildRangeMs: [0, 0],
            totalRangeMs: [210, 240],
            runs: 3,
            status: "ok",
        });
    });
});

describe("resolveBenchmarkConfig", () => {
    test("allows environment overrides for benchmark sampling", () => {
        const config = resolveBenchmarkConfig({
            hardwareConcurrency: 10,
            env: {
                FAST3MF_BENCHMARK_WARMUP_RUNS: "2",
                FAST3MF_BENCHMARK_MEASURED_RUNS: "9",
                FAST3MF_BENCHMARK_WORKERS: "7",
            },
        });

        expect(config.warmupRuns).toBe(2);
        expect(config.measuredRuns).toBe(9);
        expect(config.workerCount).toBe(7);
    });

    test("falls back to stable defaults when overrides are missing or invalid", () => {
        const config = resolveBenchmarkConfig({
            hardwareConcurrency: 6,
            env: {
                FAST3MF_BENCHMARK_WARMUP_RUNS: "0",
                FAST3MF_BENCHMARK_MEASURED_RUNS: "NaN",
                FAST3MF_BENCHMARK_WORKERS: "-3",
            },
        });

        expect(config.warmupRuns).toBe(1);
        expect(config.measuredRuns).toBe(5);
        expect(config.workerCount).toBe(5);
    });
});

describe("installNodeTextureLoaderFallback", () => {
    test("stubs TextureLoader.load when document is unavailable", () => {
        class FakeTexture {}

        class FakeTextureLoader {
            load(_url?: string, _onLoad?: (value: FakeTexture) => void) {
                return "original";
            }
        }

        const originalLoad = FakeTextureLoader.prototype.load;
        const restore = installNodeTextureLoaderFallback({
            TextureLoader: FakeTextureLoader,
            Texture: FakeTexture,
            document: undefined,
        });

        let loadedTexture: FakeTexture | undefined;
        const texture = new FakeTextureLoader().load("blob:fixture", (value: FakeTexture) => {
            loadedTexture = value;
        });

        expect(texture).toBeInstanceOf(FakeTexture);
        expect(loadedTexture).toBe(texture);

        restore();

        expect(FakeTextureLoader.prototype.load).toBe(originalLoad);
        expect(new FakeTextureLoader().load()).toBe("original");
    });
});

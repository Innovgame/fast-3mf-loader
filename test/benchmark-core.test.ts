import { describe, expect, test } from "vitest";

const { installNodeTextureLoaderFallback, measureFixture, resolveBenchmarkConfig, summarizeFixtureMeasurements } = await import("../scripts/benchmark-core.mjs");

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

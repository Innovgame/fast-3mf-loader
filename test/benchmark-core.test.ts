import { describe, expect, test } from "vitest";

const { installNodeTextureLoaderFallback, measureFixture } = await import("../scripts/benchmark-core.mjs");

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

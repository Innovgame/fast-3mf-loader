import { describe, expect, test, vi } from "vitest";

const { measureThreeFixture } = await import("../scripts/benchmark-threejs-adapter.mjs");

function createNow(values: number[]) {
    let index = 0;
    return () => values[index++] ?? values[values.length - 1];
}

describe("measureThreeFixture", () => {
    test("reports fused parse and total timings when three.js parsing succeeds", () => {
        class MockThreeMFLoader {
            parse() {
                return { children: [{}, {}] };
            }
        }

        const row = measureThreeFixture({
            fixtureName: "truck.3mf",
            fixtureBytes: Uint8Array.from([1, 2, 3]),
            ThreeMFLoaderClass: MockThreeMFLoader,
            now: createNow([10, 32]),
        });

        expect(row).toEqual({
            fixture: "truck.3mf",
            sizeKiB: 3 / 1024,
            parseMs: 22,
            buildMs: 0,
            totalMs: 22,
            children: 2,
            status: "ok",
        });
    });

    test("classifies known three.js support-boundary failures as unsupported", () => {
        class MockThreeMFLoader {
            parse() {
                throw new Error("THREE.3MFLoader: Unsupported resource type.");
            }
        }

        const row = measureThreeFixture({
            fixtureName: "multipletextures.3mf",
            fixtureBytes: Uint8Array.from([1, 2, 3, 4]),
            ThreeMFLoaderClass: MockThreeMFLoader,
        });

        expect(row).toEqual({
            fixture: "multipletextures.3mf",
            sizeKiB: 4 / 1024,
            status: "unsupported",
            detail: "THREE.3MFLoader: Unsupported resource type.",
        });
    });

    test("treats known three.js support-boundary console errors as unsupported", () => {
        class MockThreeMFLoader {
            parse() {
                console.error("THREE.3MFLoader: Unsupported resource type.");
                return { children: [{}] };
            }
        }

        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        const row = measureThreeFixture({
            fixtureName: "multipletextures.3mf",
            fixtureBytes: Uint8Array.from([1, 2, 3, 4]),
            ThreeMFLoaderClass: MockThreeMFLoader,
        });

        expect(row).toEqual({
            fixture: "multipletextures.3mf",
            sizeKiB: 4 / 1024,
            status: "unsupported",
            detail: "THREE.3MFLoader: Unsupported resource type.",
        });

        consoleError.mockRestore();
    });
});

import { describe, expect, test } from "vitest";
import {
    createTriangleColorBuffer,
    createTrianglePositionBuffer,
    createTriangleUvBuffer,
} from "../lib/build-geometry";
import { hexToRgbaArray } from "../lib/util";

describe("build-geometry helpers", () => {
    test("writes triangle positions into a packed Float32Array", () => {
        const positions = createTrianglePositionBuffer(
            new Float32Array([
                0, 0, 0,
                1, 0, 0,
                0, 1, 0,
            ]),
            [{ v1: 0, v2: 1, v3: 2 }],
        );

        expect(Array.from(positions)).toEqual([
            0, 0, 0,
            1, 0, 0,
            0, 1, 0,
        ]);
    });

    test("writes UVs and colors without growing JS arrays", () => {
        const uvs = createTriangleUvBuffer(
            new Float32Array([0, 0, 1, 0, 0, 1]),
            [{ v1: 0, v2: 1, v3: 2, p1: 0, p2: 1, p3: 2 }],
        );
        const colors = createTriangleColorBuffer(
            new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
            [{ v1: 0, v2: 1, v3: 2, p1: 0, p2: 1, p3: 2 }],
            undefined,
        );

        expect(Array.from(uvs)).toEqual([0, 0, 1, 0, 0, 1]);
        expect(Array.from(colors)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    });
});

describe("hexToRgbaArray", () => {
    test("parses 7-char hex (#RRGGBB) with fast path", () => {
        const [r, g, b, a] = hexToRgbaArray("#FF0000");
        expect(r).toBeCloseTo(1.0);
        expect(g).toBeCloseTo(0.0);
        expect(b).toBeCloseTo(0.0);
        expect(a).toBeCloseTo(1.0);
    });

    test("parses 9-char hex (#RRGGBBAA) with fast path", () => {
        const [r, g, b, a] = hexToRgbaArray("#00FF0080");
        expect(r).toBeCloseTo(0.0);
        expect(g).toBeCloseTo(1.0);
        expect(b).toBeCloseTo(0.0);
        expect(a).toBeCloseTo(128 / 255);
    });

    test("parses lowercase hex correctly", () => {
        const [r, g, b, a] = hexToRgbaArray("#ff8000ff");
        expect(r).toBeCloseTo(1.0);
        expect(g).toBeCloseTo(128 / 255);
        expect(b).toBeCloseTo(0.0);
        expect(a).toBeCloseTo(1.0);
    });

    test("parses short hex via fallback", () => {
        // #F00F has length 5, so it falls to the fallback path.
        // After slice(1) = "F00F", padEnd(8, "F") = "F00FFFFF" (length 8),
        // which is > 4 so no short-hex expansion runs.
        // Parsed byte pairs: F0, 0F, FF, FF.
        const [r, g, b, a] = hexToRgbaArray("#F00F");
        expect(r).toBeCloseTo(0xF0 / 255);
        expect(g).toBeCloseTo(0x0F / 255);
        expect(b).toBeCloseTo(1.0);
        expect(a).toBeCloseTo(1.0);
    });
});

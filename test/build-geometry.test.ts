import { describe, expect, test } from "vitest";
import {
    createTriangleColorBuffer,
    createTrianglePositionBuffer,
    createTriangleUvBuffer,
} from "../lib/build-geometry";

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

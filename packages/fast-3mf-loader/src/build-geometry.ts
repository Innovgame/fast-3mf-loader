import type { TriangleProperty } from "./util";

export function createTrianglePositionBuffer(vertices: ArrayLike<number>, triangleProperties: TriangleProperty[]) {
    const output = new Float32Array(triangleProperties.length * 9);
    let offset = 0;

    for (let i = 0; i < triangleProperties.length; i++) {
        const triangle = triangleProperties[i];
        const v1 = triangle.v1 * 3;
        output[offset + 0] = vertices[v1 + 0];
        output[offset + 1] = vertices[v1 + 1];
        output[offset + 2] = vertices[v1 + 2];

        const v2 = triangle.v2 * 3;
        output[offset + 3] = vertices[v2 + 0];
        output[offset + 4] = vertices[v2 + 1];
        output[offset + 5] = vertices[v2 + 2];

        const v3 = triangle.v3 * 3;
        output[offset + 6] = vertices[v3 + 0];
        output[offset + 7] = vertices[v3 + 1];
        output[offset + 8] = vertices[v3 + 2];
        offset += 9;
    }

    return output;
}

export function createTriangleUvBuffer(uvs: ArrayLike<number>, triangleProperties: TriangleProperty[]) {
    let validTriangleCount = 0;

    for (let i = 0; i < triangleProperties.length; i++) {
        const triangle = triangleProperties[i];
        if (triangle.p1 !== undefined && triangle.p2 !== undefined && triangle.p3 !== undefined) {
            validTriangleCount += 1;
        }
    }

    const output = new Float32Array(validTriangleCount * 6);
    let offset = 0;

    for (let i = 0; i < triangleProperties.length; i++) {
        const triangle = triangleProperties[i];
        if (triangle.p1 === undefined || triangle.p2 === undefined || triangle.p3 === undefined) continue;

        const uv1 = triangle.p1 * 2;
        output[offset + 0] = uvs[uv1 + 0];
        output[offset + 1] = uvs[uv1 + 1];

        const uv2 = triangle.p2 * 2;
        output[offset + 2] = uvs[uv2 + 0];
        output[offset + 3] = uvs[uv2 + 1];

        const uv3 = triangle.p3 * 2;
        output[offset + 4] = uvs[uv3 + 0];
        output[offset + 5] = uvs[uv3 + 1];
        offset += 6;
    }

    return output;
}

export function createTriangleColorBuffer(colors: ArrayLike<number>, triangleProperties: TriangleProperty[], fallbackPindex?: number) {
    const output = new Float32Array(triangleProperties.length * 9);
    let offset = 0;

    for (let i = 0; i < triangleProperties.length; i++) {
        const triangle = triangleProperties[i];
        const p1 = triangle.p1 ?? fallbackPindex;
        const p2 = triangle.p2 ?? p1;
        const p3 = triangle.p3 ?? p1;
        if (p1 === undefined || p2 === undefined || p3 === undefined) continue;

        const c1 = p1 * 3;
        output[offset + 0] = colors[c1 + 0];
        output[offset + 1] = colors[c1 + 1];
        output[offset + 2] = colors[c1 + 2];

        const c2 = p2 * 3;
        output[offset + 3] = colors[c2 + 0];
        output[offset + 4] = colors[c2 + 1];
        output[offset + 5] = colors[c2 + 2];

        const c3 = p3 * 3;
        output[offset + 6] = colors[c3 + 0];
        output[offset + 7] = colors[c3 + 1];
        output[offset + 8] = colors[c3 + 2];
        offset += 9;
    }

    return output.subarray(0, offset);
}

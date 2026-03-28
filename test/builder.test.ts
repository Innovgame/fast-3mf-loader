import * as THREE from "three";
import { afterEach, describe, expect, test, vi } from "vitest";
import "./helpers/mock-inline-workers";
import { readFixture } from "./helpers/read-fixture";

const { Fast3MFLoader, fast3mfBuilder } = await import("../lib/main");

function hasTextureMap(material: THREE.Material | THREE.Material[]) {
    if (Array.isArray(material)) {
        return material.some((entry) => "map" in entry && !!entry.map);
    }

    return "map" in material && !!material.map;
}

describe("fast3mfBuilder", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    function collectMeshes(group: THREE.Group) {
        const meshes: THREE.Mesh[] = [];
        group.traverse((child) => {
            if (child instanceof THREE.Mesh) meshes.push(child);
        });
        return meshes;
    }

    test("builds a THREE.Group from parsed facecolors data", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("facecolors.3mf"));
        const group = fast3mfBuilder(data);

        expect(group).toBeInstanceOf(THREE.Group);
        expect(group.children.length).toBeGreaterThan(0);
    });

    test("builds vertex colors for vertexcolors.3mf", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("vertexcolors.3mf"));
        const group = fast3mfBuilder(data);
        const coloredMesh = collectMeshes(group).find((mesh) => !!mesh.geometry.getAttribute("color"));

        expect(coloredMesh).toBeTruthy();
    });

    test("builds textured materials for multipletextures.3mf", async () => {
        vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation((_url, onLoad) => {
            const texture = new THREE.Texture() as THREE.Texture<HTMLImageElement>;
            onLoad?.(texture);
            return texture;
        });

        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("multipletextures.3mf"));
        const group = fast3mfBuilder(data);
        const texturedMesh = collectMeshes(group).find((mesh) => hasTextureMap(mesh.material));

        expect(texturedMesh).toBeTruthy();
    });
});

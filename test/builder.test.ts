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

function mockTextureLoader() {
    return vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation((_url, onLoad) => {
        const texture = new THREE.Texture() as THREE.Texture<HTMLImageElement>;
        onLoad?.(texture);
        return texture;
    });
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

    test("throws a builder-facing error when the root model relationship is missing", () => {
        expect(() =>
            fast3mfBuilder({
                rels: [],
                modelRels: [],
                model: {},
                printTicket: {},
                texture: {},
            } as any),
        ).toThrow("fast3mfBuilder: Cannot find 3D model relationship in 3MF archive.");
    });

    test("builds vertex colors for vertexcolors.3mf", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("vertexcolors.3mf"));
        const group = fast3mfBuilder(data);
        const coloredMesh = collectMeshes(group).find((mesh) => !!mesh.geometry.getAttribute("color"));

        expect(coloredMesh).toBeTruthy();
    });

    test("builds textured materials for multipletextures.3mf", async () => {
        mockTextureLoader();

        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("multipletextures.3mf"));
        const group = fast3mfBuilder(data);
        const texturedMesh = collectMeshes(group).find((mesh) => hasTextureMap(mesh.material));

        expect(texturedMesh).toBeTruthy();
    });

    test("multipletextures keeps aligned position and uv attribute counts", async () => {
        mockTextureLoader();

        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("multipletextures.3mf"));
        const group = fast3mfBuilder(data);
        const texturedMesh = collectMeshes(group).find((mesh) => hasTextureMap(mesh.material));

        expect(texturedMesh).toBeTruthy();
        expect(texturedMesh!.geometry.getAttribute("position").count).toBe(texturedMesh!.geometry.getAttribute("uv").count);
    });

    test("truck builds nested component content with visible meshes", async () => {
        mockTextureLoader();

        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("truck.3mf"));
        const group = fast3mfBuilder(data);

        expect(group.children.length).toBeGreaterThan(0);
        expect(collectMeshes(group).length).toBeGreaterThan(0);
    });
});

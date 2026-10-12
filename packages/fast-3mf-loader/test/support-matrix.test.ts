import * as THREE from "three";
import { strToU8, zipSync } from "fflate";
import { afterEach, describe, expect, test, vi } from "vitest";
import "./helpers/mock-inline-workers";
import { readFixture } from "./helpers/read-fixture";

const { Fast3MFLoader, fast3mfBuilder } = await import("../lib/main");

function collectMeshes(group: THREE.Group) {
    const meshes: THREE.Mesh[] = [];
    group.traverse((child) => {
        if (child instanceof THREE.Mesh) meshes.push(child);
    });
    return meshes;
}

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

function createArchiveWithPrintTicket() {
    const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;
    const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
          <vertex x="0" y="0" z="0" />
          <vertex x="1" y="0" z="0" />
          <vertex x="0" y="1" z="0" />
        </vertices>
        <triangles>
          <triangle v1="0" v2="1" v3="2" />
        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" />
  </build>
</model>`;
    const archive = zipSync({
        "_rels/.rels": strToU8(rels),
        "3D/3dmodel.model": strToU8(model),
        "Metadata/printticket.xml": strToU8("<printticket />"),
    });

    return archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength) as ArrayBuffer;
}

describe("support matrix coverage", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("multipletextures fixture confirms texture support", async () => {
        mockTextureLoader();

        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("multipletextures.3mf"));
        const group = fast3mfBuilder(data);

        const texturedMesh = collectMeshes(group).find((mesh) => hasTextureMap(mesh.material));

        expect(texturedMesh).toBeTruthy();
    });

    test("vertexcolors fixture confirms vertex color support", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("vertexcolors.3mf"));
        const group = fast3mfBuilder(data);

        const coloredMesh = collectMeshes(group).find((mesh) => !!mesh.geometry.getAttribute("color"));

        expect(coloredMesh).toBeTruthy();
    });

    test("truck fixture confirms component support", async () => {
        mockTextureLoader();

        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("truck.3mf"));
        const group = fast3mfBuilder(data);
        const objectValues = Object.values(data.model).flatMap((model) => Object.values(model.resources.object));

        expect(objectValues.some((object) => object.components.length > 0)).toBe(true);
        expect(group.children.length).toBeGreaterThan(0);
        expect(collectMeshes(group).length).toBeGreaterThan(0);
    });

    test("print tickets warn and remain unsupported", async () => {
        const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const loader = new Fast3MFLoader();
        const data = await loader.parse(createArchiveWithPrintTicket());

        expect(data.printTicket).toEqual({});
        expect(consoleWarn).toHaveBeenCalledWith("Fast3MFLoader: 3MF print tickets are not supported yet.");
    });
});

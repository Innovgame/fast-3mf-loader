import { strToU8, zipSync } from "fflate";
import * as THREE from "three";
import { afterEach, describe, expect, test, vi } from "vitest";
import "./helpers/mock-inline-workers";
import { readFixture } from "./helpers/read-fixture";

const { Fast3MFLoader, fast3mfBuilder } = await import("../src/index");

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

function createParseResult(modelData: any, overrides: Partial<any> = {}) {
    return {
        rels: [{ target: "/3D/3dmodel.model" }],
        modelRels: [],
        model: {
            "3D/3dmodel.model": modelData,
        },
        printTicket: {},
        texture: {},
        ...overrides,
    } as any;
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

    test("throws a builder-facing error when the root model relationship points to missing parsed data", () => {
        expect(() =>
            fast3mfBuilder({
                rels: [{ target: "/3D/missing.model" }],
                modelRels: [],
                model: {},
                printTicket: {},
                texture: {},
            } as any),
        ).toThrow("fast3mfBuilder: Cannot find root model `3D/missing.model` in parsed model data.");
    });

    test("accepts a root model relationship target without a leading slash", () => {
        const group = fast3mfBuilder(
            createParseResult({
                resources: {
                    object: {
                        "1": {
                            id: "1",
                            mesh: {
                                vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                                triangles: new Uint32Array([0, 1, 2]),
                                triangleProperties: [],
                            },
                            components: [],
                        },
                    },
                    basematerials: {},
                    texture2d: {},
                    colorgroup: {},
                    texture2dgroup: {},
                    pbmetallicdisplayproperties: {},
                },
                build: [{ objectId: "1" }],
            }, {
                rels: [{ target: "3D/3dmodel.model" }],
            }),
        );

        expect(group).toBeInstanceOf(THREE.Group);
        expect(group.children.length).toBeGreaterThan(0);
    });

    test("throws a builder-facing error when a build item references a missing object", () => {
        expect(() =>
            fast3mfBuilder({
                rels: [{ target: "/3D/3dmodel.model" }],
                modelRels: [],
                model: {
                    "3D/3dmodel.model": {
                        resources: {
                            object: {},
                            basematerials: {},
                            texture2d: {},
                            colorgroup: {},
                            texture2dgroup: {},
                            pbmetallicdisplayproperties: {},
                        },
                        build: [{ objectId: "missing-object" }],
                    },
                },
                printTicket: {},
                texture: {},
            } as any),
        ).toThrow("fast3mfBuilder: Cannot find build object `missing-object` in model `3D/3dmodel.model`.");
    });

    test("throws a builder-facing error when a component references a missing object", () => {
        expect(() =>
            fast3mfBuilder({
                rels: [{ target: "/3D/3dmodel.model" }],
                modelRels: [],
                model: {
                    "3D/3dmodel.model": {
                        resources: {
                            object: {
                                "1": {
                                    id: "1",
                                    mesh: {
                                        vertices: [],
                                        triangles: [],
                                        triangleProperties: [],
                                    },
                                    components: [{ objectId: "missing-component" }],
                                },
                            },
                            basematerials: {},
                            texture2d: {},
                            colorgroup: {},
                            texture2dgroup: {},
                            pbmetallicdisplayproperties: {},
                        },
                        build: [{ objectId: "1" }],
                    },
                },
                printTicket: {},
                texture: {},
            } as any),
        ).toThrow("fast3mfBuilder: Cannot find component object `missing-component` in model `3D/3dmodel.model`.");
    });

    test("throws a builder-facing error when a base material index is missing", () => {
        expect(() =>
            fast3mfBuilder(
                createParseResult({
                    resources: {
                        object: {
                            "1": {
                                id: "1",
                                pid: "mat1",
                                pindex: "1",
                                mesh: {
                                    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                                    triangles: new Uint32Array([0, 1, 2]),
                                    triangleProperties: [{ v1: 0, v2: 1, v3: 2 }],
                                },
                                components: [],
                            },
                        },
                        basematerials: {
                            mat1: {
                                id: "mat1",
                                basematerials: [{ index: 0, name: "base-0", displaycolor: "#ffffff" }],
                            },
                        },
                        texture2d: {},
                        colorgroup: {},
                        texture2dgroup: {},
                        pbmetallicdisplayproperties: {},
                    },
                    build: [{ objectId: "1" }],
                }),
            ),
        ).toThrow("fast3mfBuilder: Cannot find base material index `1` in resource `mat1` for model `3D/3dmodel.model`.");
    });

    test("throws a builder-facing error when a texture group references a missing texture resource", () => {
        expect(() =>
            fast3mfBuilder(
                createParseResult({
                    resources: {
                        object: {
                            "1": {
                                id: "1",
                                pid: "tex-group",
                                mesh: {
                                    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                                    triangles: new Uint32Array([0, 1, 2]),
                                    triangleProperties: [{ v1: 0, v2: 1, v3: 2, p1: 0, p2: 1, p3: 2 }],
                                },
                                components: [],
                            },
                        },
                        basematerials: {},
                        texture2d: {},
                        colorgroup: {},
                        texture2dgroup: {
                            "tex-group": {
                                id: "tex-group",
                                texid: "missing-texture",
                                uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
                            },
                        },
                        pbmetallicdisplayproperties: {},
                    },
                    build: [{ objectId: "1" }],
                }),
            ),
        ).toThrow(
            "fast3mfBuilder: Cannot find texture resource `missing-texture` referenced by texture group `tex-group` in model `3D/3dmodel.model`.",
        );
    });

    test("throws a builder-facing error when a texture binary is missing", () => {
        expect(() =>
            fast3mfBuilder(
                createParseResult(
                    {
                        resources: {
                            object: {
                                "1": {
                                    id: "1",
                                    pid: "tex-group",
                                    mesh: {
                                        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                                        triangles: new Uint32Array([0, 1, 2]),
                                        triangleProperties: [{ v1: 0, v2: 1, v3: 2, p1: 0, p2: 1, p3: 2 }],
                                    },
                                    components: [],
                                },
                            },
                            basematerials: {},
                            texture2d: {
                                tex1: {
                                    id: "tex1",
                                    path: "/3D/Textures/missing.png",
                                    contenttype: "image/png",
                                },
                            },
                            colorgroup: {},
                            texture2dgroup: {
                                "tex-group": {
                                    id: "tex-group",
                                    texid: "tex1",
                                    uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
                                },
                            },
                            pbmetallicdisplayproperties: {},
                        },
                        build: [{ objectId: "1" }],
                    },
                    {
                        modelRels: [{ target: "/3D/Textures/missing.png", id: "rel0", type: "texture" }],
                    },
                ),
            ),
        ).toThrow(
            "fast3mfBuilder: Cannot find texture binary `/3D/Textures/missing.png` referenced by texture resource `tex1` in model `3D/3dmodel.model`.",
        );
    });

    test("accepts texture relationship targets without a leading slash", () => {
        mockTextureLoader();

        const group = fast3mfBuilder(
            createParseResult(
                {
                    resources: {
                        object: {
                            "1": {
                                id: "1",
                                pid: "tex-group",
                                mesh: {
                                    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                                    triangles: new Uint32Array([0, 1, 2]),
                                    triangleProperties: [{ v1: 0, v2: 1, v3: 2, p1: 0, p2: 1, p3: 2 }],
                                },
                                components: [],
                            },
                        },
                        basematerials: {},
                        texture2d: {
                            tex1: {
                                id: "tex1",
                                path: "/3D/Textures/atlas.png",
                                contenttype: "image/png",
                            },
                        },
                        colorgroup: {},
                        texture2dgroup: {
                            "tex-group": {
                                id: "tex-group",
                                texid: "tex1",
                                uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
                            },
                        },
                        pbmetallicdisplayproperties: {},
                    },
                    build: [{ objectId: "1" }],
                },
                {
                    modelRels: [{ target: "3D/Textures/atlas.png", id: "rel0", type: "texture" }],
                    texture: {
                        "3D/Textures/atlas.png": new Uint8Array([1, 2, 3]).buffer,
                    },
                },
            ),
        );

        expect(group).toBeInstanceOf(THREE.Group);
        expect(group.children.length).toBeGreaterThan(0);
    });

    test("warns with a builder-facing message for unsupported resource ids", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const group = fast3mfBuilder({
            rels: [{ target: "/3D/3dmodel.model" }],
            modelRels: [],
            model: {
                "3D/3dmodel.model": {
                    resources: {
                        object: {
                            "1": {
                                id: "1",
                                pid: "ext1",
                                mesh: {
                                    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
                                    triangles: new Uint32Array([0, 1, 2]),
                                    triangleProperties: [{ pid: "ext1" }],
                                },
                                components: [],
                            },
                        },
                        basematerials: {},
                        texture2d: {},
                        colorgroup: {},
                        texture2dgroup: {},
                        pbmetallicdisplayproperties: {},
                    },
                    build: [{ objectId: "1" }],
                },
            },
            printTicket: {},
            texture: {},
        } as any);

        expect(group).toBeInstanceOf(THREE.Group);
        expect(warnSpy).toHaveBeenCalledWith("fast3mfBuilder: Unsupported resource type for pid `ext1`.");
        expect(errorSpy).not.toHaveBeenCalled();
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

    test("builds nested same-model component content with visible meshes", async () => {
        const { createSameModelComponentArchive } = await import("./helpers/component-archive");
        const loader = new Fast3MFLoader();
        const data = await loader.parse(createSameModelComponentArchive());
        const group = fast3mfBuilder(data);

        expect(group.children.length).toBeGreaterThan(0);
        expect(collectMeshes(group).length).toBeGreaterThan(0);
    });

    test("builds a mesh from a production-extension component path", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(createProductionComponentArchive());
        const rootObject = data.model["3D/3dmodel.model"].resources.object["2"];

        expect(rootObject.components[0]?.path).toBe("/3D/Objects/object_1.model");
        expect(rootObject.components[0]?.objectId).toBe("1");

        const group = fast3mfBuilder(data);
        const meshes = collectMeshes(group);

        expect(meshes).toHaveLength(1);
        expect(meshes[0].geometry.getAttribute("position").count).toBe(3);
    });
});

function createProductionComponentArchive() {
    const rootModel = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">
    <resources>
        <object id="2" type="model">
            <components>
                <component p:path="/3D/Objects/object_1.model" objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0" />
            </components>
        </object>
    </resources>
    <build>
        <item objectid="2" />
    </build>
</model>`;
    const childModel = `<?xml version="1.0" encoding="UTF-8"?>
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
    <build />
</model>`;
    const archive = {
        "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`),
        "3D/_rels/3dmodel.model.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Target="/3D/Objects/object_1.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`),
        "3D/3dmodel.model": strToU8(rootModel),
        "3D/Objects/object_1.model": strToU8(childModel),
    };
    const zipped = zipSync(archive);
    return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
}

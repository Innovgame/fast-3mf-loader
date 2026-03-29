import { strToU8, zipSync } from "fflate";
import { describe, expect, test } from "vitest";
import "./helpers/mock-inline-workers";
import { readFixture } from "./helpers/read-fixture";

const { Fast3MFLoader } = await import("../lib/main");

function createArchive(options: {
        rels: string;
        model: string;
        modelRels?: string;
        textures?: Record<string, string>;
}) {
        const archive: Record<string, Uint8Array> = {
                "_rels/.rels": strToU8(options.rels),
                "3D/3dmodel.model": strToU8(options.model),
        };

        if (options.modelRels) {
                archive["3D/_rels/3dmodel.model.rels"] = strToU8(options.modelRels);
        }

        for (const [path, content] of Object.entries(options.textures ?? {})) {
                archive[path] = strToU8(content);
        }

        const zipped = zipSync(archive);
        return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
}

function createMinimalModelXml() {
        return `<?xml version="1.0" encoding="UTF-8"?>
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
}

describe("Fast3MFLoader.parse", () => {
    test("parses cube_gears.3mf", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("cube_gears.3mf"));

        expect(data).toBeDefined();
        expect(Object.keys(data!.model).length).toBeGreaterThan(0);
        expect(data!.rels.length).toBeGreaterThan(0);
    });

    test("parses multipletextures.3mf with embedded texture payloads", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("multipletextures.3mf"));

        expect(Object.keys(data!.texture).length).toBeGreaterThan(0);
    });

    test("parses truck.3mf with multiple objects or components", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("truck.3mf"));
        const objectValues = Object.values(data!.model).flatMap((model) => Object.values(model.resources.object));
        const hasComponents = objectValues.some((object) => object.components.length > 0);

        expect(objectValues.length).toBeGreaterThan(1);
        expect(hasComponents).toBe(true);
    });

    test("parses volumetric.3mf without throwing", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(await readFixture("volumetric.3mf"));

        expect(data).toBeDefined();
        expect(Object.keys(data!.model).length).toBeGreaterThan(0);
    });

    test("parses root relationship files that use single-quoted XML attributes", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(
            createArchive({
                rels: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target='/3D/3dmodel.model' Id='rel0' Type='http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel' />
</Relationships>`,
                model: createMinimalModelXml(),
            }),
        );

        expect(data.rels).toEqual([
            {
                target: "/3D/3dmodel.model",
                id: "rel0",
                type: "http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel",
            },
        ]);
    });

    test("parses model relationship files that use single-quoted XML attributes", async () => {
        const loader = new Fast3MFLoader();
        const data = await loader.parse(
            createArchive({
                rels: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target='/3D/3dmodel.model' Id='rel0' Type='http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel' />
</Relationships>`,
                model: createMinimalModelXml(),
                modelRels: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target='/3D/Textures/atlas.png' Id='tex0' Type='texture' />
</Relationships>`,
                textures: {
                    "3D/Textures/atlas.png": "png-binary-placeholder",
                },
            }),
        );

        expect(data.modelRels).toEqual([
            {
                target: "/3D/Textures/atlas.png",
                id: "tex0",
                type: "texture",
            },
        ]);
    });
});

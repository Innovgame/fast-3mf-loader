import { strToU8, zipSync } from "fflate";
import { Box3, Mesh } from "three";
import { describe, expect, test } from "vitest";
import "./helpers/mock-inline-workers";
import type { ParseResult } from "../src/index";

const { Fast3MFLoader, fast3mfBuilder } = await import("../src/index");
const productionUri = "http://schemas.microsoft.com/3dmanufacturing/production/2015/06";
const childPath = "/3D/Objects/child.model";

function meshObject(offset: number) {
    return `<object id="1" type="model"><mesh><vertices>
        <vertex x="${offset}" y="${offset}" z="${offset}" />
        <vertex x="${offset + 1}" y="${offset}" z="${offset}" />
        <vertex x="${offset}" y="${offset + 1}" z="${offset}" />
    </vertices><triangles><triangle v1="0" v2="1" v3="2" /></triangles></mesh></object>`;
}

function createArchive({
    declarations = `xmlns:p="${productionUri}"`,
    components = `<component objectid="1" p:path="${childPath}" />`,
    componentsDeclarations = "",
    build = '<item objectid="2" />',
    extraObjects = "",
} = {}) {
    const model = (
        resources: string,
        buildItems: string,
        namespaces = "",
    ) => `<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" ${namespaces}>
        <resources>${resources}</resources><build>${buildItems}</build></model>`;
    const zipped = zipSync({
        "_rels/.rels": strToU8(
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="root" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" /></Relationships>',
        ),
        "3D/_rels/3dmodel.model.rels": strToU8(
            `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="${childPath}" Id="child" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" /></Relationships>`,
        ),
        "3D/3dmodel.model": strToU8(
            model(
                `${meshObject(10)}<object id="2" type="model"><components ${componentsDeclarations}>${components}</components></object>${extraObjects}`,
                build,
                declarations,
            ),
        ),
        "3D/Objects/child.model": strToU8(model(meshObject(0), "")),
    });
    return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength);
}

function expectChildGeometry(data: ParseResult) {
    const group = fast3mfBuilder(data);
    const meshes: Mesh[] = [];
    group.traverse((object) => {
        if (object instanceof Mesh) meshes.push(object);
    });
    expect(meshes).toHaveLength(1);
    expect(meshes[0].geometry.getAttribute("position").count).toBe(3);
    const bounds = new Box3().setFromObject(group);
    expect(bounds.min.toArray()).toEqual([0, 0, 0]);
    expect(bounds.max.toArray()).toEqual([1, 1, 0]);
}

describe("Production namespace paths", () => {
    test.each(["&#54;", "&#x36;"])("normalizes XML entities in namespace declarations (%s)", async (entity) => {
        const data = await new Fast3MFLoader().parse(
            createArchive({
                declarations: `xmlns:p="${productionUri.slice(0, -1)}${entity}"`,
            }),
        );
        expectChildGeometry(data);
    });

    test("ignores a foreign path before the Production path", async () => {
        const data = await new Fast3MFLoader().parse(
            createArchive({
                declarations: `xmlns:audit="urn:metadata" xmlns:p="${productionUri}"`,
                components: `<component objectid="1" audit:path="/foreign.model" p:path="${childPath}" />`,
            }),
        );
        expect(data.model["3D/3dmodel.model"].resources.object["2"].components[0].path).toBe(childPath);
        expectChildGeometry(data);
    });

    test.each(["p", "production", "other"])("resolves the namespace URI independently of prefix %s", async (prefix) => {
        const data = await new Fast3MFLoader().parse(
            createArchive({
                declarations: `xmlns:${prefix}="${productionUri}"`,
                components: `<component objectid="1" ${prefix}:path="${childPath}" />`,
            }),
        );
        expectChildGeometry(data);
    });

    test("accepts Production declarations inherited from an intermediate element", async () => {
        const data = await new Fast3MFLoader().parse(
            createArchive({
                declarations: 'xmlns:p="urn:metadata"',
                componentsDeclarations: `xmlns:p="${productionUri}"`,
            }),
        );
        expectChildGeometry(data);
    });

    test("ignores an unrelated namespace even when its prefix is p", async () => {
        const data = await new Fast3MFLoader().parse(createArchive({ declarations: 'xmlns:p="urn:metadata"' }));
        expect(data.model["3D/3dmodel.model"].resources.object["2"].components[0].path).toBeUndefined();
        expect(new Box3().setFromObject(fast3mfBuilder(data)).min.toArray()).toEqual([10, 10, 10]);
    });

    test("restores inherited namespaces after self-closing component declarations", async () => {
        const data = await new Fast3MFLoader().parse(
            createArchive({
                declarations: `xmlns:p="${productionUri}" xmlns:q="urn:metadata"`,
                components: `
            <component objectid="1" xmlns:p="urn:metadata" p:path="/foreign.model" />
            <component objectid="1" p:path="${childPath}" />
            <component objectid="1" xmlns:q="${productionUri}" q:path="${childPath}" />
            <component objectid="1" q:path="/undeclared.model" />`,
            }),
        );
        expect(data.model["3D/3dmodel.model"].resources.object["2"].components.map((component) => component.path)).toEqual([
            undefined,
            childPath,
            childPath,
            undefined,
        ]);
    });

    test("restores a rebound prefix when its containing element closes", async () => {
        const data = await new Fast3MFLoader().parse(
            createArchive({
                componentsDeclarations: 'xmlns:p="urn:metadata"',
                components: '<component objectid="1" p:path="/foreign.model" />',
                extraObjects: `<object id="3" type="model"><components><component objectid="1" p:path="${childPath}" /></components></object>`,
            }),
        );
        const objects = data.model["3D/3dmodel.model"].resources.object;
        expect(objects["2"].components[0].path).toBeUndefined();
        expect(objects["3"].components[0].path).toBe(childPath);
    });

    test("keeps an unqualified path compatible with previous behavior", async () => {
        const data = await new Fast3MFLoader().parse(
            createArchive({
                declarations: 'xmlns:audit="urn:metadata"',
                components: `<component objectid="1" audit:path="/foreign.model" path="${childPath}" />`,
            }),
        );
        expectChildGeometry(data);
    });

    test("preserves explicit unqualified path precedence when both forms are present", async () => {
        const data = await new Fast3MFLoader().parse(
            createArchive({
                components: '<component objectid="1" path="Objects/child.model" p:path="/foreign.model" />',
            }),
        );
        expect(data.model["3D/3dmodel.model"].resources.object["2"].components[0].path).toBe("Objects/child.model");
        expectChildGeometry(data);
    });

    test("restores namespace bindings after an explicitly closed component", async () => {
        const data = await new Fast3MFLoader().parse(
            createArchive({
                components: `
            <component objectid="1" xmlns:p="urn:metadata" p:path="/foreign.model"></component>
            <component objectid="1" p:path="${childPath}"></component>`,
            }),
        );
        expect(data.model["3D/3dmodel.model"].resources.object["2"].components.map((component) => component.path)).toEqual([undefined, childPath]);
    });

    test("applies the same namespace filtering to build items", async () => {
        const data = await new Fast3MFLoader().parse(
            createArchive({
                declarations: `xmlns:audit="urn:metadata" xmlns:p="${productionUri}"`,
                build: `<item objectid="1" audit:path="/foreign.model" p:path="${childPath}" />`,
            }),
        );
        expect(data.model["3D/3dmodel.model"].build[0].path).toBe(childPath);
        expectChildGeometry(data);
    });
});

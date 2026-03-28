import EasySAXParser from "easysax";
import { parse } from "./parse";
import type { ParsedColorGroupType, ParsedModelPart, ParsedObjectType, ParsedTexture2dGroupType } from "./util";

export async function parseModelBuffer(data: Uint8Array<ArrayBuffer>) {
    const easysaxParser = new EasySAXParser({ autoEntity: false });
    const textDecoder = new TextDecoder();
    const blob = new Blob([data]);
    const stream = blob.stream();
    const reader = stream.getReader();

    const state = await parse(easysaxParser, async function () {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            easysaxParser.write(textDecoder.decode(value));
        }
    });

    const transfer: Transferable[] = [];

    const { current, ...parsedState } = state;
    const parsedObjects: Record<string, ParsedObjectType> = {};
    const parsedTextureGroups: Record<string, ParsedTexture2dGroupType> = {};
    const parsedColorGroups: Record<string, ParsedColorGroupType> = {};

    for (const key in state.resources.object) {
        if (!Object.hasOwn(state.resources.object, key)) continue;
        const object = state.resources.object[key];
        const vertices = new Float32Array(object.mesh.vertices);
        const triangles = new Uint32Array(object.mesh.triangles);
        transfer.push(vertices.buffer, triangles.buffer);

        parsedObjects[key] = {
            ...object,
            mesh: {
                ...object.mesh,
                vertices,
                triangles,
            },
        };
    }

    for (const key in state.resources.texture2dgroup) {
        if (!Object.hasOwn(state.resources.texture2dgroup, key)) continue;
        const texture2dcoord = state.resources.texture2dgroup[key];
        const uvs = new Float32Array(texture2dcoord.uvs);
        transfer.push(uvs.buffer);
        parsedTextureGroups[key] = {
            ...texture2dcoord,
            uvs,
        };
    }

    for (const key in state.resources.colorgroup) {
        if (!Object.hasOwn(state.resources.colorgroup, key)) continue;
        const colorgroup = state.resources.colorgroup[key];
        const colors = new Float32Array(colorgroup.colors);
        transfer.push(colors.buffer);
        parsedColorGroups[key] = {
            ...colorgroup,
            colors,
        };
    }

    return {
        state: {
            ...parsedState,
            resources: {
                ...parsedState.resources,
                object: parsedObjects,
                texture2dgroup: parsedTextureGroups,
                colorgroup: parsedColorGroups,
            },
        } satisfies ParsedModelPart,
        transfer,
    };
}

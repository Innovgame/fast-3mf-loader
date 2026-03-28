// @ts-ignore
import EasySAXParser from "easysax";
import { parse } from "./parse";

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

    for (const key in state.resources.object) {
        if (!Object.hasOwn(state.resources.object, key)) continue;
        const object = state.resources.object[key];
        if (object.mesh.vertices.length > 0) {
            const vs = new Float32Array(object.mesh.vertices);
            object.mesh.vertices = vs as any;
            transfer.push(vs.buffer);
        }

        if (object.mesh.triangles.length > 0) {
            const fs = new Uint32Array(object.mesh.triangles);
            object.mesh.triangles = fs as any;
            transfer.push(fs.buffer);
        }
    }

    for (const key in state.resources.texture2dgroup) {
        if (!Object.hasOwn(state.resources.texture2dgroup, key)) continue;
        const texture2dcoord = state.resources.texture2dgroup[key];
        if (texture2dcoord.uvs.length > 0) {
            const vs = new Float32Array(texture2dcoord.uvs);
            texture2dcoord.uvs = vs as any;
            transfer.push(vs.buffer);
        }
    }

    for (const key in state.resources.colorgroup) {
        if (!Object.hasOwn(state.resources.colorgroup, key)) continue;
        const colorgroup = state.resources.colorgroup[key];
        if (colorgroup.colors.length > 0) {
            const vs = new Float32Array(colorgroup.colors);
            colorgroup.colors = vs as any;
            transfer.push(vs.buffer);
        }
    }

    // @ts-ignore
    delete state["current"];

    return {
        state,
        transfer,
    };
}

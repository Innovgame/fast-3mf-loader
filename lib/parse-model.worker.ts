// @ts-ignore
import EasySAXParser from "easysax";
import { parse } from "./parse";

const easysaxParser = new EasySAXParser({ autoEntity: false });
const textDecoder = new TextDecoder();

onmessage = async (event: MessageEvent<Uint8Array<ArrayBuffer>>) => {
    const data = event.data;

    const blob = new Blob([data]);
    const stream = blob.stream();
    const reader = stream.getReader();

    const size = data.byteLength / 1024 / 1024;
    console.log(`xml size: ${size} MB`);

    // console.time("decode-xml");
    // const fileText = textDecoder.decode(data);
    // console.timeEnd("decode-xml");

    try {
        const transfer: Transferable[] = [];
        const state = await parse(easysaxParser, async function () {
            console.time("easysax-start");
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                easysaxParser.write(textDecoder.decode(value));
            }
            console.timeEnd("easysax-start");
        });

        // vs, fs
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

        // uvs
        for (const key in state.resources.texture2dgroup) {
            if (!Object.hasOwn(state.resources.texture2dgroup, key)) continue;
            const texture2dcoord = state.resources.texture2dgroup[key];
            if (texture2dcoord.uvs.length > 0) {
                const vs = new Float32Array(texture2dcoord.uvs);
                texture2dcoord.uvs = vs as any;
                transfer.push(vs.buffer);
            }
        }

        // colors
        for (const key in state.resources.colorgroup) {
            if (!Object.hasOwn(state.resources.colorgroup, key)) continue;
            const colorgroup = state.resources.colorgroup[key];
            if (colorgroup.colors.length > 0) {
                const vs = new Float32Array(colorgroup.colors);
                colorgroup.colors = vs as any;
                transfer.push(vs.buffer);
            }
        }

        // debugger;
        // @ts-ignore
        delete state["current"];
        postMessage({ type: "done", state }, { transfer: transfer });
    } catch (error: any) {
        postMessage({ type: "error", message: error?.message ?? "fflate missing and file is compressed." });
    }
};

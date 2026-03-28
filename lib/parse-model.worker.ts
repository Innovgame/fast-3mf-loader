import { parseModelBuffer } from "./parse-model";

onmessage = async (event: MessageEvent<Uint8Array<ArrayBuffer>>) => {
    const data = event.data;

    try {
        const { state, transfer } = await parseModelBuffer(data);
        postMessage({ type: "done", state }, { transfer: transfer });
    } catch (error: any) {
        postMessage({ type: "error", message: error?.message ?? "fflate missing and file is compressed." });
    }
};

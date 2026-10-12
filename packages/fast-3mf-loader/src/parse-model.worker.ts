import { parseModelBuffer } from "./parse-model";

function toParseModelWorkerErrorMessage(error: unknown) {
    const raw = error instanceof Error ? error.message : String(error);
    return raw && raw !== "undefined" ? raw : "Failed to parse 3MF model part.";
}

onmessage = async (event: MessageEvent<Uint8Array<ArrayBuffer>>) => {
    const data = event.data;

    try {
        const { state, transfer } = await parseModelBuffer(data);
        postMessage({ type: "done", state }, { transfer: transfer });
    } catch (error: unknown) {
        postMessage({ type: "error", message: toParseModelWorkerErrorMessage(error) });
    }
};

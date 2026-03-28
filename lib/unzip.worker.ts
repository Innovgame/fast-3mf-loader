import { unzipBuffer } from "./unzip";

onmessage = (event: MessageEvent<ArrayBuffer>) => {
    const buffer = event.data;

    try {
        const zip = unzipBuffer(buffer);
        const transfer: Transferable[] = [];
        for (const key in zip) {
            if (!Object.hasOwn(zip, key)) continue;
            const file = zip[key];
            transfer.push(file.buffer);
        }
        postMessage({ type: "done", zip }, { transfer: transfer });
    } catch (error: unknown) {
        postMessage({
            type: "error",
            message: error instanceof Error ? error.message : "Failed to unzip 3MF archive.",
        });
    }
};

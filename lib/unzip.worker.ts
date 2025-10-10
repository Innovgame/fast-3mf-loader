import { unzipSync } from "fflate";

onmessage = (event: MessageEvent<ArrayBuffer>) => {
    const buffer = event.data;

    try {
        const zip = unzipSync(new Uint8Array(buffer));
        const transfer: Transferable[] = [];
        for (const key in zip) {
            if (!Object.hasOwn(zip, key)) continue;
            const file = zip[key];
            transfer.push(file.buffer);
        }
        postMessage(zip, { transfer: transfer });
    } catch (error) {
        console.error("fflate missing and file is compressed.");
    }
};

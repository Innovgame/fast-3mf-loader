import { unzipSync, type Unzipped } from "fflate";

export function unzipBuffer(buffer: ArrayBuffer): Unzipped {
    return unzipSync(new Uint8Array(buffer));
}

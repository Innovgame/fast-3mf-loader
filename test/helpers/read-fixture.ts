import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function readFixture(name: string): Promise<ArrayBuffer> {
    const file = await readFile(resolve(process.cwd(), "3mf", name));
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
}

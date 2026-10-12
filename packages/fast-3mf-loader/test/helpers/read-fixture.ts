import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

export async function readFixture(name: string): Promise<ArrayBuffer> {
    const file = await readFile(resolve(repoRoot, "3mf", name));
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
}

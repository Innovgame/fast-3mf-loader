import { performance } from "node:perf_hooks";

export function installNodeTextureLoaderFallback({
    TextureLoader,
    Texture,
    document = globalThis.document,
}) {
    if (typeof document !== "undefined") {
        return () => {};
    }

    const originalLoad = TextureLoader.prototype.load;
    TextureLoader.prototype.load = function (_url, onLoad) {
        const texture = new Texture();
        onLoad?.(texture);
        return texture;
    };

    return () => {
        TextureLoader.prototype.load = originalLoad;
    };
}

export async function measureFixture({
    fixtureName,
    fixtureBytes,
    workerCount,
    Fast3MFLoader,
    fast3mfBuilder,
    now = () => performance.now(),
}) {
    const loader = new Fast3MFLoader();
    const input = fixtureBytes.slice().buffer;

    const parseStart = now();
    const parsed = await loader.parse(input, {
        onProgress() {},
        workerCount,
    });
    const parseMs = now() - parseStart;

    const buildStart = now();
    const group = fast3mfBuilder(parsed);
    const buildMs = now() - buildStart;

    return {
        fixture: fixtureName,
        sizeKiB: fixtureBytes.byteLength / 1024,
        parseMs,
        buildMs,
        totalMs: parseMs + buildMs,
        models: Object.keys(parsed.model).length,
        children: group.children.length,
    };
}

export function summarizeRows(rows) {
    return rows.map((row) => ({
        Fixture: row.fixture,
        "Size (KiB)": row.sizeKiB.toFixed(1),
        "Parse (ms)": row.parseMs.toFixed(1),
        "Build (ms)": row.buildMs.toFixed(1),
        "Total (ms)": row.totalMs.toFixed(1),
        Models: String(row.models),
        Children: String(row.children),
    }));
}

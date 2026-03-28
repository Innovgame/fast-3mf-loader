export type BenchmarkRow = {
    fixture: string;
    sizeKiB: number;
    parseMs: number;
    buildMs: number;
    totalMs: number;
    models: number;
    children: number;
};

export type BenchmarkAggregateRow = BenchmarkRow & {
    parseRangeMs: [number, number];
    buildRangeMs: [number, number];
    totalRangeMs: [number, number];
    runs: number;
};

export type BenchmarkConfig = {
    warmupRuns: number;
    measuredRuns: number;
    workerCount: number;
};

export type BenchmarkSummaryRow = {
    Fixture: string;
    "Size (KiB)": string;
    "Parse (ms)": string;
    "Build (ms)": string;
    "Total (ms)": string;
    Models: string;
    Children: string;
};

export function installNodeTextureLoaderFallback<TTexture>({
    TextureLoader,
    Texture,
    document,
}: {
    TextureLoader: {
        prototype: {
            load: (url?: string, onLoad?: (texture: TTexture) => void) => unknown;
        };
    };
    Texture: new () => TTexture;
    document?: Document | undefined;
}): () => void;

export function measureFixture<TParsed extends { model: Record<string, unknown> }, TGroup extends { children: ArrayLike<unknown> }>({
    fixtureName,
    fixtureBytes,
    workerCount,
    Fast3MFLoader,
    fast3mfBuilder,
    now,
}: {
    fixtureName: string;
    fixtureBytes: Uint8Array;
    workerCount: number;
    Fast3MFLoader: new () => {
        parse: (
            input: ArrayBuffer,
            options: {
                onProgress(): void;
                workerCount: number;
            },
        ) => Promise<TParsed>;
    };
    fast3mfBuilder: (parsed: TParsed) => TGroup;
    now?: () => number;
}): Promise<BenchmarkRow>;

export function resolveBenchmarkConfig({
    hardwareConcurrency,
    env,
}: {
    hardwareConcurrency: number;
    env?: Record<string, string | undefined>;
}): BenchmarkConfig;
export function summarizeFixtureMeasurements(rows: BenchmarkRow[]): BenchmarkAggregateRow;
export function summarizeRows(rows: BenchmarkRow[]): BenchmarkSummaryRow[];

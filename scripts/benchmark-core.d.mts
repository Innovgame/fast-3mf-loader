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

export type BenchmarkStatus = "ok" | "unsupported" | "failed";

export type ThreeBenchmarkRow =
    | {
          fixture: string;
          sizeKiB: number;
          parseMs: number;
          buildMs: number;
          totalMs: number;
          children: number;
          status: "ok";
      }
    | {
          fixture: string;
          sizeKiB: number;
          status: "unsupported" | "failed";
          detail: string;
      };

export type ThreeBenchmarkAggregateRow =
    | {
          fixture: string;
          sizeKiB: number;
          parseMs: number;
          buildMs: number;
          totalMs: number;
          children: number;
          parseRangeMs: [number, number];
          buildRangeMs: [number, number];
          totalRangeMs: [number, number];
          runs: number;
          status: "ok";
      }
    | {
          fixture: string;
          sizeKiB: number;
          status: "unsupported" | "failed";
          detail: string;
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

export type BenchmarkComparisonRow = {
    fixture: string;
    sizeKiB: number;
    fast: BenchmarkAggregateRow;
    three: ThreeBenchmarkAggregateRow;
};

export type BenchmarkComparisonSummaryRow = {
    Fixture: string;
    "Size (KiB)": string;
    "fast Parse": string;
    "fast Build": string;
    "fast Total": string;
    "three Parse": string;
    "three Build": string;
    "three Total": string;
    Status: string;
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
export function measureComparisonFixture<TFastMeasurement, TThreeMeasurement extends { status: "ok" | "unsupported" | "failed" }>({
    fixtureName,
    measuredRuns,
    measureFastFixture,
    measureThreeFixture,
}: {
    fixtureName: string;
    measuredRuns: number;
    measureFastFixture: (context: { fixtureName: string; runIndex: number }) => Promise<TFastMeasurement>;
    measureThreeFixture: (context: { fixtureName: string; runIndex: number }) => TThreeMeasurement;
}): Promise<{
    fastMeasurements: TFastMeasurement[];
    threeMeasurements: TThreeMeasurement[];
}>;

export function resolveBenchmarkConfig({
    hardwareConcurrency,
    env,
}: {
    hardwareConcurrency: number;
    env?: Record<string, string | undefined>;
}): BenchmarkConfig;
export function classifyThreeBenchmarkError(error: unknown): {
    status: "unsupported" | "failed";
    detail: string;
};
export function summarizeFixtureMeasurements(rows: BenchmarkRow[]): BenchmarkAggregateRow;
export function summarizeThreeMeasurements(rows: ThreeBenchmarkRow[]): ThreeBenchmarkAggregateRow;
export function summarizeComparisonRows(rows: BenchmarkComparisonRow[]): BenchmarkComparisonSummaryRow[];
export function summarizeRows(rows: BenchmarkRow[]): BenchmarkSummaryRow[];

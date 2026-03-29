import type { BenchmarkStatus } from "./benchmark-core.d.mts";

export type ThreeBenchmarkAdapterRow =
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
          status: Exclude<BenchmarkStatus, "ok">;
          detail: string;
      };

export function installThreeBenchmarkAdapter(options?: {
    DOMParserClass?: new () => unknown;
}): {
    ThreeMFLoader: new () => {
        parse(input: ArrayBuffer): unknown;
    };
    createDomParserProvider(): {
        DOMParserClass: new () => {
            parseFromString(input: string, mimeType: string): {
                querySelectorAll?: (selector: string) => ArrayLike<unknown>;
            };
        };
        dispose(): void;
    };
    restore(): void;
};

export function measureThreeFixture({
    fixtureName,
    fixtureBytes,
    now,
    ThreeMFLoaderClass,
    createDomParserProvider,
}: {
    fixtureName: string;
    fixtureBytes: Uint8Array;
    now?: () => number;
    ThreeMFLoaderClass?: new () => {
        parse(input: ArrayBuffer): unknown;
    };
    createDomParserProvider?: () => {
        DOMParserClass: new () => {
            parseFromString(input: string, mimeType: string): {
                querySelectorAll?: (selector: string) => ArrayLike<unknown>;
            };
        };
        dispose(): void;
    };
}): ThreeBenchmarkAdapterRow;

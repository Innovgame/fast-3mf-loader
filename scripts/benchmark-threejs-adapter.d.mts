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

export function installThreeBenchmarkAdapter(): {
    ThreeMFLoader: new () => {
        parse(input: ArrayBuffer): unknown;
    };
    restore(): void;
};

export function measureThreeFixture({
    fixtureName,
    fixtureBytes,
    now,
    ThreeMFLoaderClass,
}: {
    fixtureName: string;
    fixtureBytes: Uint8Array;
    now?: () => number;
    ThreeMFLoaderClass?: new () => {
        parse(input: ArrayBuffer): unknown;
    };
}): ThreeBenchmarkAdapterRow;

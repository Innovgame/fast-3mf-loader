import { afterEach, expect, test, vi } from "vitest";
import "./helpers/mock-inline-workers";
import { readFixture } from "./helpers/read-fixture";

const { Fast3MFLoader } = await import("../lib/main");
const { resolveWorkerCount } = await import("../lib/fast-3mf-loader");

afterEach(() => {
    vi.restoreAllMocks();
});

test("resolveWorkerCount documents the browser-first fallback strategy", () => {
    expect(resolveWorkerCount(undefined, Number.NaN)).toBe(4);
    expect(resolveWorkerCount(undefined, 1)).toBe(1);
    expect(resolveWorkerCount(undefined, 10)).toBe(9);
    expect(resolveWorkerCount(undefined, 32)).toBe(15);
    expect(resolveWorkerCount(3, 32)).toBe(3);
});

test("parse does not emit timing logs during successful parsing", async () => {
    const timeSpy = vi.spyOn(console, "time").mockImplementation(() => {});
    const timeEndSpy = vi.spyOn(console, "timeEnd").mockImplementation(() => {});
    const loader = new Fast3MFLoader();

    await loader.parse(await readFixture("cube_gears.3mf"));

    expect(timeSpy).not.toHaveBeenCalled();
    expect(timeEndSpy).not.toHaveBeenCalled();
});

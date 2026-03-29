import { afterEach, describe, expect, test, vi } from "vitest";
import { dispatchParseEvent } from "../lib/parse-dispatch";
import { makeModelsStateExtras } from "../lib/util";

describe("parse-dispatch", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("object end 事件会清理当前 object 状态", () => {
        const state = makeModelsStateExtras();
        state.current.currentObjectId = "12";

        dispatchParseEvent(state, {
            kind: "end",
            tagName: "object",
            empty: false,
            getStringNode: () => "</object>",
        });

        expect(state.current.currentObjectId).toBeUndefined();
    });

    test("metadata text 事件会写入 metadata", () => {
        const state = makeModelsStateExtras();

        dispatchParseEvent(state, {
            kind: "text",
            tagName: "metadata",
            text: "Fast 3MF",
            metadataName: "Title",
        });

        expect(state.metadata).toEqual({ Title: "Fast 3MF" });
    });

    test("未知单位会发出 loader-facing warning 并回退到 millimeter", () => {
        const state = makeModelsStateExtras();
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        dispatchParseEvent(state, {
            kind: "start",
            tagName: "model",
            empty: false,
            getStringNode: () => "<model unit=\"parsec\">",
            getAttr: () => ({
                unit: "parsec",
            }),
        });

        expect(warnSpy).toHaveBeenCalledWith("Fast3MFLoader: Unrecognised model unit `parsec`. Assuming millimeter.");
        expect(state.transform?.scale).toEqual([1, 1, 1]);
    });
});

import { describe, expect, test } from "vitest";
import { dispatchParseEvent } from "../lib/parse-dispatch";
import { makeModelsStateExtras } from "../lib/util";

describe("parse-dispatch", () => {
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
});

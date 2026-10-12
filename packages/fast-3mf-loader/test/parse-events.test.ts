import { describe, expect, test } from "vitest";
import { createParseEventRuntime, toEndEvent, toStartEvent, toTextEvent } from "../lib/parse-events";

describe("parse-events", () => {
    test("metadata 文本事件会继承最近一次 metadata 的名称", () => {
        const runtime = createParseEventRuntime();

        const startEvent = toStartEvent(runtime, "metadata", () => ({ name: "Title" }), false, () => "<metadata name=\"Title\">");
        const textEvent = toTextEvent(runtime, "Hello");
        const endEvent = toEndEvent(runtime, "metadata", false, () => "</metadata>");
        const afterEndText = toTextEvent(runtime, "Ignored");

        expect(startEvent.metadataName).toBe("Title");
        expect(textEvent).toEqual({
            kind: "text",
            tagName: "metadata",
            text: "Hello",
            metadataName: "Title",
        });
        expect(endEvent.metadataName).toBe("Title");
        expect(afterEndText).toBeUndefined();
    });
});

import type { SAXGetAttr, SAXGetStringNode } from "easysax";

export type ParseEventRuntime = {
    currentTagName?: string;
    currentMetadataName?: string;
};

export type ParseStartEvent = {
    kind: "start";
    tagName: string;
    empty: boolean;
    getAttr?: SAXGetAttr;
    getStringNode?: SAXGetStringNode;
    metadataName?: string;
};

export type ParseEndEvent = {
    kind: "end";
    tagName: string;
    empty: boolean;
    getStringNode?: SAXGetStringNode;
    metadataName?: string;
};

export type ParseTextEvent = {
    kind: "text";
    tagName: string;
    text: string;
    metadataName?: string;
};

export type ParseEvent = ParseStartEvent | ParseEndEvent | ParseTextEvent;

export function createParseEventRuntime(): ParseEventRuntime {
    return {};
}

export function toStartEvent(
    runtime: ParseEventRuntime,
    elementName: string,
    getAttr?: SAXGetAttr,
    isTagEnd = false,
    getStringNode?: SAXGetStringNode,
): ParseStartEvent {
    if (elementName === "metadata") {
        runtime.currentMetadataName = getAttr?.()?.["name"] as string | undefined;
    }

    runtime.currentTagName = elementName;

    return {
        kind: "start",
        tagName: elementName,
        empty: isTagEnd,
        getAttr,
        getStringNode,
        metadataName: runtime.currentMetadataName,
    };
}

export function toEndEvent(
    runtime: ParseEventRuntime,
    elementName: string,
    isTagStart = false,
    getStringNode?: SAXGetStringNode,
): ParseEndEvent {
    const event: ParseEndEvent = {
        kind: "end",
        tagName: elementName,
        empty: isTagStart,
        getStringNode,
        metadataName: runtime.currentMetadataName,
    };

    if (elementName === "metadata") {
        runtime.currentMetadataName = undefined;
    }
    runtime.currentTagName = undefined;

    return event;
}

export function toTextEvent(runtime: ParseEventRuntime, text: string): ParseTextEvent | undefined {
    if (!runtime.currentTagName) return;

    return {
        kind: "text",
        tagName: runtime.currentTagName,
        text,
        metadataName: runtime.currentMetadataName,
    };
}

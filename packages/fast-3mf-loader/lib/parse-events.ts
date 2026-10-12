import EasySAXParser, { type SAXGetAttr, type SAXGetStringNode } from "easysax";

export const PRODUCTION_NAMESPACE_URI = "http://schemas.microsoft.com/3dmanufacturing/production/2015/06";

export type ParseEventRuntime = {
    currentTagName?: string;
    currentMetadataName?: string;
    namespaceUris: ReadonlyMap<string, string>;
    namespaceScopes: ReadonlyMap<string, string>[];
};

export type ParseStartEvent = {
    kind: "start";
    tagName: string;
    empty: boolean;
    getAttr?: SAXGetAttr;
    getStringNode?: SAXGetStringNode;
    metadataName?: string;
    namespaceUris?: ReadonlyMap<string, string>;
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
    return { namespaceUris: new Map(), namespaceScopes: [] };
}

export function toStartEvent(
    runtime: ParseEventRuntime,
    elementName: string,
    getAttr?: SAXGetAttr,
    isTagEnd = false,
    getStringNode?: SAXGetStringNode,
): ParseStartEvent {
    const parentNamespaces = runtime.namespaceUris;
    let declarations: Map<string, string> | undefined;
    // Keep the SAX attribute getter lazy on geometry-heavy paths. Only inspect
    // declarations when the raw start tag contains them (or no raw tag is supplied).
    if (!getStringNode || getStringNode().includes("xmlns:")) {
        const attributes = getAttr?.();
        if (attributes) {
            for (const [key, uri] of Object.entries(attributes)) {
                if (!key.startsWith("xmlns:")) continue;
                declarations ??= new Map(parentNamespaces);
                declarations.set(key.slice(6), uri.includes("&") ? EasySAXParser.entityDecode(uri) : uri);
            }
        }
    }
    const namespaces = declarations ?? parentNamespaces;
    if (!isTagEnd) {
        runtime.namespaceScopes.push(parentNamespaces);
        runtime.namespaceUris = namespaces;
    }

    if (elementName === "metadata") {
        runtime.currentMetadataName = getAttr?.()?.["name"] as string | undefined;
    }

    runtime.currentTagName = elementName;

    const event: ParseStartEvent = {
        kind: "start",
        tagName: elementName,
        empty: isTagEnd,
        getAttr,
        getStringNode,
        metadataName: runtime.currentMetadataName,
    };
    if (elementName === "component" || elementName === "item") event.namespaceUris = namespaces;
    return event;
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
    // SAX emits both start and end for an empty element; it has no pushed scope.
    if (!isTagStart) runtime.namespaceUris = runtime.namespaceScopes.pop() ?? new Map();
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

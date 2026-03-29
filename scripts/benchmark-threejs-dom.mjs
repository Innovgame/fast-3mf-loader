import { JSDOM } from "jsdom";

export function probeXmlSelectorSupport({
    xml,
    selector,
    DOMParserClass,
}) {
    const document = new DOMParserClass().parseFromString(xml, "application/xml");
    const supportsQuerySelectorAll = typeof document.querySelectorAll === "function";

    return {
        supportsQuerySelectorAll,
        matchCount: supportsQuerySelectorAll ? document.querySelectorAll(selector).length : null,
    };
}

export function installDomParserPolyfill({
    DOMParserClass,
    target = globalThis,
}) {
    const originalDOMParser = target.DOMParser;
    target.DOMParser = DOMParserClass;

    return () => {
        if (typeof originalDOMParser === "undefined") {
            delete target.DOMParser;
            return;
        }

        target.DOMParser = originalDOMParser;
    };
}

export function createJsdomDomParserProvider() {
    const window = new JSDOM("", { contentType: "text/html" }).window;

    return {
        DOMParserClass: window.DOMParser,
        dispose() {
            window.close();
        },
    };
}

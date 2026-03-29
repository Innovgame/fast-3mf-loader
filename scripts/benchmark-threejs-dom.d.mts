export function probeXmlSelectorSupport({
    xml,
    selector,
    DOMParserClass,
}: {
    xml: string;
    selector: string;
    DOMParserClass: new () => {
        parseFromString(input: string, mimeType: string): {
            querySelectorAll?: (selector: string) => ArrayLike<unknown>;
        };
    };
}): {
    supportsQuerySelectorAll: boolean;
    matchCount: number | null;
};

export function installDomParserPolyfill({
    DOMParserClass,
    target,
}: {
    DOMParserClass: new () => unknown;
    target?: typeof globalThis;
}): () => void;

export function createJsdomDomParserProvider(): {
    DOMParserClass: new () => {
        parseFromString(input: string, mimeType: string): {
            querySelectorAll?: (selector: string) => ArrayLike<unknown>;
        };
    };
    dispose(): void;
};

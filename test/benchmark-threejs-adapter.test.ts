import { DOMParser as LinkedomDOMParser } from "linkedom";
import { DOMParser as XmldomDOMParser } from "@xmldom/xmldom";
import { JSDOM } from "jsdom";
import { describe, expect, test, vi } from "vitest";

const {
    createJsdomDomParserProvider,
    installDomParserPolyfill,
    probeXmlSelectorSupport,
} = await import("../scripts/benchmark-threejs-dom.mjs");
const { measureThreeFixture } = await import("../scripts/benchmark-threejs-adapter.mjs");

function createNow(values: number[]) {
    let index = 0;
    return () => values[index++] ?? values[values.length - 1];
}

const TEXTURE_GROUP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <m:texture2dgroup id="5" texid="2">
      <m:tex2coord u="0.1" v="0.2" />
    </m:texture2dgroup>
  </resources>
</model>`;

describe("probeXmlSelectorSupport", () => {
    test("shows the current linkedom namespace selector gap", () => {
        expect(
            probeXmlSelectorSupport({
                xml: TEXTURE_GROUP_XML,
                selector: "texture2dgroup",
                DOMParserClass: LinkedomDOMParser,
            }),
        ).toEqual({
            supportsQuerySelectorAll: true,
            matchCount: 0,
        });
    });

    test("shows xmldom does not satisfy the selector contract three.js expects", () => {
        expect(
            probeXmlSelectorSupport({
                xml: TEXTURE_GROUP_XML,
                selector: "texture2dgroup",
                DOMParserClass: XmldomDOMParser,
            }),
        ).toEqual({
            supportsQuerySelectorAll: false,
            matchCount: null,
        });
    });

    test("jsdom can satisfy the selector contract three.js expects", () => {
        const window = new JSDOM("", { contentType: "text/html" }).window;

        expect(
            probeXmlSelectorSupport({
                xml: TEXTURE_GROUP_XML,
                selector: "texture2dgroup",
                DOMParserClass: window.DOMParser,
            }),
        ).toEqual({
            supportsQuerySelectorAll: true,
            matchCount: 1,
        });

        window.close();
    });
});

describe("installDomParserPolyfill", () => {
    test("restores the previous DOMParser after replacing it", () => {
        class FakeDOMParser {
            parseFromString() {
                return {
                    querySelectorAll() {
                        return [{}, {}];
                    },
                };
            }
        }

        const originalDOMParser = globalThis.DOMParser;
        const restore = installDomParserPolyfill({ DOMParserClass: FakeDOMParser });

        expect(globalThis.DOMParser).toBe(FakeDOMParser);

        restore();

        expect(globalThis.DOMParser).toBe(originalDOMParser);
    });

    test("creates and disposes a jsdom-backed DOMParser provider", () => {
        const provider = createJsdomDomParserProvider();

        expect(
            probeXmlSelectorSupport({
                xml: TEXTURE_GROUP_XML,
                selector: "texture2dgroup",
                DOMParserClass: provider.DOMParserClass,
            }),
        ).toEqual({
            supportsQuerySelectorAll: true,
            matchCount: 1,
        });

        provider.dispose();
    });
});

describe("measureThreeFixture", () => {
    test("installs and disposes a DOMParser provider for each parse", () => {
        const originalDOMParser = globalThis.DOMParser;
        const dispose = vi.fn();

        class FakeDOMParser {
            parseFromString() {
                return {
                    querySelectorAll() {
                        return [];
                    },
                };
            }
        }

        const createDomParserProvider = vi.fn(() => ({
            DOMParserClass: FakeDOMParser,
            dispose,
        }));

        class MockThreeMFLoader {
            parse() {
                expect(globalThis.DOMParser).toBe(FakeDOMParser);
                return { children: [{}] };
            }
        }

        const first = measureThreeFixture({
            fixtureName: "truck.3mf",
            fixtureBytes: Uint8Array.from([1, 2, 3]),
            ThreeMFLoaderClass: MockThreeMFLoader,
            createDomParserProvider,
            now: createNow([10, 15]),
        });

        const second = measureThreeFixture({
            fixtureName: "truck.3mf",
            fixtureBytes: Uint8Array.from([1, 2, 3]),
            ThreeMFLoaderClass: MockThreeMFLoader,
            createDomParserProvider,
            now: createNow([20, 28]),
        });

        expect(first.status).toBe("ok");
        expect(second.status).toBe("ok");
        expect(createDomParserProvider).toHaveBeenCalledTimes(2);
        expect(dispose).toHaveBeenCalledTimes(2);
        expect(globalThis.DOMParser).toBe(originalDOMParser);
    });

    test("reports fused parse and total timings when three.js parsing succeeds", () => {
        class MockThreeMFLoader {
            parse() {
                return { children: [{}, {}] };
            }
        }

        const row = measureThreeFixture({
            fixtureName: "truck.3mf",
            fixtureBytes: Uint8Array.from([1, 2, 3]),
            ThreeMFLoaderClass: MockThreeMFLoader,
            now: createNow([10, 32]),
        });

        expect(row).toEqual({
            fixture: "truck.3mf",
            sizeKiB: 3 / 1024,
            parseMs: 22,
            buildMs: 0,
            totalMs: 22,
            children: 2,
            status: "ok",
        });
    });

    test("classifies known three.js support-boundary failures as unsupported", () => {
        class MockThreeMFLoader {
            parse() {
                throw new Error("THREE.3MFLoader: Unsupported resource type.");
            }
        }

        const row = measureThreeFixture({
            fixtureName: "multipletextures.3mf",
            fixtureBytes: Uint8Array.from([1, 2, 3, 4]),
            ThreeMFLoaderClass: MockThreeMFLoader,
        });

        expect(row).toEqual({
            fixture: "multipletextures.3mf",
            sizeKiB: 4 / 1024,
            status: "unsupported",
            detail: "THREE.3MFLoader: Unsupported resource type.",
        });
    });

    test("treats known three.js support-boundary console errors as unsupported", () => {
        class MockThreeMFLoader {
            parse() {
                console.error("THREE.3MFLoader: Unsupported resource type.");
                return { children: [{}] };
            }
        }

        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        const row = measureThreeFixture({
            fixtureName: "multipletextures.3mf",
            fixtureBytes: Uint8Array.from([1, 2, 3, 4]),
            ThreeMFLoaderClass: MockThreeMFLoader,
        });

        expect(row).toEqual({
            fixture: "multipletextures.3mf",
            sizeKiB: 4 / 1024,
            status: "unsupported",
            detail: "THREE.3MFLoader: Unsupported resource type.",
        });

        consoleError.mockRestore();
    });
});

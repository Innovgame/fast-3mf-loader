declare module "easysax" {
    export type SAXAttributes = Record<string, string>;
    export type SAXGetAttr = () => SAXAttributes;
    export type SAXGetStringNode = () => string;

    export default class EasySAXParser {
        constructor(options?: { autoEntity?: boolean; lazy?: boolean });
        on(event: "error", handler: (message: string) => void): void;
        getNodeString(): string;
        on(event: "startNode", handler: (elementName: string, getAttr: SAXGetAttr, isTagEnd: boolean) => void): void;
        on(event: "endNode", handler: (elementName: string, isTagStart: boolean) => void): void;
        on(event: "textNode", handler: (text: string) => void): void;
        write(chunk: string): void;
    }
}

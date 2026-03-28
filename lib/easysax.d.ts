declare module "easysax" {
    export type SAXAttributes = Record<string, string>;
    export type SAXGetAttr = () => SAXAttributes;
    export type SAXGetStringNode = () => string;

    export default class EasySAXParser {
        constructor(options?: { autoEntity?: boolean });
        on(event: "error", handler: (message: string) => void): void;
        on(event: "startNode", handler: (elementName: string, getAttr: SAXGetAttr, isTagEnd: boolean, getStringNode: SAXGetStringNode) => void): void;
        on(event: "endNode", handler: (elementName: string, isTagStart: boolean, getStringNode: SAXGetStringNode) => void): void;
        on(event: "textNode", handler: (text: string) => void): void;
        write(chunk: string): void;
    }
}

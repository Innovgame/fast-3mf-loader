import type EasySAXParser from "easysax";
import { dispatchParseEvent } from "./parse-dispatch";
import { createParseEventRuntime, toEndEvent, toStartEvent, toTextEvent } from "./parse-events";
import type { StateType } from "./util";
import { makeModelsStateExtras } from "./util";

function toParserError(message: unknown): Error {
    return message instanceof Error ? message : new Error(String(message));
}

export function parse(easysaxParser: EasySAXParser, start: () => Promise<void>) {
    return new Promise<StateType>((resolve, reject) => {
        const state = Object.assign({}, makeModelsStateExtras());
        const runtime = createParseEventRuntime();
        let settled = false;

        const rejectOnce = (error: unknown) => {
            if (settled) {
                return;
            }

            settled = true;
            reject(toParserError(error));
        };

        const resolveOnce = () => {
            if (settled) {
                return;
            }

            settled = true;
            resolve(state);
        };

        easysaxParser.on("error", function (message) {
            rejectOnce(message);
        });

        easysaxParser.on("startNode", function (elementName, getAttr, isTagEnd) {
            const nodeString = easysaxParser.getNodeString();
            dispatchParseEvent(state, toStartEvent(runtime, elementName, getAttr, isTagEnd, () => nodeString));
        });

        easysaxParser.on("endNode", function (elementName, isTagStart) {
            const nodeString = easysaxParser.getNodeString();
            dispatchParseEvent(state, toEndEvent(runtime, elementName, isTagStart, () => nodeString));
        });

        easysaxParser.on("textNode", function (text) {
            const event = toTextEvent(runtime, text);
            if (event) {
                dispatchParseEvent(state, event);
            }
        });

        void (async () => {
            try {
                await start();
                resolveOnce();
            } catch (error) {
                rejectOnce(error);
            }

        })();
    });
}

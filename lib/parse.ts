import type EasySAXParser from "easysax";
import { dispatchParseEvent } from "./parse-dispatch";
import { createParseEventRuntime, toEndEvent, toStartEvent, toTextEvent } from "./parse-events";
import { makeModelsStateExtras, StateType } from "./util";

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

        easysaxParser.on("startNode", function (elementName, getAttr, isTagEnd, getStringNode) {
            dispatchParseEvent(state, toStartEvent(runtime, elementName, getAttr, isTagEnd, getStringNode));
        });

        easysaxParser.on("endNode", function (elementName, isTagStart, getStringNode) {
            dispatchParseEvent(state, toEndEvent(runtime, elementName, isTagStart, getStringNode));
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

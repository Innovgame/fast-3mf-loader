import type EasySAXParser from "easysax";
import { dispatchParseEvent } from "./parse-dispatch";
import { createParseEventRuntime, toEndEvent, toStartEvent, toTextEvent } from "./parse-events";
import { makeModelsStateExtras, StateType } from "./util";

export function parse(easysaxParser: EasySAXParser, start: () => Promise<void>) {
    return new Promise<StateType>(async (resolve, reject) => {
        const state = Object.assign({}, makeModelsStateExtras());
        const runtime = createParseEventRuntime();
        let parserError: Error | undefined;

        easysaxParser.on("error", function (message) {
            if (!parserError) {
                parserError = message instanceof Error ? message : new Error(String(message));
            }
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

        try {
            await start();
            if (parserError) {
                reject(parserError);
                return;
            }

            resolve(state);
        } catch (error) {
            reject(error);
        }
    });
}

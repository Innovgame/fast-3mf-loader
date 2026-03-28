import type EasySAXParser from "easysax";
import {
    createBuildItem,
    createComponent,
    createTriangle,
    createMetadata,
    createModel,
    createVertex,
    createObject,
    createBasematerials,
    createBasematerial,
    createTexture2d,
    createColorGroup,
    createColor,
    createTexture2dGroup,
    createTexture2dCoord,
} from "./node-create";
import {
    extractBuildItemData,
    extractComponentData,
    extractTriangleData,
    extractMetadata,
    extractModelData,
    extractObjectStart,
    extractVertexData,
    extractBasematerialsData,
    extractBasematerialData,
    extractTexture2dData,
    extractColorGroupData,
    extractColorData,
    extractTexture2dGroup,
    extractTexture2dCoord,
} from "./node-extract";
import { makeModelsStateExtras, StateInput, StateType } from "./util";

export function detectAndCreateModels(state: StateType, input: StateInput) {
    if (input.tagName === "model" && input.start) {
        createModel(state, extractModelData(input));
    } else if (input.tagName === "metadata" && !input.end) {
        createMetadata(state, extractMetadata(input));
    } else if (input.tagName === "object") {
        if (input.start) createObject(state, extractObjectStart(input));
        if (input.end) state.current.currentObjectId = undefined;
    } else if (input.tagName === "vertex" && input.start) {
        createVertex(state, extractVertexData(input));
    } else if (input.tagName === "triangle" && input.start) {
        createTriangle(state, extractTriangleData(input));
    } else if (input.tagName === "item" && input.start) {
        createBuildItem(state, extractBuildItemData(input));
    } else if (input.tagName === "component" && input.start) {
        createComponent(state, extractComponentData(input));
    } else if (input.tagName === "basematerials") {
        if (input.start) createBasematerials(state, extractBasematerialsData(input));
        if (input.end) state.current.currentBasematerialsId = undefined;
    } else if (input.tagName === "base" && input.start) {
        createBasematerial(state, extractBasematerialData(input));
    } else if (input.tagName.endsWith("texture2d") && input.start) {
        createTexture2d(state, extractTexture2dData(input));
    } else if (input.tagName.endsWith("colorgroup")) {
        if (input.start) createColorGroup(state, extractColorGroupData(input));
        if (input.end) state.current.currentColorGroupId = undefined;
    } else if (input.tagName.endsWith("color") && input.start) {
        createColor(state, extractColorData(input));
    } else if (input.tagName.endsWith("texture2dgroup")) {
        if (input.start) createTexture2dGroup(state, extractTexture2dGroup(input));
        if (input.end) state.current.currentTexture2dGroupId = undefined;
    } else if (input.tagName.endsWith("tex2coord") && input.start) {
        createTexture2dCoord(state, extractTexture2dCoord(input));
    }
}

export function parse(easysaxParser: EasySAXParser, start: () => Promise<void>) {
    return new Promise<StateType>(async (resolve, reject) => {
        const state = Object.assign({}, makeModelsStateExtras());

        function processData(data: StateInput) {
            // deal with core data
            detectAndCreateModels(state, data);
            // deal with materials and colors
            // detectAndCreate_Materials(state, data);
        }

        easysaxParser.on("error", function () {
            // console.log('error - ' + msg);
        });

        let tagName: string | undefined = undefined;
        let currentMetadataName: string | undefined;
        easysaxParser.on("startNode", function (elementName, getAttr, isTagEnd, getStringNode) {
            // elementName -- (string) element name. If namespaces are enabled, it automatically sets the prefix
            // getAttr() -- (function) parse attributes and return an object
            // isTagEnd -- (boolean) flag that the element is empty "<elem/>"
            // getStringNode() -- (function) returns the unparsed string of the element. example: <item title="text" id="x345">
            // debugger;
            if (elementName === "metadata") {
                currentMetadataName = getAttr()?.["name"];
            }
            tagName = elementName;
            processData({ tagName: elementName, empty: isTagEnd, getStringNode, getAttr, metadataName: currentMetadataName, start: true });
        });

        easysaxParser.on("endNode", function (elementName, isTagStart, getStringNode) {
            // isTagStart -- (boolean) flag that the element is empty "<elem/>"
            // debugger
            processData({ tagName: elementName, empty: isTagStart, getStringNode, end: true });
            if (elementName === "metadata") {
                currentMetadataName = undefined;
            }
            tagName = undefined;
        });

        easysaxParser.on("textNode", function (text) {
            // text -- (String) line of text
            if (!tagName) return;
            processData({ tagName: tagName, text, metadataName: currentMetadataName });
        });

        try {
            await start();
            resolve(state);
        } catch (error) {
            reject(error);
        }
    });
}

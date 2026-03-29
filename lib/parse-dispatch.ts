import {
    createBasematerial,
    createBasematerials,
    createBuildItem,
    createColor,
    createColorGroup,
    createComponent,
    createMetadata,
    createModel,
    createObject,
    createTexture2d,
    createTexture2dCoord,
    createTexture2dGroup,
    createTriangle,
    createVertex,
} from "./node-create";
import {
    extractBasematerialData,
    extractBasematerialsData,
    extractBuildItemData,
    extractColorData,
    extractColorGroupData,
    extractComponentData,
    extractMetadata,
    extractModelData,
    extractObjectStart,
    extractTexture2dCoord,
    extractTexture2dData,
    extractTexture2dGroup,
    extractTriangleData,
    extractVertexData,
} from "./node-extract";
import type { ParseEvent } from "./parse-events";
import type { StateType } from "./util";

function getLocalName(tagName: string): string {
    const idx = tagName.indexOf(":");
    return idx === -1 ? tagName : tagName.substring(idx + 1);
}

function clearCurrentStateForEndTag(state: StateType, localName: string) {
    if (localName === "object") state.current.currentObjectId = undefined;
    else if (localName === "basematerials") state.current.currentBasematerialsId = undefined;
    else if (localName === "colorgroup") state.current.currentColorGroupId = undefined;
    else if (localName === "texture2dgroup") state.current.currentTexture2dGroupId = undefined;
}

export function dispatchParseEvent(state: StateType, event: ParseEvent) {
    const localName = getLocalName(event.tagName);

    switch (localName) {
        case "vertex":
            if (event.kind === "start") createVertex(state, extractVertexData(event));
            return;

        case "triangle":
            if (event.kind === "start") createTriangle(state, extractTriangleData(event));
            return;

        case "model":
            if (event.kind === "start") createModel(state, extractModelData(event));
            return;

        case "metadata":
            if (event.kind === "text") createMetadata(state, extractMetadata(event));
            return;

        case "object":
            if (event.kind === "start") createObject(state, extractObjectStart(event));
            if (event.kind === "end") clearCurrentStateForEndTag(state, localName);
            return;

        case "item":
            if (event.kind === "start") createBuildItem(state, extractBuildItemData(event));
            return;

        case "component":
            if (event.kind === "start") createComponent(state, extractComponentData(event));
            return;

        case "basematerials":
            if (event.kind === "start") createBasematerials(state, extractBasematerialsData(event));
            if (event.kind === "end") clearCurrentStateForEndTag(state, localName);
            return;

        case "base":
            if (event.kind === "start") createBasematerial(state, extractBasematerialData(event));
            return;

        case "texture2d":
            if (event.kind === "start") createTexture2d(state, extractTexture2dData(event));
            return;

        case "colorgroup":
            if (event.kind === "start") createColorGroup(state, extractColorGroupData(event));
            if (event.kind === "end") clearCurrentStateForEndTag(state, localName);
            return;

        case "color":
            if (event.kind === "start") createColor(state, extractColorData(event));
            return;

        case "texture2dgroup":
            if (event.kind === "start") createTexture2dGroup(state, extractTexture2dGroup(event));
            if (event.kind === "end") clearCurrentStateForEndTag(state, localName);
            return;

        case "tex2coord":
            if (event.kind === "start") createTexture2dCoord(state, extractTexture2dCoord(event));
            return;
    }
}

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

function clearCurrentStateForEndTag(state: StateType, tagName: string) {
    if (tagName === "object") state.current.currentObjectId = undefined;
    if (tagName === "basematerials") state.current.currentBasematerialsId = undefined;
    if (tagName.endsWith("colorgroup")) state.current.currentColorGroupId = undefined;
    if (tagName.endsWith("texture2dgroup")) state.current.currentTexture2dGroupId = undefined;
}

export function dispatchParseEvent(state: StateType, event: ParseEvent) {
    if (event.tagName === "model" && event.kind === "start") {
        createModel(state, extractModelData(event));
        return;
    }

    if (event.tagName === "metadata" && event.kind === "text") {
        createMetadata(state, extractMetadata(event));
        return;
    }

    if (event.tagName === "object") {
        if (event.kind === "start") createObject(state, extractObjectStart(event));
        if (event.kind === "end") clearCurrentStateForEndTag(state, event.tagName);
        return;
    }

    if (event.tagName === "vertex" && event.kind === "start") {
        createVertex(state, extractVertexData(event));
        return;
    }

    if (event.tagName === "triangle" && event.kind === "start") {
        createTriangle(state, extractTriangleData(event));
        return;
    }

    if (event.tagName === "item" && event.kind === "start") {
        createBuildItem(state, extractBuildItemData(event));
        return;
    }

    if (event.tagName === "component" && event.kind === "start") {
        createComponent(state, extractComponentData(event));
        return;
    }

    if (event.tagName === "basematerials") {
        if (event.kind === "start") createBasematerials(state, extractBasematerialsData(event));
        if (event.kind === "end") clearCurrentStateForEndTag(state, event.tagName);
        return;
    }

    if (event.tagName === "base" && event.kind === "start") {
        createBasematerial(state, extractBasematerialData(event));
        return;
    }

    if (event.tagName.endsWith("texture2d") && event.kind === "start") {
        createTexture2d(state, extractTexture2dData(event));
        return;
    }

    if (event.tagName.endsWith("colorgroup")) {
        if (event.kind === "start") createColorGroup(state, extractColorGroupData(event));
        if (event.kind === "end") clearCurrentStateForEndTag(state, event.tagName);
        return;
    }

    if (event.tagName.endsWith("color") && event.kind === "start") {
        createColor(state, extractColorData(event));
        return;
    }

    if (event.tagName.endsWith("texture2dgroup")) {
        if (event.kind === "start") createTexture2dGroup(state, extractTexture2dGroup(event));
        if (event.kind === "end") clearCurrentStateForEndTag(state, event.tagName);
        return;
    }

    if (event.tagName.endsWith("tex2coord") && event.kind === "start") {
        createTexture2dCoord(state, extractTexture2dCoord(event));
    }
}

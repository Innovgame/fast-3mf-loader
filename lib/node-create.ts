import {
    extractBuildItemData,
    extractModelData,
    extractMetadata,
    extractObjectStart,
    extractVertexData,
    extractTriangleData,
    extractComponentData,
    extractBasematerialsData,
    extractBasematerialData,
    extractTexture2dData,
    extractColorGroupData,
    extractColorData,
    extractTexture2dCoord,
    extractTexture2dGroup,
} from "./node-extract";
import { StateType } from "./util";

export function createModel(state: StateType, input: ReturnType<typeof extractModelData>) {
    if (input === undefined) return;
    const { unit, version, requiredExtensions, scale, extensions } = input;
    state.unit = unit;
    state.version = version;
    state.requiredExtensions = requiredExtensions;
    state.extensions = extensions;
    state.transform = { scale };
    return state;
}

export function createMetadata(state: StateType, input?: ReturnType<typeof extractMetadata>) {
    if (!input) return;
    state.metadata = Object.assign({}, state.metadata, input);
    return state;
}

export function createObject(state: StateType, input: ReturnType<typeof extractObjectStart>) {
    if (!input) return;
    state.current.currentObjectId = input.id;
    state.resources.object[input.id] = input;
    return state;
}

export function createVertex(state: StateType, input?: ReturnType<typeof extractVertexData>) {
    if (!input) return;
    const currentObjectId = state.current.currentObjectId;
    if (!currentObjectId) return;
    const current = state.resources.object[currentObjectId];
    if (!current) return;
    current.mesh.vertices.push(input.x, input.y, input.z);
    return state;
}

export function createTriangle(state: StateType, input?: ReturnType<typeof extractTriangleData>) {
    if (!input) return;
    const currentObjectId = state.current.currentObjectId;
    if (!currentObjectId) return;
    const current = state.resources.object[currentObjectId];
    if (!current) return;
    current.mesh.triangles.push(input.v1, input.v2, input.v3);
    current.mesh.triangleProperties.push(input);
    return state;
}

export function createBuildItem(state: StateType, input?: ReturnType<typeof extractBuildItemData>) {
    if (!input) return;
    state.build.push(input);
    return state;
}

export function createComponent(state: StateType, input?: ReturnType<typeof extractComponentData>) {
    if (!input) return;
    const currentObjectId = state.current.currentObjectId;
    if (!currentObjectId) return;
    const current = state.resources.object[currentObjectId];
    if (!current) return;
    current.components.push(input);
    return state;
}

export function createBasematerial(state: StateType, input?: ReturnType<typeof extractBasematerialData>) {
    if (!input) return;
    const currentBasematerialsId = state.current.currentBasematerialsId;
    if (!currentBasematerialsId) return;
    const currentBasematerials = state.resources.basematerials[currentBasematerialsId];
    if (!currentBasematerials) return;
    input.index = currentBasematerials.basematerials.length;
    currentBasematerials.basematerials.push(input);
    return state;
}

export function createBasematerials(state: StateType, input?: ReturnType<typeof extractBasematerialsData>) {
    if (!input) return;
    state.current.currentBasematerialsId = input.id;
    state.resources.basematerials[input.id] = input;
    return state;
}

export function createTexture2d(state: StateType, input?: ReturnType<typeof extractTexture2dData>) {
    if (!input) return;
    state.resources.texture2d[input.id] = input;
    return state;
}

export function createColorGroup(state: StateType, input?: ReturnType<typeof extractColorGroupData>) {
    if (!input) return;
    state.current.currentColorGroupId = input.id;
    state.resources.colorgroup[input.id] = input;
    return state;
}

export function createColor(state: StateType, input?: ReturnType<typeof extractColorData>) {
    if (!input) return;
    const currentColorGroupId = state.current.currentColorGroupId;
    if (!currentColorGroupId) return;
    const currentColorGroup = state.resources.colorgroup[currentColorGroupId];
    if (!currentColorGroup) return;
    currentColorGroup.colors.push(input.r, input.g, input.b);
    return state;
}

export function createTexture2dGroup(state: StateType, input?: ReturnType<typeof extractTexture2dGroup>) {
    if (!input) return;
    state.current.currentTexture2dGroupId = input.id;
    state.resources.texture2dgroup[input.id] = input;
    return state;
}

export function createTexture2dCoord(state: StateType, input?: ReturnType<typeof extractTexture2dCoord>) {
    if (!input) return;
    const currentTexture2dGroupId = state.current.currentTexture2dGroupId;
    if (!currentTexture2dGroupId) return;
    const current = state.resources.texture2dgroup[currentTexture2dGroupId];
    if (!current) return;
    current.uvs.push(input.u, input.v);
    return state;
}

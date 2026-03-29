import {
    BasematerialType,
    BuildItemType,
    ColorGroupType,
    ComponentType,
    hexToRgbaArray,
    matrixFromTransformString,
    ObjectType,
    StateInput,
    Texture2dGroupType,
    Texture2dType,
    TriangleProperty,
} from "./util";
import type { ParseEvent, ParseStartEvent, ParseTextEvent } from "./parse-events";

type ExtractableEvent = StateInput | ParseEvent | ParseStartEvent | ParseTextEvent;

function isTextEvent(input: ExtractableEvent): input is StateInput | ParseTextEvent {
    return ("kind" in input && input.kind === "text") || (!("kind" in input) && typeof input.text === "string");
}

function isStartLikeEvent(input: ExtractableEvent): input is StateInput | ParseStartEvent {
    return ("kind" in input && input.kind === "start") || (!("kind" in input) && input.start === true);
}

// All helpers after this point
function getScaleFromUnit(unit: string = "millimeter") {
    const mapping: { [key: string]: number } = {
        micron: 0.001,
        millimeter: 1,
        centimeter: 10,
        meter: 1000,
        inch: 25.4,
        foot: 304.8,
    };
    let scale = mapping[unit];
    if (scale === undefined) {
        console.warn(`Fast3MFLoader: Unrecognised model unit \`${unit}\`. Assuming millimeter.`);
        scale = 1;
    }
    return [scale, scale, scale];
}

export function extractModelData(input: ExtractableEvent) {
    if (!isStartLikeEvent(input)) return;
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;
    const unit = attributes["unit"] as string | undefined;
    const scale = getScaleFromUnit(unit) as number[];
    const version = attributes["version"] as string | undefined;
    const requiredExtensions = attributes["requiredextensions"] as string | undefined;

    const extensions: { [key: string]: string } = {};
    for (const key in attributes) {
        if (!Object.hasOwn(attributes, key)) continue;
        if (key.startsWith("xmlns:")) {
            extensions[key] = attributes[key] as string;
        }
    }

    return { unit, version, requiredExtensions, extensions, scale };
}

export function extractMetadata(input: ExtractableEvent) {
    if (!isTextEvent(input)) return;
    const { text, metadataName } = input;
    if (text && metadataName) {
        return { [metadataName]: text };
    }
}

export function extractObjectStart(input: ExtractableEvent) {
    if (!isStartLikeEvent(input)) return;
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;

    const data = {
        id: attributes["id"],
        components: [],
        mesh: {
            vertices: [],
            triangles: [],
            triangleProperties: [],
        },
    } as ObjectType;

    for (const key of ["type", "pid", "pindex", "thumbnail", "partnumber", "name"] as const) {
        if (attributes[key] !== undefined) data[key] = attributes[key];
    }
    return data;
}

export function extractVertexData(input: ExtractableEvent) {
    if (!isStartLikeEvent(input)) return;
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;

    const x = attributes["x"];
    const y = attributes["y"];
    const z = attributes["z"];
    const results = {
        x: Number(x),
        y: Number(y),
        z: Number(z),
    };

    return results;
}

export function extractTriangleData(input: ExtractableEvent) {
    if (!isStartLikeEvent(input)) return;
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;

    const v1 = attributes["v1"];
    const v2 = attributes["v2"];
    const v3 = attributes["v3"];
    const p1 = attributes["p1"];
    const p2 = attributes["p2"];
    const p3 = attributes["p3"];
    const pid = attributes["pid"];
    const result = {
        v1: Number(v1),
        v2: Number(v2),
        v3: Number(v3),
    } as TriangleProperty;

    if (p1) {
        result["p1"] = Number(p1);
    }
    if (p2) {
        result["p2"] = Number(p2);
    }
    if (p3) {
        result["p3"] = Number(p3);
    }
    if (pid) {
        result["pid"] = Number(pid);
    }

    return result;
}

export function extractBuildItemData(input: ExtractableEvent) {
    if (!isStartLikeEvent(input)) return;
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;

    const data = {
        objectId: attributes["objectid"],
    } as BuildItemType;
    if (attributes["transform"] !== undefined) data["transform"] = matrixFromTransformString(attributes["transform"]);
    if (attributes["partnumber"] !== undefined) data["partnumber"] = attributes["partnumber"];
    if (attributes["path"] !== undefined) data["path"] = attributes["path"];
    return data;
}

export function extractComponentData(input: ExtractableEvent) {
    if (!isStartLikeEvent(input)) return;
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;

    const data = {
        objectId: attributes["objectid"],
    } as ComponentType;

    if (attributes["id"] !== undefined) data["id"] = attributes["id"];
    if (attributes["transform"] !== undefined) data["transform"] = matrixFromTransformString(attributes["transform"]);
    if (attributes["path"] !== undefined) data["path"] = attributes["path"];
    return data;
}

export function extractBasematerialsData(input: ExtractableEvent) {
    if (!isStartLikeEvent(input)) return;
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;
    const basematerialsData = {
        id: attributes["id"], // required
        basematerials: [] as BasematerialType[],
    };
    return basematerialsData;
}

export function extractBasematerialData(input: ExtractableEvent) {
    if (!isStartLikeEvent(input)) return;
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;
    const data = {} as BasematerialType;
    if (attributes["name"] !== undefined) data["name"] = attributes["name"];
    if (attributes["displaycolor"] !== undefined) data["displaycolor"] = attributes["displaycolor"];
    if (attributes["displaypropertiesid"] !== undefined) data["displaypropertiesid"] = attributes["displaypropertiesid"];
    return data;
}

export function extractTexture2dData(input: ExtractableEvent) {
    if (!isStartLikeEvent(input)) return;
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;

    const data = {} as Texture2dType;
    if (attributes["id"] !== undefined) data["id"] = attributes["id"];
    if (attributes["path"] !== undefined) data["path"] = attributes["path"];
    if (attributes["contenttype"] !== undefined) data["contenttype"] = attributes["contenttype"];
    if (attributes["tilestyleu"] !== undefined) data["tilestyleu"] = attributes["tilestyleu"];
    if (attributes["tilestylev"] !== undefined) data["tilestylev"] = attributes["tilestylev"];
    if (attributes["filter"] !== undefined) data["filter"] = attributes["filter"];
    return data;
}

export function extractColorGroupData(input: ExtractableEvent) {
    if (!isStartLikeEvent(input)) return;
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;
    const data = {
        id: attributes["id"], // required
        colors: [],
    } as ColorGroupType;
    if (attributes["displaypropertiesid"]) data["displaypropertiesid"] = attributes["displaypropertiesid"];
    return data;
}

export function extractColorData(input: ExtractableEvent) {
    if (!isStartLikeEvent(input)) return;
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;

    const [r, g, b] = hexToRgbaArray(attributes["color"]);
    return {
        r,
        g,
        b,
    };
}

export function extractTexture2dGroup(input: ExtractableEvent) {
    if (!isStartLikeEvent(input)) return;
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;
    const data = {
        id: attributes["id"], // required
        texid: attributes["texid"], // required
        uvs: [],
    } as Texture2dGroupType;
    if (attributes["displaypropertiesid"]) data["displaypropertiesid"] = attributes["displaypropertiesid"];
    return data;
}

export function extractTexture2dCoord(input: ExtractableEvent) {
    if (!isStartLikeEvent(input)) return;
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;

    const u = attributes["u"];
    const v = attributes["v"];
    return {
        u: Number(u),
        v: Number(v),
    };
}

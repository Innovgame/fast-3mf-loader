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
        console.warn("Unrecognised unit " + unit + " used. Assuming mm instead");
        scale = 1;
    }
    return [scale, scale, scale];
}

export function extractModelData(input: StateInput) {
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
        const value = attributes[key] as string;
        if (/^xmlns:(?<ns>.+)$/.test(key)) {
            // const { ns } = key.match(/^xmlns:(?<ns>.+)$/)!.groups || {};
            if (key) extensions[key] = value;
        }
    }

    return { unit, version, requiredExtensions, extensions, scale };
}

let _metadataAttrs: any;
export function extractMetadata(input: StateInput) {
    const { text, getAttr } = input;
    const name = _metadataAttrs?.["name"];
    if (text && name) {
        return { [name]: text };
    }

    const attributes = getAttr?.();
    _metadataAttrs = attributes;
}

export function extractObjectStart(input: StateInput) {
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
        if (key in attributes) data[key] = attributes[key];
    }
    return data;
}

export function extractVertexData(input: StateInput) {
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

export function extractTriangleData(input: StateInput) {
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

export function extractBuildItemData(input: StateInput) {
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;

    const data = {
        objectId: attributes["objectid"],
    } as BuildItemType;
    for (const key of ["transform", "partnumber", "path"] as const) {
        if (key in attributes) {
            if (key === "transform") {
                data["transform"] = matrixFromTransformString(attributes[key]);
            } else {
                // others
                // @ts-ignore
                data[key] = attributes[key];
            }
        }
    }
    return data;
}

export function extractComponentData(input: StateInput) {
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;

    const data = {
        objectId: attributes["objectid"],
    } as ComponentType;

    for (const key of ["id", "transform", "path"] as const) {
        if (key in attributes) {
            if (key === "transform") {
                data["transform"] = matrixFromTransformString(attributes[key]);
            } else {
                // others
                // @ts-ignore
                data[key] = attributes[key];
            }
        }
    }
    return data;
}

export function extractBasematerialsData(input: StateInput) {
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;
    const basematerialsData = {
        id: attributes["id"], // required
        basematerials: [] as BasematerialType[],
    };
    return basematerialsData;
}

export function extractBasematerialData(input: StateInput) {
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;
    const data = {} as BasematerialType;
    for (const key of ["name", "displaycolor", "displaypropertiesid"] as const) {
        if (key in attributes) data[key] = attributes[key];
    }
    return data;
}

export function extractTexture2dData(input: StateInput) {
    const { getAttr } = input;
    const attributes = getAttr?.();
    if (!attributes) return;

    const data = {} as Texture2dType;
    for (const key of ["id", "path", "contenttype", "tilestyleu", "tilestylev", "filter"] as const) {
        if (key in attributes) data[key] = attributes[key];
    }
    return data;
}

export function extractColorGroupData(input: StateInput) {
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

export function extractColorData(input: StateInput) {
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

export function extractTexture2dGroup(input: StateInput) {
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

export function extractTexture2dCoord(input: StateInput) {
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

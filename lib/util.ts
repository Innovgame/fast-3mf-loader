// async function* parse(easysaxParser: any, reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<any> {
//     const eventAggregator: any[] = [];

//     easysaxParser.on("error", function (msg: string) {
//         // console.log('error - ' + msg);
//         eventAggregator.push({ error: msg });
//     });

//     easysaxParser.on("startNode", function (elementName: string, getAttr: Function, isTagEnd: boolean, getStringNode: Function) {
//         // elementName -- (string) element name. If namespaces are enabled, it automatically sets the prefix
//         // getAttr() -- (function) parse attributes and return an object
//         // isTagEnd -- (boolean) flag that the element is empty "<elem/>"
//         // getStringNode() -- (function) returns the unparsed string of the element. example: <item title="text" id="x345">
//         // debugger

//         eventAggregator.push({ elementName, getAttr, isTagEnd, getStringNode });
//     });

//     easysaxParser.on("endNode", function (elementName: string, isTagStart: boolean, getStringNode: Function) {
//         // isTagStart -- (boolean) flag that the element is empty "<elem/>"
//         // debugger
//         eventAggregator.push({ elementName, isTagStart, getStringNode });
//     });

//     easysaxParser.on("textNode", function (text: string) {
//         // text -- (String) line of text
//         eventAggregator.push({ textNode: text });
//     });

//     easysaxParser.on("cdata", function (text: string) {
//         // text -- (String) CDATA element text string
//         eventAggregator.push({ cdata: text });
//     });

//     easysaxParser.on("comment", function (text: string) {
//         // text - (String) comment text
//         eventAggregator.push({ comment: text });
//     });

//     while (true) {
//         // const chunk = await reader.read();
//         // if (chunk.done) {
//         //     return this.end();
//         // }

//         const { done, value } = await reader.read();
//         if (done) break;
//         easysaxParser.write(textDecoder.decode(value));

//         if (eventAggregator.length) {
//             for (const event of eventAggregator) {
//                 yield event;
//             }
//             eventAggregator.length = 0;
//         }
//     }
// }

export type TriangleProperty = {
    v1: number;
    v2: number;
    v3: number;
    p1: number;
    p2: number;
    p3: number;
    pid?: number;
};
export type ComponentType = {
    objectId: string;
    /** 4x4 */
    transform?: number[];
};

export type MeshData = {
    vertices: number[];
    triangles: number[];
    triangleProperties: TriangleProperty[];
};

export type ObjectType = {
    id: string;
    type?: string;
    name?: string;
    pid?: any;
    pindex?: any;
    thumbnail?: any;
    partnumber?: any;
    mesh: MeshData;
    components: ComponentType[];
};

export type BuildItemType = { objectId: string; transform?: number[] };

export type BasematerialType = {
    index: number;
    name: string;
    displaycolor: string;
    displaypropertiesid?: string;
};

export type Texture2dType = {
    id: string;
    path: string;
    contenttype: string;
    tilestyleu?: unknown;
    tilestylev?: unknown;
    filter?: unknown;
};

export type ColorGroupType = {
    id: string;
    displaypropertiesid?: string;
    colors: number[];
};

export type Texture2dGroupType = {
    id: string;
    texid: string;
    displaypropertiesid?: string;
    uvs: number[];
};

export type BasematerialsType = {
    id: number;
    basematerials: BasematerialType[];
};

export function makeModelsStateExtras() {
    return {
        current: {
            currentObjectId: undefined! as string,
            currentBasematerialsId: undefined! as string,
            currentColorGroupId: undefined! as string,
            currentTexture2dGroupId: undefined! as string,
        },
        unit: "" as string | undefined,
        version: "" as string | undefined,
        transform: {},
        metadata: {},
        resources: {
            object: {} as { [key: string]: ObjectType },
            basematerials: {} as { [key: string]: BasematerialsType },
            texture2d: {} as { [key: string]: Texture2dType },
            colorgroup: {} as { [key: string]: ColorGroupType },
            texture2dgroup: {} as { [key: string]: Texture2dGroupType },
            pbmetallicdisplayproperties: {} as { [key: string]: any },
        },
        build: [] as BuildItemType[],
        extensions: {} as { [key: string]: string },
        requiredExtensions: undefined! as string | undefined,
    };
}

export function hexToRgbaArray(hex: string /** #FF0000FF */) {
    // 移除 # 并确保长度为 8（填充缺失的 Alpha）
    let hexStr = hex.slice(1).padEnd(8, "F");

    // 如果是 3/4 位 HEX，扩展成 6/8 位
    if (hexStr.length <= 4) {
        hexStr = hexStr.replace(/./g, "$&$&");
    }

    // 解析为 [R, G, B, A]
    return [
        parseInt(hexStr.substring(0, 2), 16) / 255,
        parseInt(hexStr.substring(2, 4), 16) / 255,
        parseInt(hexStr.substring(4, 6), 16) / 255,
        parseInt(hexStr.substring(6, 8), 16) / 255,
    ];
}

export function matrixFromTransformString(transform: string) {
    return transform.split(" ").map(Number);
}

export type StateType = ReturnType<typeof makeModelsStateExtras>;

export type StateInput = {
    tagName: string;
    getStringNode?: Function;
    getAttr?: Function;
    // element is empty
    empty?: boolean;
    /** 文本区域 */
    text?: string;
    /** 标签开始 */
    start?: boolean;
    /** 标签结束 */
    end?: boolean;
};

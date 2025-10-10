import {
    BasematerialsType,
    BasematerialType,
    BuildItemType,
    ColorGroupType,
    ComponentType,
    MeshData,
    ObjectType,
    StateType,
    Texture2dGroupType,
    TriangleProperty,
} from "./util";
import * as THREE from "three";

type MeshDataExt = MeshData & { build: any };
const COLOR_SPACE_3MF = THREE.SRGBColorSpace;

export function fast3mfBuilder(data3mf: any) {
    const objects = buildObjects(data3mf);
    return build(objects, data3mf);
}

function build(objects: { [key: string]: any }, data3mf: any) {
    const group = new THREE.Group();

    const relationship = fetch3DModelPart(data3mf["rels"]);
    const buildData = data3mf.model[relationship["target"].substring(1)]["build"];

    for (let i = 0; i < buildData.length; i++) {
        const buildItem = buildData[i] as BuildItemType;
        const object3D = objects[buildItem["objectId"]].clone();

        // apply transform
        const transform = buildItem["transform"];
        if (transform) {
            object3D.applyMatrix4(parseTransform(transform));
        }

        group.add(object3D);
    }

    return group;
}

function fetch3DModelPart(rels: any[]) {
    for (let i = 0; i < rels.length; i++) {
        const rel = rels[i];
        const extension = rel.target.split(".").pop();

        if (extension.toLowerCase() === "model") return rel;
    }
}

function buildObjects(data3mf: any) {
    const modelsData = data3mf.model;
    const modelRels = data3mf.modelRels;

    // start build
    const modelsKeys = Object.keys(modelsData);
    const objects = {};
    const textureData: { [key: string]: ArrayBuffer } = {};

    // evaluate model relationships to textures
    if (modelRels) {
        for (let i = 0, l = modelRels.length; i < l; i++) {
            const modelRel = modelRels[i];
            const target = modelRel.target as string;
            const textureKey = target.substring(1);

            if (data3mf.texture[textureKey]) {
                textureData[target] = data3mf.texture[textureKey];
            }
        }
    }

    for (let i = 0; i < modelsKeys.length; i++) {
        const modelsKey = modelsKeys[i];
        const modelData = modelsData[modelsKey];

        const objectIds = Object.keys(modelData["resources"]["object"]);

        for (let j = 0; j < objectIds.length; j++) {
            const objectId = objectIds[j];

            buildObject(objectId, objects, modelData, textureData);
        }
    }

    return objects;
}

function buildObject(objectId: string, objects: { [key: string]: any }, modelData: StateType, textureData: { [key: string]: ArrayBuffer }) {
    const objectData = modelData["resources"]["object"][objectId];

    if (objectData["mesh"]) {
        const meshData = objectData["mesh"] as MeshDataExt;
        // TODO: extensions
        // const extensions = modelData["extensions"];
        // const modelXml = modelData["xml"];
        // applyExtensions(extensions, meshData, modelXml);

        if (meshData.vertices.length > 0 && meshData.triangles.length > 0) {
            objects[objectData.id] = getBuild(meshData, objects, modelData, textureData, objectData, buildGroup);
        }
    }

    if (Array.isArray(objectData["components"]) && objectData["components"].length > 0) {
        const compositeData = objectData["components"];
        objects[objectData.id] = getBuild(compositeData as any, objects, modelData, textureData, objectData, buildComposite as any);
    }

    if (objectData.name) {
        objects[objectData.id].name = objectData.name;
    }

    // TODO:
    // if (modelData.resources.implicitfunction) {
    //     console.warn("THREE.ThreeMFLoader: Implicit Functions are implemented in data-only.", modelData.resources.implicitfunction);
    // }
}

function getBuild(
    data: MeshDataExt,
    objects: { [key: string]: any },
    modelData: StateType,
    textureData: { [key: string]: ArrayBuffer },
    objectData: ObjectType,
    builder: typeof buildGroup
) {
    if (data.build !== undefined) return data.build;
    data.build = builder(data, objects, modelData, textureData, objectData);
    return data.build;
}

function buildGroup(
    meshData: MeshDataExt,
    objects: { [key: string]: any },
    modelData: StateType,
    textureData: { [key: string]: ArrayBuffer },
    objectData: ObjectType
) {
    const group = new THREE.Group();
    const resourceMap = analyzeObject(meshData, objectData);
    const meshes = buildMeshes(resourceMap, meshData, objects, modelData, textureData, objectData);

    for (let i = 0, l = meshes.length; i < l; i++) {
        group.add(meshes[i]);
    }

    return group;
}

function analyzeObject(meshData: MeshDataExt, objectData: ObjectType) {
    const resourceMap: { [key: string]: TriangleProperty[] } = {};

    const triangleProperties = meshData["triangleProperties"];

    const objectPid = objectData.pid;

    for (let i = 0, l = triangleProperties.length; i < l; i++) {
        const triangleProperty = triangleProperties[i];
        let pid = triangleProperty.pid !== undefined ? triangleProperty.pid : objectPid;

        if (pid === undefined) pid = "default";

        if (resourceMap[pid] === undefined) resourceMap[pid] = [];

        resourceMap[pid].push(triangleProperty);
    }

    return resourceMap;
}

function buildMeshes(
    resourceMap: { [key: string]: TriangleProperty[] },
    meshData: MeshDataExt,
    objects: { [key: string]: any },
    modelData: StateType,
    textureData: { [key: string]: ArrayBuffer },
    objectData: ObjectType
) {
    const keys = Object.keys(resourceMap);
    const meshes = [];

    for (let i = 0, il = keys.length; i < il; i++) {
        const resourceId = keys[i];
        const triangleProperties = resourceMap[resourceId];
        const resourceType = getResourceType(resourceId, modelData);

        switch (resourceType) {
            case "material":
                const basematerials = modelData.resources.basematerials[resourceId];
                const newMeshes = buildBasematerialsMeshes(basematerials, triangleProperties, meshData, objects, modelData, textureData, objectData);

                for (let j = 0, jl = newMeshes.length; j < jl; j++) {
                    meshes.push(newMeshes[j]);
                }

                break;

            case "texture":
                const texture2dgroup = modelData.resources.texture2dgroup[resourceId];
                meshes.push(buildTexturedMesh(texture2dgroup, triangleProperties, meshData, objects, modelData, textureData, objectData));
                break;

            case "vertexColors":
                const colorgroup = modelData.resources.colorgroup[resourceId];
                meshes.push(buildVertexColorMesh(colorgroup, triangleProperties, meshData, objectData));
                break;

            case "default":
                meshes.push(buildDefaultMesh(meshData));
                break;

            default:
                console.error("THREE.3MFLoader: Unsupported resource type.");
        }
    }

    if (objectData.name) {
        for (let i = 0; i < meshes.length; i++) {
            meshes[i].name = objectData.name;
        }
    }

    return meshes;
}

function getResourceType(pid: string, modelData: StateType) {
    if (modelData.resources.texture2dgroup[pid] !== undefined) {
        return "texture";
    } else if (modelData.resources.basematerials[pid] !== undefined) {
        return "material";
    } else if (modelData.resources.colorgroup[pid] !== undefined) {
        return "vertexColors";
    } else if (pid === "default") {
        return "default";
    } else {
        return undefined;
    }
}

function buildBasematerialsMeshes(
    basematerials: BasematerialsType,
    triangleProperties: TriangleProperty[],
    meshData: MeshDataExt,
    objects: { [key: string]: any },
    modelData: StateType,
    textureData: { [key: string]: ArrayBuffer },
    objectData: ObjectType
) {
    const objectPindex = objectData.pindex;

    const materialMap: { [key: string]: TriangleProperty[] } = {};

    for (let i = 0, l = triangleProperties.length; i < l; i++) {
        const triangleProperty = triangleProperties[i];
        const pindex = triangleProperty.p1 !== undefined ? triangleProperty.p1 : objectPindex;

        if (materialMap[pindex] === undefined) materialMap[pindex] = [];

        materialMap[pindex].push(triangleProperty);
    }

    //

    const keys = Object.keys(materialMap);
    const meshes = [];

    for (let i = 0, l = keys.length; i < l; i++) {
        const materialIndex = Number(keys[i]);
        const trianglePropertiesProps = materialMap[materialIndex];
        const basematerialData = basematerials.basematerials[materialIndex];
        const material = getBuild(basematerialData as any, objects, modelData, textureData, objectData, buildBasematerial as any);

        //

        const geometry = new THREE.BufferGeometry();

        const positionData = [];

        const vertices = meshData.vertices;

        for (let j = 0, jl = trianglePropertiesProps.length; j < jl; j++) {
            const triangleProperty = trianglePropertiesProps[j];

            positionData.push(vertices[triangleProperty.v1 * 3 + 0]);
            positionData.push(vertices[triangleProperty.v1 * 3 + 1]);
            positionData.push(vertices[triangleProperty.v1 * 3 + 2]);

            positionData.push(vertices[triangleProperty.v2 * 3 + 0]);
            positionData.push(vertices[triangleProperty.v2 * 3 + 1]);
            positionData.push(vertices[triangleProperty.v2 * 3 + 2]);

            positionData.push(vertices[triangleProperty.v3 * 3 + 0]);
            positionData.push(vertices[triangleProperty.v3 * 3 + 1]);
            positionData.push(vertices[triangleProperty.v3 * 3 + 2]);
        }

        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positionData, 3));

        //

        const mesh = new THREE.Mesh(geometry, material);
        meshes.push(mesh);
    }

    return meshes;
}

function buildBasematerial(materialData: BasematerialType, _objects: { [key: string]: any }, modelData: StateType) {
    let material;

    const displaypropertiesid = materialData.displaypropertiesid;
    const pbmetallicdisplayproperties = modelData.resources.pbmetallicdisplayproperties;

    if (displaypropertiesid && pbmetallicdisplayproperties[displaypropertiesid] !== undefined) {
        // metallic display property, use StandardMaterial

        const pbmetallicdisplayproperty = pbmetallicdisplayproperties[displaypropertiesid];
        const metallicData = pbmetallicdisplayproperty.data[materialData.index];

        material = new THREE.MeshStandardMaterial({ flatShading: true, roughness: metallicData.roughness, metalness: metallicData.metallicness });
    } else {
        // otherwise use PhongMaterial

        material = new THREE.MeshPhongMaterial({ flatShading: true });
    }

    material.name = materialData.name;

    // displaycolor MUST be specified with a value of a 6 or 8 digit hexadecimal number, e.g. "#RRGGBB" or "#RRGGBBAA"

    const displaycolor = materialData.displaycolor;

    const color = displaycolor.substring(0, 7);
    material.color.setStyle(color, COLOR_SPACE_3MF);

    // process alpha if set

    if (displaycolor.length === 9) {
        material.opacity = parseInt(displaycolor.charAt(7) + displaycolor.charAt(8), 16) / 255;
    }

    return material;
}

function buildTexturedMesh(
    texture2dgroup: Texture2dGroupType,
    triangleProperties: TriangleProperty[],
    meshData: MeshDataExt,
    objects: { [key: string]: any },
    modelData: StateType,
    textureData: { [key: string]: ArrayBuffer },
    objectData: ObjectType
) {
    // geometry

    const geometry = new THREE.BufferGeometry();

    const positionData = [];
    const uvData = [];

    const vertices = meshData.vertices;
    const uvs = texture2dgroup.uvs;

    for (let i = 0, l = triangleProperties.length; i < l; i++) {
        const triangleProperty = triangleProperties[i];

        positionData.push(vertices[triangleProperty.v1 * 3 + 0]);
        positionData.push(vertices[triangleProperty.v1 * 3 + 1]);
        positionData.push(vertices[triangleProperty.v1 * 3 + 2]);

        positionData.push(vertices[triangleProperty.v2 * 3 + 0]);
        positionData.push(vertices[triangleProperty.v2 * 3 + 1]);
        positionData.push(vertices[triangleProperty.v2 * 3 + 2]);

        positionData.push(vertices[triangleProperty.v3 * 3 + 0]);
        positionData.push(vertices[triangleProperty.v3 * 3 + 1]);
        positionData.push(vertices[triangleProperty.v3 * 3 + 2]);

        //

        uvData.push(uvs[triangleProperty.p1 * 2 + 0]);
        uvData.push(uvs[triangleProperty.p1 * 2 + 1]);

        uvData.push(uvs[triangleProperty.p2 * 2 + 0]);
        uvData.push(uvs[triangleProperty.p2 * 2 + 1]);

        uvData.push(uvs[triangleProperty.p3 * 2 + 0]);
        uvData.push(uvs[triangleProperty.p3 * 2 + 1]);
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positionData, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvData, 2));

    // material

    const texture = getBuild(texture2dgroup as any, objects, modelData, textureData, objectData, buildTexture as any);

    const material = new THREE.MeshPhongMaterial({ map: texture, flatShading: true });

    // mesh

    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
}

function buildTexture(
    texture2dgroup: Texture2dGroupType,
    _objects: { [key: string]: any },
    modelData: StateType,
    textureData: { [key: string]: ArrayBuffer }
) {
    const textureLoader = new THREE.TextureLoader();
    const texid = texture2dgroup.texid;
    const texture2ds = modelData.resources.texture2d;
    const texture2d = texture2ds[texid];

    if (texture2d) {
        const data = textureData[texture2d.path];
        const type = texture2d.contenttype;

        const blob = new Blob([data], { type: type });
        const sourceURI = URL.createObjectURL(blob);

        const texture = textureLoader.load(sourceURI, function () {
            URL.revokeObjectURL(sourceURI);
        });

        texture.colorSpace = COLOR_SPACE_3MF;

        // texture parameters

        switch (texture2d.tilestyleu) {
            case "wrap":
                texture.wrapS = THREE.RepeatWrapping;
                break;

            case "mirror":
                texture.wrapS = THREE.MirroredRepeatWrapping;
                break;

            case "none":
            case "clamp":
                texture.wrapS = THREE.ClampToEdgeWrapping;
                break;

            default:
                texture.wrapS = THREE.RepeatWrapping;
        }

        switch (texture2d.tilestylev) {
            case "wrap":
                texture.wrapT = THREE.RepeatWrapping;
                break;

            case "mirror":
                texture.wrapT = THREE.MirroredRepeatWrapping;
                break;

            case "none":
            case "clamp":
                texture.wrapT = THREE.ClampToEdgeWrapping;
                break;

            default:
                texture.wrapT = THREE.RepeatWrapping;
        }

        switch (texture2d.filter) {
            case "auto":
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                break;

            case "linear":
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
                break;

            case "nearest":
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                texture.generateMipmaps = false;
                break;

            default:
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
        }

        return texture;
    } else {
        return null;
    }
}

function buildVertexColorMesh(colorgroup: ColorGroupType, triangleProperties: TriangleProperty[], meshData: MeshDataExt, objectData: ObjectType) {
    // geometry

    const geometry = new THREE.BufferGeometry();

    const positionData = [];
    const colorData = [];

    const vertices = meshData.vertices;
    const colors = colorgroup.colors;

    for (let i = 0, l = triangleProperties.length; i < l; i++) {
        const triangleProperty = triangleProperties[i];

        const v1 = triangleProperty.v1;
        const v2 = triangleProperty.v2;
        const v3 = triangleProperty.v3;

        positionData.push(vertices[v1 * 3 + 0]);
        positionData.push(vertices[v1 * 3 + 1]);
        positionData.push(vertices[v1 * 3 + 2]);

        positionData.push(vertices[v2 * 3 + 0]);
        positionData.push(vertices[v2 * 3 + 1]);
        positionData.push(vertices[v2 * 3 + 2]);

        positionData.push(vertices[v3 * 3 + 0]);
        positionData.push(vertices[v3 * 3 + 1]);
        positionData.push(vertices[v3 * 3 + 2]);

        //

        const p1 = triangleProperty.p1 !== undefined ? triangleProperty.p1 : objectData.pindex;
        const p2 = triangleProperty.p2 !== undefined ? triangleProperty.p2 : p1;
        const p3 = triangleProperty.p3 !== undefined ? triangleProperty.p3 : p1;

        colorData.push(colors[p1 * 3 + 0]);
        colorData.push(colors[p1 * 3 + 1]);
        colorData.push(colors[p1 * 3 + 2]);

        colorData.push(colors[p2 * 3 + 0]);
        colorData.push(colors[p2 * 3 + 1]);
        colorData.push(colors[p2 * 3 + 2]);

        colorData.push(colors[p3 * 3 + 0]);
        colorData.push(colors[p3 * 3 + 1]);
        colorData.push(colors[p3 * 3 + 2]);
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positionData, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colorData, 3));

    // material

    const material = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true });

    // mesh

    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
}

function buildDefaultMesh(meshData: MeshDataExt) {
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(meshData["triangles"] as any, 1));
    geometry.setAttribute("position", new THREE.BufferAttribute(meshData["vertices"] as any, 3));

    const material = new THREE.MeshPhongMaterial({
        name: THREE.Loader.DEFAULT_MATERIAL_NAME,
        color: 0xffffff,
        flatShading: true,
    });

    const mesh = new THREE.Mesh(geometry, material);

    return mesh;
}

function parseTransform(t: number[]) {
    const matrix = new THREE.Matrix4();
    matrix.set(t[0], t[3], t[6], t[9], t[1], t[4], t[7], t[10], t[2], t[5], t[8], t[11], 0.0, 0.0, 0.0, 1.0);
    return matrix;
}

function buildComposite(
    compositeData: ComponentType[],
    objects: { [key: string]: any },
    modelData: StateType,
    textureData: { [key: string]: ArrayBuffer }
) {
    const composite = new THREE.Group();

    for (let j = 0; j < compositeData.length; j++) {
        const component = compositeData[j];
        let build = objects[component.objectId];

        if (build === undefined) {
            buildObject(component.objectId, objects, modelData, textureData);
            build = objects[component.objectId];
        }

        const object3D = build.clone();

        // apply component transform

        const transform = component.transform;
        if (transform) {
            object3D.applyMatrix4(parseTransform(transform));
        }

        composite.add(object3D);
    }

    return composite;
}

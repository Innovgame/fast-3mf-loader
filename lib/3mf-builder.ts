import * as THREE from "three";
import {
    BasematerialsType,
    BasematerialType,
    BuildItemType,
    ColorGroupType,
    ComponentType,
    ObjectType,
    ParseResult,
    Texture2dGroupType,
    TriangleProperty,
} from "./util";
import {
    createTrianglePositionBuffer,
} from "./build-geometry";

type BuilderMeshData = {
    vertices: ArrayLike<number>;
    triangles: ArrayLike<number>;
    triangleProperties: TriangleProperty[];
};

type BuilderObjectType = Omit<ObjectType, "mesh"> & {
    mesh: BuilderMeshData;
};

type BuilderModelData = ParseResult["model"][string];
type BuilderTexture2dGroupType = Omit<Texture2dGroupType, "uvs"> & { uvs: ArrayLike<number> };
type BuilderColorGroupType = Omit<ColorGroupType, "colors"> & { colors: ArrayLike<number> };

type BuildObjectCache = Map<string, THREE.Object3D>;
type ResourceCache = Map<string, THREE.Material | THREE.Texture>;
type BuilderContext = {
    objectCache: BuildObjectCache;
    resourceCache: ResourceCache;
    textureData: Record<string, ArrayBuffer>;
};

const COLOR_SPACE_3MF = THREE.SRGBColorSpace;

function toArchivePartKey(path: string, referenceType: string) {
    const normalized = path.startsWith("/") ? path.slice(1) : path;

    if (!normalized) {
        throw new Error(`fast3mfBuilder: Invalid ${referenceType} target \`${path}\`.`);
    }

    return normalized;
}

export function fast3mfBuilder(data3mf: ParseResult) {
    const objectCache = buildObjects(data3mf);
    return build(objectCache, data3mf);
}

function build(objectCache: BuildObjectCache, data3mf: ParseResult) {
    const group = new THREE.Group();
    const relationship = fetch3DModelPart(data3mf.rels);
    const rootModelKey = toArchivePartKey(relationship.target!, "3D model relationship");
    const rootModel = data3mf.model[rootModelKey];

    if (!rootModel) {
        throw new Error(`fast3mfBuilder: Cannot find root model \`${rootModelKey}\` in parsed model data.`);
    }

    const buildData = rootModel.build;

    for (let i = 0; i < buildData.length; i++) {
        const buildItem = buildData[i] as BuildItemType;
        const object3D = objectCache.get(getObjectCacheKey(rootModelKey, buildItem.objectId));

        if (!object3D) {
            throw new Error(`fast3mfBuilder: Cannot find build object \`${buildItem.objectId}\` in model \`${rootModelKey}\`.`);
        }

        const builtObject = object3D.clone();

        const transform = buildItem.transform;
        if (transform) {
            builtObject.applyMatrix4(parseTransform(transform));
        }

        group.add(builtObject);
    }

    return group;
}

function fetch3DModelPart(rels: ParseResult["rels"]) {
    for (let i = 0; i < rels.length; i++) {
        const rel = rels[i];
        const target = rel.target;
        if (!target) continue;

        const extension = target.split(".").pop();
        if (extension?.toLowerCase() === "model") return rel;
    }

    throw new Error("fast3mfBuilder: Cannot find 3D model relationship in 3MF archive.");
}

function buildObjects(data3mf: ParseResult) {
    const context: BuilderContext = {
        objectCache: new Map(),
        resourceCache: new Map(),
        textureData: collectTextureData(data3mf),
    };
    const modelsData = data3mf.model;
    const modelsKeys = Object.keys(modelsData);

    for (let i = 0; i < modelsKeys.length; i++) {
        const modelKey = modelsKeys[i];
        const modelData = modelsData[modelKey];
        const objectIds = Object.keys(modelData.resources.object);

        for (let j = 0; j < objectIds.length; j++) {
            buildObject(modelKey, objectIds[j], modelData, context);
        }
    }

    return context.objectCache;
}

function collectTextureData(data3mf: ParseResult) {
    const textureData: Record<string, ArrayBuffer> = {};
    const modelRels = data3mf.modelRels;

    if (!modelRels) {
        return textureData;
    }

    for (let i = 0; i < modelRels.length; i++) {
        const modelRel = modelRels[i];
        const target = modelRel.target;
        if (!target) continue;

        const textureKey = toArchivePartKey(target, "texture relationship");
        if (data3mf.texture[textureKey]) {
            textureData[textureKey] = data3mf.texture[textureKey];
        }
    }

    return textureData;
}

function buildObject(modelKey: string, objectId: string, modelData: BuilderModelData, context: BuilderContext) {
    const cacheKey = getObjectCacheKey(modelKey, objectId);
    const cachedObject = context.objectCache.get(cacheKey);

    if (cachedObject) {
        return cachedObject;
    }

    const objectData = modelData.resources.object[objectId] as BuilderObjectType;
    let builtObject: THREE.Object3D | undefined;

    if (objectData.mesh.vertices.length > 0 && objectData.mesh.triangles.length > 0) {
        builtObject = buildGroup(modelKey, objectData.mesh, modelData, context, objectData);
    }

    if (Array.isArray(objectData.components) && objectData.components.length > 0) {
        builtObject = buildComposite(modelKey, objectData.components, modelData, context);
    }

    if (builtObject) {
        if (objectData.name) {
            builtObject.name = objectData.name;
        }

        context.objectCache.set(cacheKey, builtObject);
    }

    return builtObject;
}

function getObjectCacheKey(modelKey: string, objectId: string) {
    return `${modelKey}:${objectId}`;
}

function buildGroup(
    modelKey: string,
    meshData: BuilderMeshData,
    modelData: BuilderModelData,
    context: BuilderContext,
    objectData: BuilderObjectType,
) {
    const group = new THREE.Group();
    const resourceMap = analyzeObject(meshData, objectData);
    const meshes = buildMeshes(modelKey, resourceMap, meshData, modelData, context, objectData);

    for (let i = 0; i < meshes.length; i++) {
        group.add(meshes[i]);
    }

    return group;
}

function analyzeObject(meshData: BuilderMeshData, objectData: BuilderObjectType) {
    const resourceMap: Record<string, TriangleProperty[]> = {};
    const triangleProperties = meshData.triangleProperties;
    const objectPid = objectData.pid;

    for (let i = 0; i < triangleProperties.length; i++) {
        const triangleProperty = triangleProperties[i];
        let pid = triangleProperty.pid !== undefined ? triangleProperty.pid : objectPid;

        if (pid === undefined) pid = "default";

        if (resourceMap[pid] === undefined) resourceMap[pid] = [];
        resourceMap[pid].push(triangleProperty);
    }

    return resourceMap;
}

function buildMeshes(
    modelKey: string,
    resourceMap: Record<string, TriangleProperty[]>,
    meshData: BuilderMeshData,
    modelData: BuilderModelData,
    context: BuilderContext,
    objectData: BuilderObjectType,
) {
    const keys = Object.keys(resourceMap);
    const meshes: THREE.Mesh[] = [];

    for (let i = 0; i < keys.length; i++) {
        const resourceId = keys[i];
        const triangleProperties = resourceMap[resourceId];
        const resourceType = getResourceType(resourceId, modelData);

        switch (resourceType) {
            case "material": {
                const basematerials = modelData.resources.basematerials[resourceId];
                const newMeshes = buildBasematerialsMeshes(
                    modelKey,
                    resourceId,
                    basematerials,
                    triangleProperties,
                    meshData,
                    modelData,
                    context,
                    objectData,
                );

                for (let j = 0; j < newMeshes.length; j++) {
                    meshes.push(newMeshes[j]);
                }

                break;
            }

            case "texture": {
                const texture2dgroup = modelData.resources.texture2dgroup[resourceId];
                meshes.push(buildTexturedMesh(modelKey, resourceId, texture2dgroup, triangleProperties, meshData, modelData, context));
                break;
            }

            case "vertexColors": {
                const colorgroup = modelData.resources.colorgroup[resourceId];
                meshes.push(buildVertexColorMesh(colorgroup, triangleProperties, meshData, objectData));
                break;
            }

            case "default":
                meshes.push(buildDefaultMesh(meshData));
                break;

            default:
                console.warn(`fast3mfBuilder: Unsupported resource type for pid \`${resourceId}\`.`);
        }
    }

    if (objectData.name) {
        for (let i = 0; i < meshes.length; i++) {
            meshes[i].name = objectData.name;
        }
    }

    return meshes;
}

function getResourceType(pid: string, modelData: BuilderModelData) {
    if (modelData.resources.texture2dgroup[pid] !== undefined) {
        return "texture";
    }
    if (modelData.resources.basematerials[pid] !== undefined) {
        return "material";
    }
    if (modelData.resources.colorgroup[pid] !== undefined) {
        return "vertexColors";
    }
    if (pid === "default") {
        return "default";
    }

    return undefined;
}

function buildBasematerialsMeshes(
    modelKey: string,
    basematerialsId: string,
    basematerials: BasematerialsType,
    triangleProperties: TriangleProperty[],
    meshData: BuilderMeshData,
    modelData: BuilderModelData,
    context: BuilderContext,
    objectData: BuilderObjectType,
) {
    const objectPindex = objectData.pindex !== undefined ? Number(objectData.pindex) : undefined;
    const materialMap = new Map<number, TriangleProperty[]>();

    for (let i = 0; i < triangleProperties.length; i++) {
        const triangleProperty = triangleProperties[i];
        const pindex = triangleProperty.p1 ?? objectPindex;
        if (pindex === undefined || pindex !== pindex) continue; // pindex !== pindex is faster NaN check

        let bucket = materialMap.get(pindex);
        if (bucket === undefined) {
            bucket = [];
            materialMap.set(pindex, bucket);
        }
        bucket.push(triangleProperty);
    }

    const meshes: THREE.Mesh[] = [];

    for (const [materialIndex, trianglePropertiesProps] of materialMap) {
        const basematerialData = basematerials.basematerials[materialIndex];

        if (!basematerialData) {
            throw new Error(`fast3mfBuilder: Cannot find base material index \`${materialIndex}\` in resource \`${basematerialsId}\` for model \`${modelKey}\`.`);
        }

        const material = getCachedBasematerial(modelKey, basematerialsId, basematerialData, modelData, context.resourceCache);

        const geometry = new THREE.BufferGeometry();
        const positionData = createTrianglePositionBuffer(meshData.vertices, trianglePropertiesProps);
        geometry.setAttribute("position", new THREE.BufferAttribute(positionData, 3));

        meshes.push(new THREE.Mesh(geometry, material));
    }

    return meshes;
}

function getCachedBasematerial(
    modelKey: string,
    basematerialsId: string,
    materialData: BasematerialType,
    modelData: BuilderModelData,
    resourceCache: ResourceCache,
) {
    const cacheKey = `material:${modelKey}:${basematerialsId}:${materialData.index}`;

    if (resourceCache.has(cacheKey)) {
        return resourceCache.get(cacheKey) as THREE.Material;
    }

    const material = buildBasematerial(materialData, modelData);
    resourceCache.set(cacheKey, material);
    return material;
}

function buildBasematerial(materialData: BasematerialType, modelData: BuilderModelData) {
    let material: THREE.MeshPhongMaterial | THREE.MeshStandardMaterial;

    const displaypropertiesid = materialData.displaypropertiesid;
    const pbmetallicdisplayproperties = modelData.resources.pbmetallicdisplayproperties;
    type MetallicDisplayProperties = {
        data: Array<{ roughness: number; metallicness: number }>;
    };
    const pbmetallicdisplayproperty = displaypropertiesid
        ? (pbmetallicdisplayproperties[displaypropertiesid] as MetallicDisplayProperties | undefined)
        : undefined;

    if (displaypropertiesid && pbmetallicdisplayproperty) {
        const metallicData = pbmetallicdisplayproperty.data[materialData.index];
        material = new THREE.MeshStandardMaterial({
            flatShading: true,
            roughness: metallicData.roughness,
            metalness: metallicData.metallicness,
        });
    } else {
        material = new THREE.MeshPhongMaterial({ flatShading: true });
    }

    material.name = materialData.name;

    const displaycolor = materialData.displaycolor;
    const color = displaycolor.substring(0, 7);
    material.color.setStyle(color, COLOR_SPACE_3MF);

    if (displaycolor.length === 9) {
        material.opacity = parseInt(displaycolor.charAt(7) + displaycolor.charAt(8), 16) / 255;
    }

    return material;
}

function buildTexturedMesh(
    modelKey: string,
    texture2dgroupId: string,
    texture2dgroup: BuilderTexture2dGroupType,
    triangleProperties: TriangleProperty[],
    meshData: BuilderMeshData,
    modelData: BuilderModelData,
    context: BuilderContext,
) {
    const geometry = new THREE.BufferGeometry();
    const { positionData, uvData } = createTexturedBuffers(meshData.vertices, texture2dgroup.uvs, triangleProperties);

    geometry.setAttribute("position", new THREE.BufferAttribute(positionData, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvData, 2));

    const material = getCachedTexturedMaterial(modelKey, texture2dgroupId, texture2dgroup, modelData, context);

    return new THREE.Mesh(geometry, material);
}

function getCachedTexturedMaterial(
    modelKey: string,
    texture2dgroupId: string,
    texture2dgroup: BuilderTexture2dGroupType,
    modelData: BuilderModelData,
    context: BuilderContext,
) {
    const materialCacheKey = `texmat:${modelKey}:${texture2dgroupId}`;

    if (context.resourceCache.has(materialCacheKey)) {
        return context.resourceCache.get(materialCacheKey) as THREE.Material;
    }

    const texture = getCachedTexture(modelKey, texture2dgroupId, texture2dgroup, modelData, context.textureData, context.resourceCache);
    const material = new THREE.MeshPhongMaterial({ map: texture, flatShading: true });
    context.resourceCache.set(materialCacheKey, material);
    return material;
}

function getCachedTexture(
    modelKey: string,
    texture2dgroupId: string,
    texture2dgroup: BuilderTexture2dGroupType,
    modelData: BuilderModelData,
    textureData: Record<string, ArrayBuffer>,
    resourceCache: ResourceCache,
) {
    const cacheKey = `texture:${modelKey}:${texture2dgroupId}`;

    if (resourceCache.has(cacheKey)) {
        return resourceCache.get(cacheKey) as THREE.Texture;
    }

    const texture = buildTexture(modelKey, texture2dgroupId, texture2dgroup, modelData, textureData);
    resourceCache.set(cacheKey, texture);
    return texture;
}

function buildTexture(
    modelKey: string,
    texture2dgroupId: string,
    texture2dgroup: BuilderTexture2dGroupType,
    modelData: BuilderModelData,
    textureData: Record<string, ArrayBuffer>,
) {
    const textureLoader = new THREE.TextureLoader();
    const texid = texture2dgroup.texid;
    const texture2d = modelData.resources.texture2d[texid];

    if (!texture2d) {
        throw new Error(
            `fast3mfBuilder: Cannot find texture resource \`${texid}\` referenced by texture group \`${texture2dgroupId}\` in model \`${modelKey}\`.`,
        );
    }

    const textureKey = toArchivePartKey(texture2d.path, "texture resource path");
    const data = textureData[textureKey];
    if (!data) {
        throw new Error(
            `fast3mfBuilder: Cannot find texture binary \`${texture2d.path}\` referenced by texture resource \`${texid}\` in model \`${modelKey}\`.`,
        );
    }

    const blob = new Blob([data], { type: texture2d.contenttype });
    const sourceURI = URL.createObjectURL(blob);

    const texture = textureLoader.load(sourceURI, () => {
        URL.revokeObjectURL(sourceURI);
    });

    texture.colorSpace = COLOR_SPACE_3MF;

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
}

function buildVertexColorMesh(
    colorgroup: BuilderColorGroupType,
    triangleProperties: TriangleProperty[],
    meshData: BuilderMeshData,
    objectData: BuilderObjectType,
) {
    const fallbackPindex = objectData.pindex !== undefined ? Number(objectData.pindex) : undefined;
    const geometry = new THREE.BufferGeometry();
    const { positionData, colorData } = createVertexColorBuffers(meshData.vertices, colorgroup.colors, triangleProperties, fallbackPindex);

    geometry.setAttribute("position", new THREE.BufferAttribute(positionData, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colorData, 3));

    const material = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true });
    return new THREE.Mesh(geometry, material);
}

function buildDefaultMesh(meshData: BuilderMeshData) {
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(meshData.triangles as any, 1));
    geometry.setAttribute("position", new THREE.BufferAttribute(meshData.vertices as any, 3));

    const material = new THREE.MeshPhongMaterial({
        name: THREE.Loader.DEFAULT_MATERIAL_NAME,
        color: 0xffffff,
        flatShading: true,
    });

    return new THREE.Mesh(geometry, material);
}

function createTexturedBuffers(vertices: ArrayLike<number>, uvs: ArrayLike<number>, triangleProperties: TriangleProperty[]) {
    let validTriangleCount = 0;

    for (let i = 0; i < triangleProperties.length; i++) {
        const triangle = triangleProperties[i];
        if (triangle.p1 !== undefined && triangle.p2 !== undefined && triangle.p3 !== undefined) {
            validTriangleCount += 1;
        }
    }

    const positionData = new Float32Array(validTriangleCount * 9);
    const uvData = new Float32Array(validTriangleCount * 6);
    let positionOffset = 0;
    let uvOffset = 0;

    for (let i = 0; i < triangleProperties.length; i++) {
        const triangle = triangleProperties[i];
        if (triangle.p1 === undefined || triangle.p2 === undefined || triangle.p3 === undefined) continue;

        const v1 = triangle.v1 * 3;
        positionData[positionOffset + 0] = vertices[v1 + 0];
        positionData[positionOffset + 1] = vertices[v1 + 1];
        positionData[positionOffset + 2] = vertices[v1 + 2];

        const v2 = triangle.v2 * 3;
        positionData[positionOffset + 3] = vertices[v2 + 0];
        positionData[positionOffset + 4] = vertices[v2 + 1];
        positionData[positionOffset + 5] = vertices[v2 + 2];

        const v3 = triangle.v3 * 3;
        positionData[positionOffset + 6] = vertices[v3 + 0];
        positionData[positionOffset + 7] = vertices[v3 + 1];
        positionData[positionOffset + 8] = vertices[v3 + 2];
        positionOffset += 9;

        const uv1 = triangle.p1 * 2;
        uvData[uvOffset + 0] = uvs[uv1 + 0];
        uvData[uvOffset + 1] = uvs[uv1 + 1];

        const uv2 = triangle.p2 * 2;
        uvData[uvOffset + 2] = uvs[uv2 + 0];
        uvData[uvOffset + 3] = uvs[uv2 + 1];

        const uv3 = triangle.p3 * 2;
        uvData[uvOffset + 4] = uvs[uv3 + 0];
        uvData[uvOffset + 5] = uvs[uv3 + 1];
        uvOffset += 6;
    }

    return { positionData, uvData };
}

function createVertexColorBuffers(
    vertices: ArrayLike<number>,
    colors: ArrayLike<number>,
    triangleProperties: TriangleProperty[],
    fallbackPindex?: number,
) {
    let validTriangleCount = 0;

    for (let i = 0; i < triangleProperties.length; i++) {
        const triangle = triangleProperties[i];
        const p1 = triangle.p1 ?? fallbackPindex;
        const p2 = triangle.p2 ?? p1;
        const p3 = triangle.p3 ?? p1;
        if (p1 !== undefined && p2 !== undefined && p3 !== undefined) {
            validTriangleCount += 1;
        }
    }

    const positionData = new Float32Array(validTriangleCount * 9);
    const colorData = new Float32Array(validTriangleCount * 9);
    let positionOffset = 0;
    let colorOffset = 0;

    for (let i = 0; i < triangleProperties.length; i++) {
        const triangle = triangleProperties[i];
        const p1 = triangle.p1 ?? fallbackPindex;
        const p2 = triangle.p2 ?? p1;
        const p3 = triangle.p3 ?? p1;
        if (p1 === undefined || p2 === undefined || p3 === undefined) continue;

        const v1 = triangle.v1 * 3;
        positionData[positionOffset + 0] = vertices[v1 + 0];
        positionData[positionOffset + 1] = vertices[v1 + 1];
        positionData[positionOffset + 2] = vertices[v1 + 2];

        const v2 = triangle.v2 * 3;
        positionData[positionOffset + 3] = vertices[v2 + 0];
        positionData[positionOffset + 4] = vertices[v2 + 1];
        positionData[positionOffset + 5] = vertices[v2 + 2];

        const v3 = triangle.v3 * 3;
        positionData[positionOffset + 6] = vertices[v3 + 0];
        positionData[positionOffset + 7] = vertices[v3 + 1];
        positionData[positionOffset + 8] = vertices[v3 + 2];
        positionOffset += 9;

        const c1 = p1 * 3;
        colorData[colorOffset + 0] = colors[c1 + 0];
        colorData[colorOffset + 1] = colors[c1 + 1];
        colorData[colorOffset + 2] = colors[c1 + 2];

        const c2 = p2 * 3;
        colorData[colorOffset + 3] = colors[c2 + 0];
        colorData[colorOffset + 4] = colors[c2 + 1];
        colorData[colorOffset + 5] = colors[c2 + 2];

        const c3 = p3 * 3;
        colorData[colorOffset + 6] = colors[c3 + 0];
        colorData[colorOffset + 7] = colors[c3 + 1];
        colorData[colorOffset + 8] = colors[c3 + 2];
        colorOffset += 9;
    }

    return { positionData, colorData };
}

function parseTransform(t: number[]) {
    const matrix = new THREE.Matrix4();
    matrix.set(t[0], t[3], t[6], t[9], t[1], t[4], t[7], t[10], t[2], t[5], t[8], t[11], 0.0, 0.0, 0.0, 1.0);
    return matrix;
}

function buildComposite(modelKey: string, compositeData: ComponentType[], modelData: BuilderModelData, context: BuilderContext) {
    const composite = new THREE.Group();

    for (let i = 0; i < compositeData.length; i++) {
        const component = compositeData[i];
        if (!modelData.resources.object[component.objectId]) {
            throw new Error(`fast3mfBuilder: Cannot find component object \`${component.objectId}\` in model \`${modelKey}\`.`);
        }

        let build = context.objectCache.get(getObjectCacheKey(modelKey, component.objectId));

        if (build === undefined) {
            build = buildObject(modelKey, component.objectId, modelData, context);
        }

        if (!build) {
            throw new Error(`fast3mfBuilder: Cannot find component object \`${component.objectId}\` in model \`${modelKey}\`.`);
        }

        const object3D = build.clone();
        const transform = component.transform;
        if (transform) {
            object3D.applyMatrix4(parseTransform(transform));
        }

        composite.add(object3D);
    }

    return composite;
}

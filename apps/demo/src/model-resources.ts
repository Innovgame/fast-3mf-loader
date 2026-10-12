import type { Mesh, Texture, BufferGeometry, Material, Object3D } from "three";

export function isMesh(object: Object3D): object is Mesh {
    return "isMesh" in object && object.isMesh === true;
}

function isTexture(value: unknown): value is Texture {
    return typeof value === "object" && value !== null && "isTexture" in value && value.isTexture === true;
}

export function disposeModel(group: Object3D) {
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    const textures = new Set<Texture>();
    group.traverse((object) => {
        if (!isMesh(object)) return;
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            materials.add(material);
            for (const value of Object.values(material)) {
                if (isTexture(value)) textures.add(value);
            }
        }
    });
    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
    geometries.forEach((geometry) => geometry.dispose());
}

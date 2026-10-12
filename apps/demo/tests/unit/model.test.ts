import { describe, expect, it, vi } from "vitest";
import { BufferGeometry, Group, Mesh, MeshBasicMaterial, Texture } from "three";
import { measureModel, measureComparison } from "../../src/model-runner";
import { disposeModel } from "../../src/model-resources";

describe("browser demo measurements", () => {
    it("keeps file reading outside parse/build timing and can reread a transferred source for comparison", async () => {
        const source = { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
        const times = [100, 120, 125];
        const result = await measureModel(source, {
            parse: async (buffer) => {
                const transferred = structuredClone(buffer, { transfer: [buffer] });
                expect(buffer.byteLength).toBe(0);
                return new Uint8Array(transferred)[0];
            },
            build: (data) => ({ value: data }),
            now: () => times.shift()!,
        });
        expect(result).toEqual({ group: { value: 1 }, parse: 20, build: 5, total: 25 });
        const comparisonTimes = [200, 240];
        const comparison = await measureComparison(
            source,
            (buffer) => {
                expect([...new Uint8Array(buffer)]).toEqual([1, 2, 3]);
                return { value: 2 };
            },
            () => comparisonTimes.shift()!,
        );
        expect(comparison).toEqual({ group: { value: 2 }, total: 40 });
    });

    it("rejects a parse failure without attempting to build", async () => {
        const build = vi.fn();
        await expect(
            measureModel(
                { arrayBuffer: async () => new ArrayBuffer(1) },
                {
                    parse: async () => {
                        throw new Error("broken archive");
                    },
                    build,
                },
            ),
        ).rejects.toThrow("broken archive");
        expect(build).not.toHaveBeenCalled();
    });

    it("disposes shared geometry, materials and textures once when a model is replaced", () => {
        const geometry = new BufferGeometry();
        const texture = new Texture();
        const material = new MeshBasicMaterial({ map: texture });
        const group = new Group();
        group.add(new Mesh(geometry, [material, material]), new Mesh(geometry, material));
        const geometryDispose = vi.spyOn(geometry, "dispose");
        const materialDispose = vi.spyOn(material, "dispose");
        const textureDispose = vi.spyOn(texture, "dispose");
        disposeModel(group);
        expect(geometryDispose).toHaveBeenCalledTimes(1);
        expect(materialDispose).toHaveBeenCalledTimes(1);
        expect(textureDispose).toHaveBeenCalledTimes(1);
    });
});

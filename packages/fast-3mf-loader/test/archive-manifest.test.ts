import { strToU8 } from "fflate";
import { describe, expect, test, vi } from "vitest";
import { collectArchiveManifest, createProgressTracker } from "../lib/archive-manifest";

describe("collectArchiveManifest", () => {
    test("classifies root model, sub-models, textures, relationships, and print tickets", () => {
        const manifest = collectArchiveManifest({
            "_rels/.rels": strToU8(""),
            "3D/3dmodel.model": strToU8(""),
            "3D/parts/chassis.model": strToU8(""),
            "3D/Textures/atlas.png": strToU8(""),
            "Metadata/printticket.xml": strToU8(""),
        });

        expect(manifest.relsName).toBe("_rels/.rels");
        expect(manifest.rootModelFile).toBe("3D/3dmodel.model");
        expect(manifest.modelPartNames).toEqual(["3D/parts/chassis.model"]);
        expect(manifest.texturesPartNames).toEqual(["3D/Textures/atlas.png"]);
        expect(manifest.printTicketPartNames).toEqual(["Metadata/printticket.xml"]);
    });
});

describe("createProgressTracker", () => {
    test("emits monotonic aggregated progress without rescanning every part", () => {
        const onProgress = vi.fn();
        const track = createProgressTracker(3, onProgress);

        track(100);
        track(100);
        track(100);

        expect(onProgress.mock.calls.map(([value]) => value)).toEqual([50, 70, 90]);
    });
});

import type { Unzipped } from "fflate";

export type ArchiveManifest = {
    relsName?: string;
    modelRelsName?: string;
    rootModelFile?: string;
    modelPartNames: string[];
    texturesPartNames: string[];
    printTicketPartNames: string[];
};

export function collectArchiveManifest(zip: Unzipped): ArchiveManifest {
    const manifest: ArchiveManifest = {
        modelPartNames: [],
        texturesPartNames: [],
        printTicketPartNames: [],
    };

    for (const file in zip) {
        if (file.endsWith("_rels/.rels")) {
            manifest.relsName = file;
            continue;
        }

        if (file.startsWith("3D/_rels/") && file.endsWith(".model.rels")) {
            manifest.modelRelsName = file;
            continue;
        }

        if (file.startsWith("3D/") && file.endsWith(".model") && !file.slice(3).includes("/")) {
            manifest.rootModelFile = file;
            continue;
        }

        if (file.startsWith("3D/") && file.endsWith(".model")) {
            manifest.modelPartNames.push(file);
            continue;
        }

        if (file.startsWith("3D/Texture") || file.startsWith("3D/Textures/")) {
            manifest.texturesPartNames.push(file);
            continue;
        }

        if (/printticket/i.test(file)) {
            manifest.printTicketPartNames.push(file);
        }
    }

    return manifest;
}

export function createProgressTracker(totalParts: number, onProgress?: (percent: number) => void) {
    let completed = 0;

    return (deltaPercent: number) => {
        completed += deltaPercent;
        const relative = completed / (totalParts * 100);
        onProgress?.(Math.trunc(30 + relative * 60));
    };
}

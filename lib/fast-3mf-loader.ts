import UZipWorker from "./unzip.worker?worker&inline";
import ParseModelWorker from "./parse-model.worker?worker&inline";
import { type Unzipped } from "fflate";
import { WorkerPool } from "./WorkerPool";
import { ParseResult, ParsedModelPart, Relationship } from "./util";
import { collectArchiveManifest, createProgressTracker } from "./archive-manifest";

type UnzipWorkerMessage = { type: "done"; zip: Unzipped } | { type: "error"; message: string };
const DEFAULT_WORKER_COUNT = 4;
const MAX_DEFAULT_WORKER_COUNT = 15;
const GENERIC_WORKER_EXECUTION_ERROR = "Worker execution failed.";

function getErrorMessage(error: unknown): string | undefined {
    const raw = error instanceof Error ? error.message : String(error);
    if (!raw || raw === "undefined" || raw === GENERIC_WORKER_EXECUTION_ERROR) {
        return undefined;
    }

    return raw;
}

function toLoaderError(error: unknown, fallback: string): Error {
    const message = getErrorMessage(error) ?? fallback;

    if (message.startsWith("Fast3MFLoader:")) {
        return new Error(message);
    }

    return new Error(`Fast3MFLoader: ${message}`);
}

function toModelPartParseError(modelPart: string, error: unknown): Error {
    return new Error(getErrorMessage(error) ?? `Failed to parse model part \`${modelPart}\`.`);
}

function getArchivePartOrThrow(zip: Unzipped, partName: string, partType: string) {
    const part = zip[partName];

    if (!part) {
        throw new Error(`Failed to read ${partType} \`${partName}\` from 3MF archive.`);
    }

    return part;
}

function toWorkerRuntimeError(): Error {
    return new Error("Worker runtime is unavailable. This library requires browser support for Worker and Blob.");
}

function createWorkerOrThrow<T>(factory: () => T): T {
    try {
        return factory();
    } catch {
        throw toWorkerRuntimeError();
    }
}

function isUnzipWorkerMessage(payload: UnzipWorkerMessage | Unzipped): payload is UnzipWorkerMessage {
    return typeof payload === "object" && payload !== null && "type" in payload && (payload.type === "done" || payload.type === "error");
}

async function unzipData(data: ArrayBuffer) {
    return new Promise<Unzipped>((resolve, reject) => {
        let worker: InstanceType<typeof UZipWorker>;
        try {
            worker = createWorkerOrThrow(() => new UZipWorker());
        } catch (error) {
            reject(error);
            return;
        }
        worker.onmessage = (evt: MessageEvent<UnzipWorkerMessage | Unzipped>) => {
            const payload = evt.data;

            if (isUnzipWorkerMessage(payload)) {
                if (payload.type === "done") {
                    resolve(payload.zip);
                } else {
                    reject(new Error(payload.message));
                }
            } else {
                resolve(payload);
            }
            worker.terminate();
        };
        worker.onerror = (err: ErrorEvent) => {
            reject(new Error(err.message || "Failed to unzip 3MF archive."));
            worker.terminate();
        };

        worker.postMessage(data, { transfer: [data] });
    });
}

type MessageParseModel = { type: "done"; state: ParsedModelPart } | { type: "error"; message: string };

export type { ParseResult, ParsedModelPart, Relationship };
export type Model3MF = ParseResult;

export type ParseOptions = {
    onProgress?: (percent: number) => void;
    workerCount?: number;
};

function isValidRequestedWorkerCount(requestedCount: unknown): requestedCount is number {
    return typeof requestedCount === "number" && Number.isFinite(requestedCount) && requestedCount > 0;
}

function isArrayBuffer(data: unknown): data is ArrayBuffer {
    return data instanceof ArrayBuffer;
}

export function resolveWorkerCount(requestedCount?: number, hardwareConcurrency = globalThis.navigator?.hardwareConcurrency): number {
    if (isValidRequestedWorkerCount(requestedCount)) {
        return Math.floor(requestedCount);
    }

    if (typeof hardwareConcurrency === "number" && Number.isFinite(hardwareConcurrency) && hardwareConcurrency > 0) {
        return Math.max(1, Math.min(Math.floor(hardwareConcurrency) - 1, MAX_DEFAULT_WORKER_COUNT));
    }

    return DEFAULT_WORKER_COUNT;
}

export class Fast3MFLoader {
    async parse(data: ArrayBuffer, options: ParseOptions = {}): Promise<ParseResult> {
        if (!isArrayBuffer(data)) {
            throw new Error("Fast3MFLoader: `data` must be an ArrayBuffer.");
        }

        let zip: Unzipped | undefined;
        const onProgress = options.onProgress;
        if (options.workerCount !== undefined && !isValidRequestedWorkerCount(options.workerCount)) {
            console.warn("Fast3MFLoader: Invalid `workerCount` option. Falling back to the default worker strategy.");
        }
        const workerCount = resolveWorkerCount(options.workerCount);

        onProgress?.(10);
        let manifest;
        try {
            zip = await unzipData(data);
            manifest = collectArchiveManifest(zip);
        } catch (error) {
            throw toLoaderError(error, "Failed to unzip 3MF archive.");
        }
        onProgress?.(30);
        if (!zip) throw new Error("Fast3MFLoader: Failed to unzip 3MF archive.");
        if (!manifest) throw new Error("Fast3MFLoader: Failed to inspect 3MF archive contents.");

        const { relsName, modelRelsName, rootModelFile, modelPartNames, texturesPartNames, printTicketPartNames } = manifest;
        if (!rootModelFile) throw new Error("Fast3MFLoader: Cannot find root model file in 3MF archive.");

        modelPartNames.push(rootModelFile); // push root model at the end so it is processed after the sub models
        if (relsName === undefined) throw new Error("Fast3MFLoader: Cannot find relationship file `rels` in 3MF archive.");

        const parseModelWorkerPool = new WorkerPool(workerCount);
        try {
            parseModelWorkerPool.setWorkerCreator(() => {
                return createWorkerOrThrow(() => new ParseModelWorker());
            });

            const reportProgress = createProgressTracker(modelPartNames.length, onProgress);

            const prommies = modelPartNames.map(async (modelPart) => {
                const view = getArchivePartOrThrow(zip, modelPart, "model part");

                try {
                    const data = await parseModelWorkerPool.postMessage<MessageEvent<MessageParseModel>>(view, { transfer: [view.buffer] });
                    reportProgress(100);
                    return data;
                } catch (error) {
                    throw toModelPartParseError(modelPart, error);
                }
            });

            // modelParts
            const messages = await Promise.all(prommies);
            // const modelParts = messages.map((v) => v.data.state);
            const modelParts: Record<string, ParsedModelPart> = {};
            for (let i = 0; i < modelPartNames.length; i++) {
                const modelPart = modelPartNames[i];
                const data = messages[i].data;
                if (data.type === "done") {
                    const modelData = data.state;
                    modelParts[modelPart] = modelData;
                } else {
                    throw toModelPartParseError(modelPart, data.message);
                }
            }

            const textDecoder = new TextDecoder();
            // rels
            if (relsName === undefined) throw new Error("Fast3MFLoader: Cannot find relationship file `rels` in 3MF archive.");
            const relsView = getArchivePartOrThrow(zip, relsName, "relationship file");
            const relsFileText = textDecoder.decode(relsView);
            const rels = this.parseRelsXml(relsFileText, relsName, "relationship file");
            onProgress?.(95);

            // modelRels
            let modelRels: Relationship[] | undefined;
            if (modelRelsName) {
                const relsView = getArchivePartOrThrow(zip, modelRelsName, "model relationship file");
                const relsFileText = textDecoder.decode(relsView);
                modelRels = this.parseRelsXml(relsFileText, modelRelsName, "model relationship file");
            }

            onProgress?.(98);

            // texturesParts
            const texturesParts: { [key: string]: ArrayBuffer } = {};
            for (let i = 0; i < texturesPartNames.length; i++) {
                const texturesPartName = texturesPartNames[i];
                const textureView = getArchivePartOrThrow(zip, texturesPartName, "texture part");
                texturesParts[texturesPartName] = textureView.buffer as ArrayBuffer;
            }

            // printTicketParts TODO:
            const printTicketParts: Record<string, never> = {};
            if (printTicketPartNames.length > 0) {
                console.warn("Fast3MFLoader: 3MF print tickets are not supported yet.");
            }
            onProgress?.(100);

            return {
                rels: rels,
                modelRels: modelRels,
                model: modelParts,
                printTicket: printTicketParts,
                texture: texturesParts,
            };
        } catch (error) {
            throw toLoaderError(error, "Failed to parse 3MF archive.");
        } finally {
            parseModelWorkerPool.dispose();
        }
    }

    private parseRelsXml(relsFileText: string, partName: string, partType: string): Relationship[] {
        const relationships: Relationship[] = [];
        const relationshipPattern = /<Relationship\b([^>]*)\/?>/g;
        const attributePattern = /\b(Target|Id|Type)\s*=\s*(["'])(.*?)\2/g;

        for (const match of relsFileText.matchAll(relationshipPattern)) {
            const attrsText = match[1] ?? "";
            const relationship = {
                target: null as string | null,
                id: null as string | null,
                type: null as string | null,
            };

            for (const attrMatch of attrsText.matchAll(attributePattern)) {
                const [, key, , value] = attrMatch;
                if (key === "Target") relationship.target = value;
                if (key === "Id") relationship.id = value;
                if (key === "Type") relationship.type = value;
            }

            const missingAttributes: string[] = [];
            if (!relationship.target) missingAttributes.push("Target");
            if (!relationship.id) missingAttributes.push("Id");
            if (!relationship.type) missingAttributes.push("Type");

            if (missingAttributes.length > 0) {
                throw new Error(
                    `Fast3MFLoader: Invalid relationship entry in ${partType} \`${partName}\`: missing ${missingAttributes.join(", ")}.`,
                );
            }

            relationships.push(relationship);
        }

        if (relsFileText.includes("<Relationship") && relationships.length === 0) {
            throw new Error(`Fast3MFLoader: Failed to parse ${partType} \`${partName}\`.`);
        }

        return relationships;
    }
}

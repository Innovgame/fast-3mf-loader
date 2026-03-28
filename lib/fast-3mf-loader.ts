import UZipWorker from "./unzip.worker?worker&inline";
import ParseModelWorker from "./parse-model.worker?worker&inline";
import { type Unzipped } from "fflate";
import { WorkerPool } from "./WorkerPool";
import { StateType } from "./util";

async function unzipData(data: ArrayBuffer) {
    return new Promise<Unzipped>((resolve, reject) => {
        const worker = new UZipWorker();
        worker.onmessage = (evt: MessageEvent<Unzipped>) => {
            resolve(evt.data);
            worker.terminate();
        };
        worker.onerror = (err: ErrorEvent) => {
            reject(err);
            worker.terminate();
        };

        worker.postMessage(data, { transfer: [data] });
    });
}

type MessageParseModel = { type: "done"; state: StateType } | { type: "error"; message: string };

export class Fast3MFLoader {
    async parse(
        data: ArrayBuffer,
        options: { onProgress?: (percent: number) => void; workerCount?: number } = {
            onProgress() {},
            workerCount: Math.min(navigator.hardwareConcurrency - 1, 15),
        }
    ) {
        let zip: Unzipped | undefined;
        const modelPartNames: string[] = [];
        let relsName: string | undefined;
        let modelRelsName: string | undefined;
        const texturesPartNames = [];
        let rootModelFile: any | undefined;
        const { onProgress, workerCount } = options;

        onProgress?.(10);
        try {
            zip = await unzipData(data);
            for (const file in zip) {
                if (file.match(/\_rels\/.rels$/)) {
                    relsName = file;
                } else if (file.match(/3D\/_rels\/.*\.model\.rels$/)) {
                    modelRelsName = file;
                } else if (file.match(/^3D\/[^\/]*\.model$/)) {
                    rootModelFile = file;
                } else if (file.match(/^3D\/.*\/.*\.model$/)) {
                    modelPartNames.push(file); // sub models
                } else if (file.match(/^3D\/Textures?\/.*/)) {
                    texturesPartNames.push(file);
                }
            }
        } catch (error) {
            console.error("uzip data error: ", error);
            return undefined;
        }
        onProgress?.(30);
        if (!zip) throw new Error("unzip error");

        modelPartNames.push(rootModelFile); // push root model at the end so it is processed after the sub models
        if (relsName === undefined) throw new Error("THREE.ThreeMFLoader: Cannot find relationship file `rels` in 3MF archive.");

        const parseModelWorkerPool = new WorkerPool(workerCount);
        try {
            parseModelWorkerPool.setWorkerCreator(() => {
                return new ParseModelWorker();
            });

            const percentArray = new Array<number>(modelPartNames.length).fill(0);
            const obj_progress = (curr: number, index: number) => {
                percentArray[index] = curr;
                const num = percentArray.reduce((prev, curr) => prev + curr, 0);
                const percent = ~~(num / modelPartNames.length);
                onProgress?.(~~(30 + percent * 0.6));
            };

            const prommies = modelPartNames.map(async (modelPart, index) => {
                const view = zip[modelPart];
                const data = await parseModelWorkerPool.postMessage<MessageEvent<MessageParseModel>>(view, { transfer: [view.buffer] });
                obj_progress(100, index);
                return data;
            });

            // modelParts
            const messages = await Promise.all(prommies);
            // const modelParts = messages.map((v) => v.data.state);
            const modelParts: { [key: string]: StateType } = {};
            for (let i = 0; i < modelPartNames.length; i++) {
                const modelPart = modelPartNames[i];
                const data = messages[i].data;
                if (data.type === "done") {
                    const modelData = data.state;
                    modelParts[modelPart] = modelData;
                } else {
                    throw new Error(data.message);
                }
            }

            const textDecoder = new TextDecoder();
            // rels
            if (relsName === undefined) throw new Error("THREE.ThreeMFLoader: Cannot find relationship file `rels` in 3MF archive.");
            console.time("rels");
            const relsView = zip[relsName];
            const relsFileText = textDecoder.decode(relsView);
            const rels = this.parseRelsXml(relsFileText);
            console.timeEnd("rels");
            onProgress?.(95);

            // modelRels
            let modelRels;
            if (modelRelsName) {
                console.time("modelRels");
                const relsView = zip[modelRelsName];
                const relsFileText = textDecoder.decode(relsView);
                modelRels = this.parseRelsXml(relsFileText);
                console.timeEnd("modelRels");
            }

            onProgress?.(98);

            // texturesParts
            const texturesParts: { [key: string]: ArrayBuffer } = {};
            for (let i = 0; i < texturesPartNames.length; i++) {
                const texturesPartName = texturesPartNames[i];
                texturesParts[texturesPartName] = zip[texturesPartName].buffer as ArrayBuffer;
            }

            // printTicketParts TODO:
            const printTicketParts = {};
            onProgress?.(100);

            return {
                rels: rels,
                modelRels: modelRels,
                model: modelParts,
                printTicket: printTicketParts,
                texture: texturesParts,
            };
        } catch (error) {
            console.error("parseModelWorkerPool error: ", error);
        } finally {
            parseModelWorkerPool.dispose();
        }
    }

    private parseRelsXml(relsFileText: string) {
        const relationships = [];
        const relationshipPattern = /<Relationship\b([^>]*)\/?>/g;
        const attributePattern = /\b(Target|Id|Type)="([^"]*)"/g;

        for (const match of relsFileText.matchAll(relationshipPattern)) {
            const attrsText = match[1] ?? "";
            const relationship = {
                target: null as string | null,
                id: null as string | null,
                type: null as string | null,
            };

            for (const attrMatch of attrsText.matchAll(attributePattern)) {
                const [, key, value] = attrMatch;
                if (key === "Target") relationship.target = value;
                if (key === "Id") relationship.id = value;
                if (key === "Type") relationship.type = value;
            }

            relationships.push(relationship);
        }

        return relationships;
    }
}

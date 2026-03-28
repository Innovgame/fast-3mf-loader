/**
 * WorkerPool
 * @description worker pool
 */
export class WorkerPool {
    public queue: any[];
    public pool: number;
    public workers: any[];
    public workersResolve: any[];
    public workersReject: any[];
    public workerStatus: number;
    public workerCreator: () => Worker;
    public onMessage: () => void;

    constructor(pool?: number) {
        this.pool = pool || 4;
        this.queue = [];
        this.workers = [];
        this.workersResolve = [];
        this.workersReject = [];
        this.workerStatus = 0;
        this.workerCreator = null!;
        this.onMessage = null!;
    }

    _initWorker(workerId: number) {
        if (!this.workers[workerId]) {
            const worker = this.workerCreator();
            worker.addEventListener("message", this._onMessage.bind(this, workerId));
            worker.addEventListener("error", this._onError.bind(this, workerId));
            this.workers[workerId] = worker;
        }
    }

    _getIdleWorker() {
        for (let i = 0; i < this.pool; i++) if (!(this.workerStatus & (1 << i))) return i;

        return -1;
    }

    _onMessage(workerId: number, msg: any) {
        const resolve = this.workersResolve[workerId];
        resolve && resolve(msg);
        this.workersResolve[workerId] = undefined;
        this.workersReject[workerId] = undefined;
        this.onMessage && this.onMessage();

        this._dispatchNext(workerId);
    }

    _onError(workerId: number, error: ErrorEvent) {
        const reject = this.workersReject[workerId];
        reject && reject(new Error(error.message || "Worker execution failed."));
        this.workersResolve[workerId] = undefined;
        this.workersReject[workerId] = undefined;
        this._disposeWorker(workerId);

        this._dispatchNext(workerId);
    }

    _dispatchNext(workerId: number) {
        if (this.queue.length) {
            const { resolve, reject, msg, transfer } = this.queue.shift();
            this._initWorker(workerId);
            this.workersResolve[workerId] = resolve;
            this.workersReject[workerId] = reject;
            this.workers[workerId].postMessage(msg, transfer);
        } else {
            this.workerStatus &= ~(1 << workerId);
        }
    }

    _disposeWorker(workerId: number) {
        const worker = this.workers[workerId];
        if (worker) worker.terminate();
        this.workers[workerId] = undefined;
    }

    setWorkerCreator(workerCreator: () => Worker) {
        this.workerCreator = workerCreator;
    }

    setWorkerLimit(pool: number) {
        this.pool = pool;
    }

    postMessage<T = any>(msg: any, transfer: StructuredSerializeOptions = { transfer: [] }) {
        return new Promise<T>((resolve, reject) => {
            const workerId = this._getIdleWorker();

            if (workerId !== -1) {
                this._initWorker(workerId);
                this.workerStatus |= 1 << workerId;
                this.workersResolve[workerId] = resolve;
                this.workersReject[workerId] = reject;
                this.workers[workerId].postMessage(msg, transfer);
            } else {
                this.queue.push({ resolve, reject, msg, transfer });
            }
        });
    }

    dispose() {
        this.workers.forEach((worker) => worker?.terminate());
        this.workersResolve.length = 0;
        this.workersReject.length = 0;
        this.workers.length = 0;
        this.queue.length = 0;
        this.workerStatus = 0;
    }
}

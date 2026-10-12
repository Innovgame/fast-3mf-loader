import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const child = spawn(process.execPath, [resolve(scriptDir, "benchmark.mjs")], {
    cwd: resolve(scriptDir, ".."),
    env: {
        ...process.env,
        FAST3MF_BENCHMARK_WARMUP_RUNS: "2",
        FAST3MF_BENCHMARK_MEASURED_RUNS: "7",
        FAST3MF_BENCHMARK_WORKERS: "6",
    },
    stdio: "inherit",
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exit(code ?? 1);
});

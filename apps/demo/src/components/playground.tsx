import { useState, type RefObject } from "react";
import {
    Box,
    CheckCircle2,
    CircleAlert,
    Clock3,
    Cpu,
    FileBox,
    Files,
    FolderOpen,
    Image,
    Info,
    Layers,
    LoaderCircle,
    LockKeyhole,
    Play,
    Triangle,
    Upload,
    X,
} from "lucide-react";
import { projectLinks } from "../content";
import { usePreferences } from "../preferences";
import { useDemo } from "../use-demo";
import { Badge, Button, Hint, Progress, Tabs, TabsContent, TabsList, TabsTrigger } from "./ui";
import { ModelPreview } from "./model-preview";

export function Playground({ fileInput }: { fileInput: RefObject<HTMLInputElement | null> }) {
    const { t, language } = usePreferences();
    const demo = useDemo();
    const input = fileInput;
    const [workers, setWorkers] = useState("auto");
    const [dragging, setDragging] = useState(false);
    const ms = (value: number) => value.toLocaleString(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const count = (value: number) => value.toLocaleString(language);
    const choose = () => input.current?.click();
    const load = (file: File) => {
        setDragging(false);
        void demo.load(file, workers === "auto" ? undefined : Number(workers));
    };
    const metrics = demo.metrics;
    const baseline = demo.comparison && "total" in demo.comparison ? demo.comparison.total : null;
    const chartMax = Math.max(metrics?.total ?? 0, baseline ?? 0, 0.001);

    return (
        <section id="demo" className="page-section playground-section" aria-labelledby="demo-heading">
            <div className="section-heading">
                <div>
                    <h2 id="demo-heading">{t("demoTitle")}</h2>
                    <p>{t("demoIntro")}</p>
                </div>
                <Badge tone="blue">
                    <LockKeyhole size={13} aria-hidden="true" />
                    {t("local")}
                </Badge>
            </div>
            <div className="workbench" aria-busy={demo.busy}>
                <aside className="source-panel">
                    <div className="panel-heading">
                        <span>
                            <FolderOpen aria-hidden="true" />
                            {t("source")}
                        </span>
                        <Hint label={t("clear")}>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label={t("clear")}
                                disabled={!demo.file || demo.busy}
                                onClick={() => {
                                    demo.clear();
                                    if (input.current) input.current.value = "";
                                }}
                            >
                                <X />
                            </Button>
                        </Hint>
                    </div>
                    <div
                        className={`dropzone ${dragging ? "is-dragging" : ""}`}
                        onDragOver={(event) => {
                            if (!event.dataTransfer.types.includes("Files")) return;
                            event.preventDefault();
                            if (!demo.busy) setDragging(true);
                        }}
                        onDragLeave={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            setDragging(false);
                            if (!demo.busy && event.dataTransfer.files[0]) load(event.dataTransfer.files[0]);
                        }}
                    >
                        <Upload aria-hidden="true" className="drop-icon" />
                        <strong>{t("drop")}</strong>
                        <Button variant="outline" size="sm" onClick={choose} disabled={demo.busy}>
                            {t("browse")}
                        </Button>
                        <input
                            id="model-file"
                            ref={input}
                            type="file"
                            accept=".3mf"
                            hidden
                            onChange={(event) => {
                                const file = event.currentTarget.files?.[0];
                                event.currentTarget.value = "";
                                if (file) load(file);
                            }}
                        />
                    </div>
                    <div className="file-summary">
                        <FileBox aria-hidden="true" />
                        <div>
                            <strong title={demo.file?.name}>{demo.file?.name ?? t("fileEmpty")}</strong>
                            <span>
                                {demo.file ? `${(demo.file.size / 1024).toLocaleString(language, { maximumFractionDigits: 1 })} KiB` : ".3mf"}
                            </span>
                        </div>
                    </div>
                    <div className="worker-setting">
                        <label htmlFor="worker-count">
                            <Cpu size={15} aria-hidden="true" />
                            {t("workers")}
                        </label>
                        <select id="worker-count" value={workers} disabled={demo.busy} onChange={(event) => setWorkers(event.target.value)}>
                            <option value="auto">{t("automatic")}</option>
                            {[1, 2, 4, 6, 8].map((value) => (
                                <option value={value} key={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                        <p>{t("workerHelp")}</p>
                    </div>
                    <div className="source-boundary">
                        <Info size={16} aria-hidden="true" />
                        <p>{t("boundary")}</p>
                    </div>
                </aside>
                <div className="preview-panel">
                    <Tabs defaultValue="scene" className="preview-tabs">
                        <div className="panel-heading preview-panel-heading">
                            <span>
                                <Box aria-hidden="true" />
                                {t("preview")}
                            </span>
                            <TabsList aria-label={t("preview")}>
                                <TabsTrigger value="scene">{t("scene")}</TabsTrigger>
                                <TabsTrigger value="parts">{t("modelParts")}</TabsTrigger>
                            </TabsList>
                        </div>
                        <TabsContent value="scene" forceMount className="preview-tab-content">
                            <ModelPreview model={demo.model} />
                        </TabsContent>
                        <TabsContent value="parts" forceMount className="preview-tab-content parts-content">
                            <div className="parts-heading">
                                <Files aria-hidden="true" />
                                <h3>{t("modelParts")}</h3>
                                <Badge>{metrics?.parts.length ?? "—"}</Badge>
                            </div>
                            {metrics ? (
                                <ul className="parts-list">
                                    {metrics.parts.map((part) => (
                                        <li key={part}>
                                            <FileBox size={18} aria-hidden="true" />
                                            <code>{part}</code>
                                            <Badge tone="success">.model</Badge>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="parts-empty">{t("partsEmpty")}</p>
                            )}
                            <div className="parts-contract">
                                <span>{t("api")}</span>
                                <code>Promise&lt;Model3MF&gt;</code>
                                <p>{t("apiParseText")}</p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
                <aside className="results-panel">
                    <div className="panel-heading">
                        <span>
                            <Clock3 aria-hidden="true" />
                            {t("results")}
                        </span>
                        <Hint label={t("timingsNote")}>
                            <Button variant="ghost" size="icon" aria-label={t("timingsNote")}>
                                <Info />
                            </Button>
                        </Hint>
                    </div>
                    <div className="result-timings">
                        <span className="result-context">{t("currentDevice")}</span>
                        <div className="total-time">
                            <span>{metrics ? ms(metrics.total) : "—"}</span>
                            <small>ms</small>
                        </div>
                        <span className="total-caption">{t("total")}</span>
                        <div className="phase-meter" aria-hidden="true">
                            <span style={{ width: metrics ? `${(metrics.parse / Math.max(metrics.total, 0.001)) * 100}%` : "0%" }} />
                            <span
                                className="build-segment"
                                style={{ width: metrics ? `${(metrics.build / Math.max(metrics.total, 0.001)) * 100}%` : "0%" }}
                            />
                        </div>
                        <dl className="phase-values">
                            <div>
                                <dt>
                                    <i />
                                    {t("parse")}
                                </dt>
                                <dd>
                                    {metrics ? ms(metrics.parse) : "—"}
                                    <small> ms</small>
                                </dd>
                            </div>
                            <div>
                                <dt>
                                    <i />
                                    {t("build")}
                                </dt>
                                <dd>
                                    {metrics ? ms(metrics.build) : "—"}
                                    <small> ms</small>
                                </dd>
                            </div>
                        </dl>
                    </div>
                    <dl className="model-statistics">
                        <div>
                            <dt>
                                <Layers aria-hidden="true" />
                                {t("meshes")}
                            </dt>
                            <dd>{metrics ? count(metrics.meshes) : "—"}</dd>
                        </div>
                        <div>
                            <dt>
                                <Triangle aria-hidden="true" />
                                {t("triangles")}
                            </dt>
                            <dd>{metrics ? count(metrics.triangles) : "—"}</dd>
                        </div>
                        <div>
                            <dt>
                                <Image aria-hidden="true" />
                                {t("textures")}
                            </dt>
                            <dd>{metrics ? count(metrics.textures) : "—"}</dd>
                        </div>
                    </dl>
                    <div className="comparison-section">
                        <Button
                            variant="outline"
                            className="comparison-button"
                            disabled={!metrics || demo.busy}
                            onClick={() => {
                                void demo.compare();
                            }}
                        >
                            {demo.phase === "comparing" ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <Play aria-hidden="true" />}
                            {t("compare")}
                        </Button>
                        {baseline !== null && (
                            <div className="comparison-chart" aria-live="polite">
                                <div>
                                    <span>fast-3mf-loader</span>
                                    <strong>{ms(metrics!.total)} ms</strong>
                                    <i aria-hidden="true" style={{ width: `${(metrics!.total / chartMax) * 100}%` }} />
                                </div>
                                <div>
                                    <span>three.js</span>
                                    <strong>{ms(baseline)} ms</strong>
                                    <i aria-hidden="true" style={{ width: `${(baseline / chartMax) * 100}%` }} />
                                </div>
                                <p>{t("comparisonDone")}</p>
                            </div>
                        )}
                        {demo.comparison && "error" in demo.comparison && (
                            <div className="comparison-error" role="alert">
                                <strong>{t("comparisonFailed")}</strong>
                                <p>{demo.comparison.error}</p>
                            </div>
                        )}
                        <p className="comparison-note">{t("compareNote")}</p>
                    </div>
                </aside>
                <div className={`workbench-status ${demo.phase === "failed" ? "is-error" : ""}`} role="status" aria-live="polite">
                    <span>
                        {demo.busy ? (
                            <LoaderCircle className="is-spinning" aria-hidden="true" />
                        ) : demo.phase === "ready" ? (
                            <CheckCircle2 aria-hidden="true" />
                        ) : demo.phase === "failed" ? (
                            <CircleAlert aria-hidden="true" />
                        ) : (
                            <span className="status-dot" />
                        )}
                        {t(demo.phase)}
                    </span>
                    {demo.busy && demo.phase !== "comparing" && (
                        <div className="status-progress">
                            <Progress value={demo.progress} label={t("loading")} />
                            <small>{Math.round(demo.progress)}%</small>
                        </div>
                    )}
                    {!demo.busy && (
                        <span className="status-privacy">
                            <LockKeyhole aria-hidden="true" />
                            {t("local")}
                        </span>
                    )}
                </div>
            </div>
            {demo.failure && (
                <div className="file-error" role="alert">
                    <CircleAlert aria-hidden="true" />
                    <div>
                        <strong>{t(demo.failure.message)}</strong>
                        {demo.failure.detail && <p className="error-detail">{demo.failure.detail}</p>}
                        <p>{t("errorHelp")}</p>
                        <a href={projectLinks.compatibility} target="_blank" rel="noreferrer noopener">
                            {t("report")}
                        </a>
                    </div>
                </div>
            )}
            <p className="measurement-note">
                <Info size={14} aria-hidden="true" />
                {t("timingsNote")}
            </p>
        </section>
    );
}

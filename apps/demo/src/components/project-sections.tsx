import { useEffect, useRef, useState } from "react";
import {
    ArrowUpRight,
    BookOpen,
    Braces,
    Bug,
    Check,
    CheckCheck,
    Copy,
    FileClock,
    GitPullRequest,
    Lightbulb,
    ShieldCheck,
    Terminal,
    X,
} from "lucide-react";
import { exampleCode, projectLinks, type ContentKey } from "../content";
import { usePreferences } from "../preferences";
import { Accordion, Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger } from "./ui";

export function CodeBlock({ code, label, compact = false }: { code: string; label: string; compact?: boolean }) {
    const { t } = usePreferences();
    const [copyState, setCopyState] = useState<ContentKey>("copy");
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    async function copy() {
        try {
            await navigator.clipboard.writeText(code);
            setCopyState("copied");
        } catch {
            setCopyState("copyFailed");
        }
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopyState("copy"), 2500);
    }
    const tokens = code.split(/("(?:[^"\\]|\\.)*"|\/\/[^\n]*|\b(?:import|from|const|await|new|if|throw)\b)/g);
    return (
        <div className={`code-block ${compact ? "is-compact" : ""}`}>
            <div className="code-heading">
                <span>
                    <Terminal size={15} aria-hidden="true" />
                    {label}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("copyLabel")}
                    onClick={() => {
                        void copy();
                    }}
                >
                    {copyState === "copied" ? <CheckCheck /> : <Copy />}
                    <span aria-live="polite">{t(copyState)}</span>
                </Button>
            </div>
            <pre tabIndex={0}>
                <code>
                    {tokens.map((token, index) => (
                        <span
                            key={index}
                            className={
                                token.startsWith('"')
                                    ? "syntax-string"
                                    : token.startsWith("//")
                                      ? "syntax-comment"
                                      : /^(import|from|const|await|new|if|throw)$/.test(token)
                                        ? "syntax-keyword"
                                        : undefined
                            }
                        >
                            {token}
                        </span>
                    ))}
                </code>
            </pre>
        </div>
    );
}

export function QuickStart() {
    const { t } = usePreferences();
    return (
        <section id="quick-start" className="page-section" aria-labelledby="quick-heading">
            <div className="section-heading">
                <div>
                    <h2 id="quick-heading">{t("quickTitle")}</h2>
                    <p>{t("quickIntro")}</p>
                </div>
                <Badge>TypeScript</Badge>
            </div>
            <div className="quickstart-grid">
                <div className="integration-details">
                    <div className="install-card">
                        <h3>
                            <Terminal size={18} aria-hidden="true" />
                            {t("docInstall")}
                        </h3>
                        <Tabs defaultValue="npm">
                            <TabsList aria-label={t("docInstall")}>
                                <TabsTrigger value="npm">npm</TabsTrigger>
                                <TabsTrigger value="pnpm">pnpm</TabsTrigger>
                                <TabsTrigger value="yarn">yarn</TabsTrigger>
                                <TabsTrigger value="github">GitHub</TabsTrigger>
                            </TabsList>
                            {[
                                { manager: "npm", command: "npm install fast-3mf-loader three", label: "npm" },
                                { manager: "pnpm", command: "pnpm add fast-3mf-loader three", label: "pnpm" },
                                { manager: "yarn", command: "yarn add fast-3mf-loader three", label: "yarn" },
                                {
                                    manager: "github",
                                    command: "@innovgame:registry=https://npm.pkg.github.com\n\nnpm install @innovgame/fast-3mf-loader three",
                                    label: "GitHub Packages",
                                },
                            ].map(({ manager, command, label }) => (
                                <TabsContent key={manager} value={manager}>
                                    <CodeBlock compact code={command} label={label} />
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                    <div className="api-summary">
                        <div className="api-icon">
                            <Braces aria-hidden="true" />
                        </div>
                        <div>
                            <h3>{t("apiParse")}</h3>
                            <p>{t("apiParseText")}</p>
                            <code>ArrayBuffer → Promise&lt;Model3MF&gt;</code>
                        </div>
                    </div>
                    <div className="api-summary">
                        <div className="api-icon">
                            <Braces aria-hidden="true" />
                        </div>
                        <div>
                            <h3>{t("apiBuild")}</h3>
                            <p>{t("apiBuildText")}</p>
                            <code>Model3MF → THREE.Group</code>
                        </div>
                    </div>
                    <a className="text-link" href={projectLinks.api} target="_blank" rel="noreferrer noopener">
                        <BookOpen size={16} aria-hidden="true" />
                        {t("apiDocs")}
                        <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                </div>
                <CodeBlock code={exampleCode} label="example.ts" />
            </div>
        </section>
    );
}

export function Support() {
    const { t } = usePreferences();
    const features: { key: ContentKey; supported: boolean }[] = [
        { key: "archives", supported: true },
        { key: "components", supported: true },
        { key: "geometry", supported: true },
        { key: "colors", supported: true },
        { key: "textureGroups", supported: true },
        { key: "tickets", supported: false },
        { key: "extensions", supported: false },
    ];
    return (
        <section id="support" className="page-section" aria-labelledby="support-heading">
            <div className="section-heading">
                <div>
                    <h2 id="support-heading">{t("supportTitle")}</h2>
                    <p>{t("supportIntro")}</p>
                </div>
            </div>
            <div className="support-grid">
                <div className="support-table-wrapper">
                    <table className="support-table">
                        <thead>
                            <tr>
                                <th scope="col">{t("feature")}</th>
                                <th scope="col">{t("status")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {features.map((feature) => (
                                <tr key={feature.key}>
                                    <td>{t(feature.key)}</td>
                                    <td>
                                        <span className={feature.supported ? "support-state supported" : "support-state unsupported"}>
                                            {feature.supported ? <Check size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
                                            {t(feature.supported ? "supported" : "unsupported")}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <aside className="runtime-card">
                    <div className="runtime-icon">
                        <ShieldCheck aria-hidden="true" />
                    </div>
                    <h3>{t("runtimeTitle")}</h3>
                    <p>{t("runtimeText")}</p>
                    <div className="runtime-tags">
                        <Badge>Worker</Badge>
                        <Badge>Blob</Badge>
                        <Badge>ArrayBuffer</Badge>
                    </div>
                    <a className="text-link" href={projectLinks.support} target="_blank" rel="noreferrer noopener">
                        {t("supportDocs")}
                        <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                </aside>
            </div>
        </section>
    );
}

export function Performance() {
    const { t } = usePreferences();
    return (
        <section id="performance" className="page-section performance-section" aria-labelledby="perf-heading">
            <div className="performance-copy">
                <h2 id="perf-heading">{t("perfTitle")}</h2>
                <p>{t("perfIntro")}</p>
                <p>{t("perfMethod")}</p>
                <a className="text-link" href={projectLinks.benchmark} target="_blank" rel="noreferrer noopener">
                    {t("benchmarkDocs")}
                    <ArrowUpRight size={15} aria-hidden="true" />
                </a>
            </div>
            <div className="benchmark-card">
                <div className="benchmark-heading">
                    <Terminal aria-hidden="true" />
                    <strong>{t("benchmarkRun")}</strong>
                    <Badge>Node</Badge>
                </div>
                <CodeBlock code={"pnpm build\npnpm benchmark:release"} label="Terminal" compact />
                <div className="benchmark-phases">
                    <span>Parse</span>
                    <span>Build</span>
                    <span>Total</span>
                </div>
                <p>{t("perfCaveat")}</p>
            </div>
        </section>
    );
}

export function Community() {
    const { t } = usePreferences();
    const links = [
        { key: "contribute", icon: GitPullRequest, href: projectLinks.contribute },
        { key: "bug", icon: Bug, href: projectLinks.bug },
        { key: "idea", icon: Lightbulb, href: projectLinks.idea },
        { key: "changelog", icon: FileClock, href: projectLinks.changelog },
    ] as const;
    return (
        <>
            <section className="page-section faq-section" aria-labelledby="faq-heading">
                <h2 id="faq-heading">{t("faqTitle")}</h2>
                <Accordion
                    items={[
                        { title: t("faq1"), content: t("faq1Answer") },
                        { title: t("faq2"), content: t("faq2Answer") },
                        { title: t("faq3"), content: t("faq3Answer") },
                    ]}
                />
            </section>
            <section id="community" className="page-section community-section" aria-labelledby="community-heading">
                <div className="section-heading">
                    <div>
                        <h2 id="community-heading">{t("communityTitle")}</h2>
                        <p>{t("communityIntro")}</p>
                    </div>
                    <Badge tone="blue">{t("license")}</Badge>
                </div>
                <div className="community-links">
                    {links.map(({ key, icon: Icon, href }) => (
                        <a key={key} href={href} target="_blank" rel="noreferrer noopener">
                            <Icon aria-hidden="true" />
                            <span>{t(key)}</span>
                            <ArrowUpRight aria-hidden="true" />
                        </a>
                    ))}
                </div>
            </section>
        </>
    );
}

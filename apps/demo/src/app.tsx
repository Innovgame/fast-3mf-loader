import { Box, Braces, CodeXml, Cpu, FileBox, Languages, Layers3, Moon, Package, Sun } from "lucide-react";
import { useRef } from "react";
import { projectLinks } from "./content";
import { usePreferences } from "./preferences";
import { Badge, Button, Hint } from "./components/ui";
import { CodeBlock, Community, Performance, QuickStart, Support } from "./components/project-sections";
import { Playground } from "./components/playground";

function Header() {
    const { t, language, theme, toggleLanguage, toggleTheme } = usePreferences();
    return (
        <header className="site-header">
            <div className="header-inner">
                <a href="#" className="brand" aria-label="fast-3mf-loader">
                    <span className="brand-mark">
                        <Box strokeWidth={1.7} aria-hidden="true" />
                    </span>
                    <span>
                        fast-3mf-loader<small>TypeScript + Three.js</small>
                    </span>
                </a>
                <nav className="header-nav" aria-label={t("demoLabel")}>
                    <a href="#demo">{t("demo")}</a>
                    <a href="#quick-start">{t("start")}</a>
                    <a href="#support">{t("support")}</a>
                    <a href="#performance">{t("performance")}</a>
                </nav>
                <div className="header-actions">
                    <Hint label={t("package")}>
                        <Button variant="ghost" size="icon" asChild>
                            <a href={projectLinks.npm} aria-label={t("package")} target="_blank" rel="noreferrer noopener">
                                <Package />
                            </a>
                        </Button>
                    </Hint>
                    <Button variant="outline" asChild className="github-button">
                        <a href={projectLinks.github} aria-label="GitHub" target="_blank" rel="noreferrer noopener">
                            <CodeXml />
                            <span>GitHub</span>
                        </a>
                    </Button>
                    <span className="header-divider" />
                    <Hint label={t("language")}>
                        <Button variant="ghost" className="language-button" aria-label={t("language")} onClick={toggleLanguage}>
                            <Languages />
                            <span>{language === "en" ? "中文" : "EN"}</span>
                        </Button>
                    </Hint>
                    <Hint label={t("theme")}>
                        <Button variant="ghost" size="icon" aria-label={t("theme")} aria-pressed={theme === "dark"} onClick={toggleTheme}>
                            {theme === "light" ? <Moon /> : <Sun />}
                        </Button>
                    </Hint>
                </div>
            </div>
        </header>
    );
}

function Hero({ onOpen }: { onOpen(): void }) {
    const { t } = usePreferences();
    const features = [
        { icon: Cpu, title: "featureWorker", text: "featureWorkerText" },
        { icon: Braces, title: "featureTyped", text: "featureTypedText" },
        { icon: Layers3, title: "featureScene", text: "featureSceneText" },
    ] as const;
    return (
        <section className="hero" aria-labelledby="hero-heading">
            <div className="hero-grid">
                <div className="hero-copy">
                    <div className="hero-badges">
                        <Badge tone="blue">v{__LIBRARY_VERSION__}</Badge>
                        <Badge tone="warning">{t("prerelease")}</Badge>
                        <a href={projectLinks.license} target="_blank" rel="noreferrer noopener">
                            MIT
                        </a>
                    </div>
                    <h1 id="hero-heading">{t("headline")}</h1>
                    <p>{t("intro")}</p>
                    <div className="hero-actions">
                        <Button onClick={onOpen}>
                            <FileBox />
                            {t("open")}
                        </Button>
                        <Button variant="outline" asChild>
                            <a href="#quick-start">
                                <CodeXml />
                                {t("viewCode")}
                            </a>
                        </Button>
                    </div>
                    <p className="release-note">{t("releaseNote")}</p>
                </div>
                <div className="hero-integration">
                    <div className="pipeline-heading">
                        <span className="pipeline-mark">
                            <Box aria-hidden="true" />
                        </span>
                        <strong>{t("pipelineTitle")}</strong>
                        <span className="pipeline-file">.3mf</span>
                    </div>
                    <div className="pipeline">
                        <div>
                            <FileBox aria-hidden="true" />
                            <span>{t("fileLabel")}</span>
                            <code>ArrayBuffer</code>
                        </div>
                        <i aria-hidden="true" />
                        <div>
                            <Braces aria-hidden="true" />
                            <span>{t("modelLabel")}</span>
                            <code>Model3MF</code>
                        </div>
                        <i aria-hidden="true" />
                        <div>
                            <Box aria-hidden="true" />
                            <span>{t("sceneLabel")}</span>
                            <code>THREE.Group</code>
                        </div>
                    </div>
                    <CodeBlock
                        compact
                        code={"const data = await loader.parse(buffer);\nconst group = fast3mfBuilder(data);\nscene.add(group);"}
                        label="TypeScript"
                    />
                </div>
            </div>
            <div className="feature-strip">
                {features.map(({ icon: Icon, title, text }) => (
                    <div key={title}>
                        <span className="feature-icon">
                            <Icon aria-hidden="true" />
                        </span>
                        <div>
                            <strong>{t(title)}</strong>
                            <p>{t(text)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function App() {
    const { t } = usePreferences();
    const fileInput = useRef<HTMLInputElement>(null);
    return (
        <>
            <a className="skip-link" href="#main">
                {t("skip")}
            </a>
            <Header />
            <main id="main" className="page-container">
                <Hero
                    onOpen={() => {
                        document.getElementById("demo")?.scrollIntoView({ block: "start" });
                        fileInput.current?.click();
                    }}
                />
                <Playground fileInput={fileInput} />
                <QuickStart />
                <Support />
                <Performance />
                <Community />
            </main>
            <footer className="site-footer">
                <div className="footer-inner">
                    <div>
                        <a href="#" className="footer-brand">
                            <Box size={19} aria-hidden="true" />
                            fast-3mf-loader
                        </a>
                        <p>{t("footer")}</p>
                    </div>
                    <nav aria-label={t("communityTitle")}>
                        <a href={projectLinks.github} target="_blank" rel="noreferrer noopener">
                            GitHub
                        </a>
                        <a href={projectLinks.security} target="_blank" rel="noreferrer noopener">
                            {t("security")}
                        </a>
                        <a href={projectLinks.license} target="_blank" rel="noreferrer noopener">
                            {t("license")}
                        </a>
                        <span>v{__LIBRARY_VERSION__}</span>
                    </nav>
                </div>
            </footer>
        </>
    );
}

# Three.js Benchmark DOM Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 先以最小改动验证 `@xmldom/xmldom` 是否足以替代当前 `linkedom` XML parser；如果不够，再把 three.js benchmark adapter 切到 `jsdom`，同时保持 benchmark 输出格式、failure semantics 和 release gate 语义不变。

**Architecture:** 先把 XML parser 安装逻辑从 `benchmark-threejs-adapter` 中拆成一个小 helper，让 parser 能力探针、global polyfill 安装和资源清理都集中在一个地方。实现过程分成两个明确阶段：先做 `@xmldom/xmldom` 能力验证并在通过时接线；如果它缺少 three.js loader 需要的 selector 能力，则在同一条实现链路里升级到 `jsdom`，而不是继续留在 `linkedom` 或堆 monkey patch。

**Tech Stack:** Node benchmark scripts, Vitest, three.js examples loader, `@xmldom/xmldom`, `jsdom`, `linkedom`, TypeScript declaration files

---

## File Map

- Create: `scripts/benchmark-threejs-dom.mjs`
  Responsibility: XML parser probe、`DOMParser` 安装/恢复、`jsdom` parser provider 封装
- Create: `scripts/benchmark-threejs-dom.d.mts`
  Responsibility: three.js benchmark DOM helper 的类型声明
- Modify: `scripts/benchmark-threejs-adapter.mjs`
  Responsibility: 从硬编码 `linkedom` 切到 parser helper，并在最终选定 parser 后接线
- Modify: `scripts/benchmark-threejs-adapter.d.mts`
  Responsibility: 为 adapter 的 parser 注入/恢复能力补类型
- Modify: `test/benchmark-threejs-adapter.test.ts`
  Responsibility: 锁定 namespace XML 根因、parser capability gate 与 adapter 行为
- Modify: `package.json`
  Responsibility: 增加 `@xmldom/xmldom`，必要时增加 `jsdom`
- Modify: `package-lock.json`
  Responsibility: 锁定新增 benchmark DOM 依赖
- Modify: `docs/benchmarking.md`
  Responsibility: 只有在对照结果真的变化时刷新 benchmark sample 与方法说明
- Modify: `docs/superpowers/status/current-work.md`
  Responsibility: 记录 `@xmldom/xmldom` 尝试结果，以及是否升级到 `jsdom`

## Task 1: 拆出 DOM parser helper 并锁定 `linkedom` namespace 根因

**Files:**
- Create: `scripts/benchmark-threejs-dom.mjs`
- Create: `scripts/benchmark-threejs-dom.d.mts`
- Modify: `test/benchmark-threejs-adapter.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 namespace XML 在 `linkedom` 下的 selector 行为**

```ts
import { DOMParser as LinkedomDOMParser } from "linkedom";
import { describe, expect, test, vi } from "vitest";

const {
    installDomParserPolyfill,
    probeXmlSelectorSupport,
} = await import("../scripts/benchmark-threejs-dom.mjs");
const { measureThreeFixture } = await import("../scripts/benchmark-threejs-adapter.mjs");

const TEXTURE_GROUP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<model xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    <m:texture2dgroup id="5" texid="2">
      <m:tex2coord u="0.1" v="0.2" />
    </m:texture2dgroup>
  </resources>
</model>`;

describe("probeXmlSelectorSupport", () => {
    test("shows the current linkedom namespace selector gap", () => {
        expect(
            probeXmlSelectorSupport({
                xml: TEXTURE_GROUP_XML,
                selector: "texture2dgroup",
                DOMParserClass: LinkedomDOMParser,
            }),
        ).toEqual({
            supportsQuerySelectorAll: true,
            matchCount: 0,
        });
    });
});

describe("installDomParserPolyfill", () => {
    test("restores the previous DOMParser after replacing it", () => {
        class FakeDOMParser {
            parseFromString() {
                return {
                    querySelectorAll() {
                        return [{}, {}];
                    },
                };
            }
        }

        const originalDOMParser = globalThis.DOMParser;
        const restore = installDomParserPolyfill({ DOMParserClass: FakeDOMParser });

        expect(globalThis.DOMParser).toBe(FakeDOMParser);

        restore();

        expect(globalThis.DOMParser).toBe(originalDOMParser);
    });
});
```

- [ ] **Step 2: 运行 focused test，确认 helper 还不存在**

Run: `npm test -- test/benchmark-threejs-adapter.test.ts`
Expected: FAIL because `../scripts/benchmark-threejs-dom.mjs` does not exist yet.

- [ ] **Step 3: 实现最小 DOM helper，让测试能表达 parser capability**

```js
// scripts/benchmark-threejs-dom.mjs
export function probeXmlSelectorSupport({
    xml,
    selector,
    DOMParserClass,
}) {
    const document = new DOMParserClass().parseFromString(xml, "application/xml");
    const supportsQuerySelectorAll = typeof document.querySelectorAll === "function";

    return {
        supportsQuerySelectorAll,
        matchCount: supportsQuerySelectorAll ? document.querySelectorAll(selector).length : null,
    };
}

export function installDomParserPolyfill({
    DOMParserClass,
    target = globalThis,
}) {
    const originalDOMParser = target.DOMParser;
    target.DOMParser = DOMParserClass;

    return () => {
        if (typeof originalDOMParser === "undefined") {
            delete target.DOMParser;
            return;
        }

        target.DOMParser = originalDOMParser;
    };
}
```

- [ ] **Step 4: 补类型声明，避免测试导入新 helper 时回到 implicit any**

```ts
// scripts/benchmark-threejs-dom.d.mts
export function probeXmlSelectorSupport({
    xml,
    selector,
    DOMParserClass,
}: {
    xml: string;
    selector: string;
    DOMParserClass: new () => {
        parseFromString(input: string, mimeType: string): {
            querySelectorAll?: (selector: string) => ArrayLike<unknown>;
        };
    };
}): {
    supportsQuerySelectorAll: boolean;
    matchCount: number | null;
};

export function installDomParserPolyfill({
    DOMParserClass,
    target,
}: {
    DOMParserClass: new () => unknown;
    target?: typeof globalThis;
}): () => void;
```

- [ ] **Step 5: 重跑 focused test，确认 `linkedom` 根因和 restore 逻辑都被锁住**

Run: `npm test -- test/benchmark-threejs-adapter.test.ts`
Expected: PASS, including the assertion that `linkedom` returns `matchCount: 0` for the namespaced `texture2dgroup` selector.

- [ ] **Step 6: 提交 helper 和根因测试**

```bash
git add scripts/benchmark-threejs-dom.mjs scripts/benchmark-threejs-dom.d.mts test/benchmark-threejs-adapter.test.ts
git commit -m "test: capture threejs xml parser compatibility"
```

## Task 2: 先尝试 `@xmldom/xmldom`，把它当成显式能力门

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `test/benchmark-threejs-adapter.test.ts`
- Modify: `docs/superpowers/status/current-work.md`

- [ ] **Step 1: 安装 `@xmldom/xmldom`，为 capability probe 做准备**

Run: `npm install -D @xmldom/xmldom`
Expected: PASS, `package.json` 新增 `@xmldom/xmldom`，并刷新 `package-lock.json`。

- [ ] **Step 2: 写 failing test，把 `@xmldom/xmldom` 的能力门变成可读断言**

```ts
import { DOMParser as XmldomDOMParser } from "@xmldom/xmldom";

describe("@xmldom/xmldom capability gate", () => {
    test("reports whether xmldom can satisfy the selector contract three.js expects", () => {
        expect(
            probeXmlSelectorSupport({
                xml: TEXTURE_GROUP_XML,
                selector: "texture2dgroup",
                DOMParserClass: XmldomDOMParser,
            }),
        ).toEqual({
            supportsQuerySelectorAll: true,
            matchCount: 1,
        });
    });
});
```

- [ ] **Step 3: 运行 focused test，记录 `@xmldom/xmldom` 实际能力**

Run: `npm test -- test/benchmark-threejs-adapter.test.ts`
Expected:
- If the new test PASSes, `@xmldom/xmldom` satisfies the minimal selector contract and can be wired into the adapter
- If the new test FAILs because `supportsQuerySelectorAll` is `false` or `matchCount` is `0`, stop treating `@xmldom/xmldom` as the final parser and proceed directly to Task 3

- [ ] **Step 4: 只有当 Step 3 PASS 时，才把 adapter 默认 parser 切到 `@xmldom/xmldom`**

```js
// scripts/benchmark-threejs-adapter.mjs
import { DOMParser as XmldomDOMParser } from "@xmldom/xmldom";
import {
    installDomParserPolyfill,
} from "./benchmark-threejs-dom.mjs";

export function installThreeBenchmarkAdapter({
    DOMParserClass = XmldomDOMParser,
} = {}) {
    const restoreDomParser = installDomParserPolyfill({
        DOMParserClass,
    });

    // keep the existing TextureLoader fallback and restore contract
}
```

- [ ] **Step 5: 只有当 Step 4 执行后，再跑 adapter-focused 验证**

Run: `npm test -- test/benchmark-core.test.ts test/benchmark-threejs-adapter.test.ts && npm run benchmark`
Expected:
- focused tests PASS
- `npm run benchmark` still prints the same comparison table shape
- If three.js now produces numeric timings for one or both fixtures, record that outcome and skip Task 3
- If three.js still fails but the failure message changed away from the old `linkedom`-driven namespace symptom, record that evidence before deciding whether Task 3 is still necessary

- [ ] **Step 6: 在 current-work 记录 `@xmldom/xmldom` 尝试结果**

```md
- 2026-03-29 已完成 `@xmldom/xmldom` capability gate：
  - focused tests 已明确记录 `@xmldom/xmldom` 是否满足 three.js 需要的 selector contract
  - 如果满足，adapter 已切到 `@xmldom/xmldom`
  - 如果不满足，下一步直接升级到 `jsdom`
```

- [ ] **Step 7: 只有当 `@xmldom/xmldom` 真正落地为 adapter 默认 parser 时，才提交本任务**

```bash
git add package.json package-lock.json scripts/benchmark-threejs-adapter.mjs test/benchmark-threejs-adapter.test.ts docs/superpowers/status/current-work.md
git commit -m "refactor: try xmldom for threejs benchmark parser"
```

## Task 3: 如果 `@xmldom/xmldom` 不够，用 `jsdom` 作为真正的 DOM fallback

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `scripts/benchmark-threejs-dom.mjs`
- Modify: `scripts/benchmark-threejs-dom.d.mts`
- Modify: `scripts/benchmark-threejs-adapter.mjs`
- Modify: `scripts/benchmark-threejs-adapter.d.mts`
- Modify: `test/benchmark-threejs-adapter.test.ts`
- Modify: `docs/benchmarking.md`
- Modify: `docs/superpowers/status/current-work.md`

- [ ] **Step 1: 只有当 Task 2 的 capability gate 失败时，才安装 `jsdom`**

Run: `npm install -D jsdom`
Expected: PASS, `package.json` 新增 `jsdom`，并刷新 `package-lock.json`。

- [ ] **Step 2: 写 failing test，锁定 `jsdom` 路径至少能满足 namespaced selector contract**

```ts
import { JSDOM } from "jsdom";

describe("jsdom fallback capability gate", () => {
    test("finds namespaced texture groups through querySelectorAll", () => {
        const window = new JSDOM("", { contentType: "text/html" }).window;

        expect(
            probeXmlSelectorSupport({
                xml: TEXTURE_GROUP_XML,
                selector: "texture2dgroup",
                DOMParserClass: window.DOMParser,
            }),
        ).toEqual({
            supportsQuerySelectorAll: true,
            matchCount: 1,
        });

        window.close();
    });
});
```

- [ ] **Step 3: 运行 focused test，确认 `jsdom` 是真正可用的 fallback**

Run: `npm test -- test/benchmark-threejs-adapter.test.ts`
Expected: PASS for the `jsdom fallback capability gate` test.

- [ ] **Step 4: 在 DOM helper 中增加 `jsdom` parser provider，负责清理 window 资源**

```js
// scripts/benchmark-threejs-dom.mjs
import { JSDOM } from "jsdom";

export function createJsdomDomParserProvider() {
    const window = new JSDOM("", { contentType: "text/html" }).window;

    return {
        DOMParserClass: window.DOMParser,
        dispose() {
            window.close();
        },
    };
}
```

- [ ] **Step 5: 把 adapter 默认 parser 改成 `jsdom` provider，而不是继续硬编码具体类**

```js
// scripts/benchmark-threejs-adapter.mjs
import {
    createJsdomDomParserProvider,
    installDomParserPolyfill,
} from "./benchmark-threejs-dom.mjs";

export function installThreeBenchmarkAdapter() {
    const domParserProvider = createJsdomDomParserProvider();
    const restoreDomParser = installDomParserPolyfill({
        DOMParserClass: domParserProvider.DOMParserClass,
    });

    return {
        ThreeMFLoader,
        restore() {
            restoreTextureLoader();
            restoreDomParser();
            domParserProvider.dispose();
        },
    };
}
```

- [ ] **Step 6: 同步类型声明，避免 `jsdom` provider 回到 implicit any**

```ts
// scripts/benchmark-threejs-dom.d.mts
export function createJsdomDomParserProvider(): {
    DOMParserClass: new () => {
        parseFromString(input: string, mimeType: string): {
            querySelectorAll?: (selector: string) => ArrayLike<unknown>;
        };
    };
    dispose(): void;
};
```

```ts
// scripts/benchmark-threejs-adapter.d.mts
export function installThreeBenchmarkAdapter(options?: {
    DOMParserClass?: new () => unknown;
}): {
    ThreeMFLoader: new () => {
        parse(input: ArrayBuffer): unknown;
    };
    restore(): void;
};
```

- [ ] **Step 7: 跑 focused tests 和真实 benchmark，确认 fallback 结果**

Run: `npm test -- test/benchmark-core.test.ts test/benchmark-threejs-adapter.test.ts && npm run build && npm run benchmark`
Expected:
- focused tests PASS
- benchmark 表格结构不变
- three.js 对照结果要么变成 numeric timings，要么仍然失败但 failure cause 已经不再是 `linkedom` namespace 行为

- [ ] **Step 8: 只有在 benchmark 真实输出变化时，才刷新 benchmark 文档 sample**

```md
- Runtime: Node 22 with a Worker compatibility shim and a `jsdom`-backed `DOMParser` for the three.js comparison adapter
- If three.js still fails after the parser switch, document the new failure reason instead of repeating the old `linkedom` explanation
```

- [ ] **Step 9: 在 current-work 中把 fallback 结果写成明确接力**

```md
- 2026-03-29 已把 three.js benchmark DOM fallback 升级到 `jsdom`：
  - 原因：`@xmldom/xmldom` 不满足 three.js loader 需要的 selector contract
  - 当前 benchmark 对照已改由 `jsdom` 提供 `DOMParser`
  - 下一步依据真实 benchmark 输出决定是否刷新 release sample
```

- [ ] **Step 10: 只有当 `jsdom` 真正接管 adapter 默认 parser 后，才提交 fallback 改动**

```bash
git add package.json package-lock.json scripts/benchmark-threejs-dom.mjs scripts/benchmark-threejs-dom.d.mts scripts/benchmark-threejs-adapter.mjs scripts/benchmark-threejs-adapter.d.mts test/benchmark-threejs-adapter.test.ts docs/benchmarking.md docs/superpowers/status/current-work.md
git commit -m "refactor: use jsdom for threejs benchmark parser"
```

## Task 4: 完成收口验证并记录最终 parser 结论

**Files:**
- Modify: `docs/benchmarking.md`
- Modify: `docs/superpowers/status/current-work.md`

- [ ] **Step 1: 跑最终验证命令，确保 benchmark / release gate 语义保持稳定**

Run: `npm run verify && npm run benchmark && npm run benchmark:release`
Expected:
- `npm run verify` PASS
- `npm run benchmark` PASS with the existing comparison table shape
- `npm run benchmark:release` PASS with the same command contract as before

- [ ] **Step 2: 用最终选定 parser 的真实结果刷新 benchmark 文档**

```md
- Comparison runtime: `three.js` `ThreeMFLoader` with the final XML DOM fallback used by the benchmark adapter
- If the final parser still cannot make three.js complete the fixture, keep `unsupported/failed` and record the updated reason
```

- [ ] **Step 3: 在 current-work 里写清楚最终停在哪个 parser**

```md
- 2026-03-29 three.js benchmark DOM fallback 最终结论：
  - 先尝试了 `@xmldom/xmldom`
  - 最终采用的 parser 为 `@xmldom/xmldom` 或 `jsdom`
  - benchmark 输出格式与 release gate 语义保持不变
```

- [ ] **Step 4: 提交最终文档与状态收口**

```bash
git add docs/benchmarking.md docs/superpowers/status/current-work.md
git commit -m "docs: capture threejs dom fallback outcome"
```

## Self-Review

- Spec coverage:
  - 已覆盖“先试 `@xmldom/xmldom`，不行再上 `jsdom`”的顺序
  - 已覆盖 focused tests、benchmark 验证、文档与状态同步
  - 已覆盖不改变 comparison table / release gate 语义的约束
- Placeholder scan:
  - 每个任务都给出了明确文件、命令和代码片段
  - 唯一的条件分支也写成了明确的 gate，而不是模糊 TODO
- Type consistency:
  - `installDomParserPolyfill`、`probeXmlSelectorSupport`、`createJsdomDomParserProvider` 命名保持一致
  - adapter 返回结构继续沿用现有 `restore()` / `ThreeMFLoader` 契约

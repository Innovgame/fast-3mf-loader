# 解析管线稳定化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变公开 API 和现有运行时行为的前提下，把 `lib/parse.ts` 收敛成编排层，并把 SAX 事件归一化、标签分发、短期解析上下文和状态变更边界拆清楚。

**Architecture:** 保留当前 `Fast3MFLoader -> parseModelBuffer -> parse()` 的整体链路和 `ParseResult` 返回形状，但把 `parse.ts` 中的 callback 细节和业务分支迁移到独立模块。新结构会拆成“事件归一化层”和“分发层”，同时保留 `node-extract.ts` 的提取职责与 `node-create.ts` 的状态变更职责。

**Tech Stack:** TypeScript、Vitest、EasySAX、Web Worker、Vite library mode

---

## 文件分工

- Create: `lib/parse-events.ts`
  责任：把 `EasySAXParser` 的原始回调参数归一化为内部 `ParseEvent`，并维护短期解析上下文，例如当前 metadata 名称。
- Create: `lib/parse-dispatch.ts`
  责任：把归一化后的事件路由到对应的 extract/create 组合，同时处理 end-tag 状态清理。
- Modify: `lib/parse.ts`
  责任：只保留 parser 初始化、回调注册、事件转交、Promise resolve/reject 编排。
- Modify: `lib/node-extract.ts`
  责任：从更明确的事件类型中提取 typed payload，减少对宽泛 `StateInput` 的依赖。
- Modify: `lib/node-create.ts`
  责任：继续负责状态写入，但暴露更清晰的细粒度写入边界，便于 dispatcher 调用。
- Modify: `lib/parse-model.ts`
  责任：保持流读取和 typed-array 收尾逻辑不变，只适配新的 `parse()` 内部结构。
- Create: `test/parse-events.test.ts`
  责任：覆盖 metadata 短期上下文和事件归一化行为。
- Create: `test/parse-dispatch.test.ts`
  责任：覆盖标签分发与 end-tag 状态清理行为。

## 任务 1：锁定当前解析事件和清理行为

**Files:**
- Create: `test/parse-events.test.ts`
- Create: `test/parse-dispatch.test.ts`

- [ ] **Step 1: 先写事件归一化的失败测试**

```ts
import { describe, expect, test } from "vitest";
import { createParseEventRuntime, toStartEvent, toEndEvent, toTextEvent } from "../lib/parse-events";

describe("parse-events", () => {
    test("metadata 文本事件会继承最近一次 metadata 的名称", () => {
        const runtime = createParseEventRuntime();

        const startEvent = toStartEvent(runtime, "metadata", () => ({ name: "Title" }), false, () => "<metadata name=\"Title\">");
        const textEvent = toTextEvent(runtime, "Hello");
        const endEvent = toEndEvent(runtime, "metadata", false, () => "</metadata>");
        const afterEndText = toTextEvent(runtime, "Ignored");

        expect(startEvent.metadataName).toBe("Title");
        expect(textEvent).toEqual({
            kind: "text",
            tagName: "metadata",
            text: "Hello",
            metadataName: "Title",
        });
        expect(endEvent.metadataName).toBe("Title");
        expect(afterEndText).toBeUndefined();
    });
});
```

- [ ] **Step 2: 再写分发层的失败测试**

```ts
import { describe, expect, test } from "vitest";
import { dispatchParseEvent } from "../lib/parse-dispatch";
import { makeModelsStateExtras } from "../lib/util";

describe("parse-dispatch", () => {
    test("object end 事件会清理当前 object 状态", () => {
        const state = makeModelsStateExtras();
        state.current.currentObjectId = "12";

        dispatchParseEvent(state, {
            kind: "end",
            tagName: "object",
            empty: false,
            getStringNode: () => "</object>",
        });

        expect(state.current.currentObjectId).toBeUndefined();
    });

    test("metadata text 事件会写入 metadata", () => {
        const state = makeModelsStateExtras();

        dispatchParseEvent(state, {
            kind: "text",
            tagName: "metadata",
            text: "Fast 3MF",
            metadataName: "Title",
        });

        expect(state.metadata).toEqual({ Title: "Fast 3MF" });
    });
});
```

- [ ] **Step 3: 跑聚焦测试确认当前一定是红灯**

Run: `npm test -- test/parse-events.test.ts && npm test -- test/parse-dispatch.test.ts`

Expected:
- `FAIL`，因为 `lib/parse-events.ts` 和 `lib/parse-dispatch.ts` 还不存在。

- [ ] **Step 4: 提交测试基线**

```bash
git add test/parse-events.test.ts test/parse-dispatch.test.ts
git commit -m "test: add parse pipeline boundary coverage"
```

## 任务 2：引入 SAX 事件归一化层

**Files:**
- Create: `lib/parse-events.ts`
- Modify: `lib/node-extract.ts`

- [ ] **Step 1: 实现内部事件类型和运行时上下文**

```ts
import type { SAXGetAttr, SAXGetStringNode } from "easysax";

export type ParseEventRuntime = {
    currentTagName?: string;
    currentMetadataName?: string;
};

export type ParseStartEvent = {
    kind: "start";
    tagName: string;
    empty: boolean;
    getAttr?: SAXGetAttr;
    getStringNode?: SAXGetStringNode;
    metadataName?: string;
};

export type ParseEndEvent = {
    kind: "end";
    tagName: string;
    empty: boolean;
    getStringNode?: SAXGetStringNode;
    metadataName?: string;
};

export type ParseTextEvent = {
    kind: "text";
    tagName: string;
    text: string;
    metadataName?: string;
};

export type ParseEvent = ParseStartEvent | ParseEndEvent | ParseTextEvent;

export function createParseEventRuntime(): ParseEventRuntime {
    return {};
}
```

- [ ] **Step 2: 实现 start/end/text 归一化函数**

```ts
export function toStartEvent(
    runtime: ParseEventRuntime,
    elementName: string,
    getAttr?: SAXGetAttr,
    isTagEnd = false,
    getStringNode?: SAXGetStringNode,
): ParseStartEvent {
    if (elementName === "metadata") {
        runtime.currentMetadataName = getAttr?.()?.["name"] as string | undefined;
    }

    runtime.currentTagName = elementName;

    return {
        kind: "start",
        tagName: elementName,
        empty: isTagEnd,
        getAttr,
        getStringNode,
        metadataName: runtime.currentMetadataName,
    };
}

export function toEndEvent(
    runtime: ParseEventRuntime,
    elementName: string,
    isTagStart = false,
    getStringNode?: SAXGetStringNode,
): ParseEndEvent {
    const event: ParseEndEvent = {
        kind: "end",
        tagName: elementName,
        empty: isTagStart,
        getStringNode,
        metadataName: runtime.currentMetadataName,
    };

    if (elementName === "metadata") {
        runtime.currentMetadataName = undefined;
    }
    runtime.currentTagName = undefined;

    return event;
}

export function toTextEvent(runtime: ParseEventRuntime, text: string): ParseTextEvent | undefined {
    if (!runtime.currentTagName) return;

    return {
        kind: "text",
        tagName: runtime.currentTagName,
        text,
        metadataName: runtime.currentMetadataName,
    };
}
```

- [ ] **Step 3: 让 `node-extract.ts` 能接收更明确的事件类型**

```ts
import type { ParseEvent, ParseStartEvent, ParseTextEvent } from "./parse-events";

type ExtractableEvent = ParseEvent | ParseStartEvent | ParseTextEvent;

export function extractMetadata(input: ExtractableEvent) {
    if (input.kind === "text" && input.text && input.metadataName) {
        return { [input.metadataName]: input.text };
    }
}

export function extractModelData(input: ExtractableEvent) {
    if (input.kind !== "start") return;
    const attributes = input.getAttr?.();
    if (!attributes) return;
    // 其余逻辑保持不变
}
```

- [ ] **Step 4: 运行事件层测试确认转绿**

Run: `npm test -- test/parse-events.test.ts`

Expected:
- `PASS`

- [ ] **Step 5: 提交事件归一化层**

```bash
git add lib/parse-events.ts lib/node-extract.ts test/parse-events.test.ts
git commit -m "refactor: normalize parse sax events"
```

## 任务 3：引入分发层并把标签逻辑移出 `parse.ts`

**Files:**
- Create: `lib/parse-dispatch.ts`
- Modify: `lib/node-create.ts`
- Modify: `lib/parse.ts`

- [ ] **Step 1: 实现分发层骨架**

```ts
import { createBuildItem, createComponent, createTriangle, createMetadata, createModel, createVertex, createObject, createBasematerials, createBasematerial, createTexture2d, createColorGroup, createColor, createTexture2dGroup, createTexture2dCoord } from "./node-create";
import { extractBuildItemData, extractComponentData, extractTriangleData, extractMetadata, extractModelData, extractObjectStart, extractVertexData, extractBasematerialsData, extractBasematerialData, extractTexture2dData, extractColorGroupData, extractColorData, extractTexture2dGroup, extractTexture2dCoord } from "./node-extract";
import type { ParseEvent } from "./parse-events";
import type { StateType } from "./util";

export function dispatchParseEvent(state: StateType, event: ParseEvent) {
    if (event.tagName === "model" && event.kind === "start") {
        createModel(state, extractModelData(event));
        return;
    }

    if (event.tagName === "metadata" && event.kind === "text") {
        createMetadata(state, extractMetadata(event));
        return;
    }

    // 其余标签继续按现有行为迁移
}
```

- [ ] **Step 2: 把 end-tag 清理逻辑统一挪进 dispatcher**

```ts
function clearCurrentStateForEndTag(state: StateType, tagName: string) {
    if (tagName === "object") state.current.currentObjectId = undefined;
    if (tagName === "basematerials") state.current.currentBasematerialsId = undefined;
    if (tagName.endsWith("colorgroup")) state.current.currentColorGroupId = undefined;
    if (tagName.endsWith("texture2dgroup")) state.current.currentTexture2dGroupId = undefined;
}
```

- [ ] **Step 3: 缩小 `parse.ts`，让它只负责编排**

```ts
import type EasySAXParser from "easysax";
import { dispatchParseEvent } from "./parse-dispatch";
import { createParseEventRuntime, toEndEvent, toStartEvent, toTextEvent } from "./parse-events";
import { makeModelsStateExtras, StateType } from "./util";

export function parse(easysaxParser: EasySAXParser, start: () => Promise<void>) {
    return new Promise<StateType>(async (resolve, reject) => {
        const state = Object.assign({}, makeModelsStateExtras());
        const runtime = createParseEventRuntime();

        easysaxParser.on("startNode", (elementName, getAttr, isTagEnd, getStringNode) => {
            dispatchParseEvent(state, toStartEvent(runtime, elementName, getAttr, isTagEnd, getStringNode));
        });

        easysaxParser.on("endNode", (elementName, isTagStart, getStringNode) => {
            dispatchParseEvent(state, toEndEvent(runtime, elementName, isTagStart, getStringNode));
        });

        easysaxParser.on("textNode", (text) => {
            const event = toTextEvent(runtime, text);
            if (event) {
                dispatchParseEvent(state, event);
            }
        });

        try {
            await start();
            resolve(state);
        } catch (error) {
            reject(error);
        }
    });
}
```

- [ ] **Step 4: 运行分发层和解析回归测试**

Run: `npm test -- test/parse-dispatch.test.ts && npm test -- test/loader.parse.test.ts && npm test -- test/runtime-behavior.test.ts`

Expected:
- 全部 `PASS`

- [ ] **Step 5: 提交分发层迁移**

```bash
git add lib/parse-dispatch.ts lib/node-create.ts lib/parse.ts test/parse-dispatch.test.ts
git commit -m "refactor: extract parse dispatch pipeline"
```

## 任务 4：收尾 `parse-model.ts` 适配并做全量验证

**Files:**
- Modify: `lib/parse-model.ts`
- Modify: `test/types.test.ts`

- [ ] **Step 1: 让 `parse-model.ts` 只适配新的内部结构，不改变 typed-array 收尾语义**

```ts
const state = await parse(easysaxParser, async function () {
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        easysaxParser.write(textDecoder.decode(value));
    }
});

const { current, ...parsedState } = state;
// typed-array 转换逻辑保持现状
```

- [ ] **Step 2: 补一条类型回归，锁定 `parse()` 的公开返回形状不变**

```ts
import { expectTypeOf, test } from "vitest";
import { Fast3MFLoader, type ParseResult } from "../lib/main";

test("parse 的公开返回类型保持稳定", () => {
    expectTypeOf<ReturnType<Fast3MFLoader["parse"]>>().toEqualTypeOf<Promise<ParseResult>>();
});
```

- [ ] **Step 3: 运行完整验证**

Run: `npm run check:test && npm run check:demo && npm test && npm run build`

Expected:
- 全部 `PASS`
- `parse.ts` 只保留编排职责
- 没有公开 API 变化

- [ ] **Step 4: 提交收尾**

```bash
git add lib/parse-model.ts test/types.test.ts
git commit -m "refactor: stabilize parse pipeline boundaries"
```

## 自检

- 覆盖检查：计划覆盖了事件归一化、分发层、`parse.ts` 缩小、现有回归护栏和最终验证。
- 占位符检查：没有使用 “TODO later” 或 “自行实现” 这类空泛描述；每个任务都给了具体文件、代码形状、命令和预期结果。
- 一致性检查：内部术语统一使用 `ParseEvent`、`ParseEventRuntime`、`dispatchParseEvent`，与 spec 中的边界设计保持一致。

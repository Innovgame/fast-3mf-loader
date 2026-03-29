# Three.js Benchmark DOM Fallback 设计

**日期：** 2026-03-29

## 摘要

当前 `three.js` 默认 `ThreeMFLoader` 已经接入现有 benchmark，对照结果会在 `npm run benchmark` 与 `npm run benchmark:release` 中展示。但现阶段对照项运行在 `Node + linkedom` 的 XML DOM shim 上，而这套环境对带 namespace 前缀的 `m:texture2dgroup` / `m:texture2d` 节点查询不兼容，导致 `ThreeMFLoader` 在 `multipletextures.3mf` 与 `truck.3mf` 上把资源识别成 `Unsupported resource type.`。

这份设计不改变 benchmark 输出格式、`unsupported/failed` 语义、release gate 语义，也不改变运行库公开 API。目标只是把 three.js benchmark adapter 的 XML DOM 实现切到更接近浏览器预期的 `DOMParser`，优先尝试 `@xmldom/xmldom`；如果它仍然不能让 `ThreeMFLoader` 正确消费当前 fixture，再退到 `jsdom`。

## 目标

- 只替换 three.js benchmark adapter 内部使用的 XML DOM 实现
- 保持当前 benchmark 表格列、failure semantics 和 `benchmark:release` 命令不变
- 用 focused tests 锁定“namespace XML 兼容性”这个真实根因，而不是只根据 benchmark 现象猜测
- 如果 `@xmldom/xmldom` 无法满足 three.js loader 的 XML 需求，再升级到 `jsdom`

## 非目标

- 不修改 `fast-3mf-loader` 运行库逻辑
- 不改 benchmark comparison table 的列结构
- 不移除 `unsupported/failed` 状态
- 不把 three.js 对照项变成 release blocker
- 不在 adapter 里堆针对 three.js loader 内部实现的 selector monkey patch

## 成功标准

- `benchmark-threejs-adapter` 不再依赖 `linkedom` 的 XML DOM 行为
- 新增测试能明确证明：
  - `linkedom` 下 namespace XML 查询不兼容
  - 新的 parser 路径至少具备 three.js loader 期待的基础 XML 查询能力
- `npm run benchmark` 与 `npm run benchmark:release` 继续可运行
- 如果 three.js 结果变化，文档与状态同步到真实输出；如果仍失败，则失败原因能更准确地区分为“DOM shim 仍不足”还是“three.js 自身能力边界”

## 方案选型

### 方案 A：优先改用 `@xmldom/xmldom`

这是选定方案。

理由：

- 它提供更标准的 `DOMParser` 接口，适合作为 XML-only shim
- 改动范围小，只需要替换 benchmark adapter 内部 parser 依赖
- 相比 `jsdom` 更轻，不会为了 XML 解析引入整套浏览器模拟
- 更符合当前目标：先排除 `linkedom` namespace 行为带来的对照偏差

### 方案 B：直接改用 `jsdom`

这是保底 fallback。

理由：

- 如果 `@xmldom/xmldom` 仍然与 three.js loader 的 DOM 假设不兼容，`jsdom` 更可能提供接近浏览器的查询行为
- 代价是依赖更重、benchmark adapter 初始化成本更高
- 因此只在方案 A 不能解决问题时启用

### 方案 C：继续使用 `linkedom`，在 adapter 中加兼容补丁

放弃。

理由：

- 风险最高，需要适配 third-party loader 的内部 DOM 假设
- 维护成本高，未来 three.js 升级后更脆弱
- 会把原本“环境兼容性”问题变成“我们维护 three.js loader 私有补丁”

## 设计细节

### 1. Adapter 职责保持不变，只替换 XML parser 提供者

`scripts/benchmark-threejs-adapter.mjs` 继续负责：

- 安装/恢复 `globalThis.DOMParser`
- 安装 Node 下的 `TextureLoader` fallback
- 调用 `ThreeMFLoader.parse(data)`
- 把成功/失败统一映射到 benchmark core 的 comparison 结构

这次不改变 adapter 的返回结构，也不改 CLI 如何打印 comparison rows。唯一变化是 `installDomParserPolyfill()` 的具体 parser 来源。

### 2. 测试先证明根因，再验证新 parser 行为

需要新增两层 focused tests：

- DOM compatibility test
  - 给一个最小 XML 片段，包含 `m:texture2dgroup`
  - 验证旧的 `linkedom` 行为确实查不到 `querySelectorAll("texture2dgroup")`
  - 验证新 parser 路径至少能让同样的查询返回节点
- Adapter behavior test
  - 保留当前已有的成功/失败分类测试
  - 再增加真实 namespace XML 相关的回归断言，避免以后无意切回不兼容 parser

这样如果 `@xmldom/xmldom` 失败，我们会明确知道失败点在“parser 仍不兼容”，而不是 three.js benchmark 其他逻辑。

### 3. Fallback 策略要显式，而不是隐式混用

实现上不建议同时保留多套 parser 自动切换。优先路径应当是：

1. 先把 adapter 切到 `@xmldom/xmldom`
2. 跑 focused tests
3. 跑 `npm run benchmark`
4. 如果仍然无法让 three.js 正确处理 namespace fixture，再开第二个小设计/实现边界，把 parser 升到 `jsdom`

这样可以避免一次性引入两个候选依赖，导致后续无法判断到底哪个真的解决了问题。

### 4. 文档叙事继续保持保守

无论 `@xmldom/xmldom` 是否成功，都不提前修改 README 类对外 claim。

只有当 benchmark 输出真的变化时，才刷新：

- `docs/benchmarking.md`
- `docs/superpowers/status/current-work.md`

如果切换 parser 后 three.js 仍显示 `unsupported/failed`，文档应明确这是“在更接近浏览器的 XML DOM shim 下仍然失败”的结果，而不是继续把责任全部归到 `linkedom`。

## 测试与验证

至少执行：

- `npm test -- test/benchmark-threejs-adapter.test.ts`
- `npm test -- test/benchmark-core.test.ts test/benchmark-threejs-adapter.test.ts`
- `npm run benchmark`

如果 `@xmldom/xmldom` 方案成功并改变了对照输出，再继续执行：

- `npm run benchmark:release`
- 必要时 `npm run release:check`

## 风险与护栏

### 风险：`@xmldom/xmldom` 也不满足 three.js loader 对 DOM 的预期

护栏：

- 先用 focused tests 锁定 parser 行为
- 保持 fallback 到 `jsdom` 的明确下一步，而不是在本轮里边试边改多个方向

### 风险：benchmark 对照结果波动，被误读成功能变化

护栏：

- 不改 table 结构和 failure semantics
- 文档只写实际输出，不提前宣传“已经修好 three.js 对照”

### 风险：为 benchmark 对照引入过重依赖

护栏：

- 优先用 XML-only 的 `@xmldom/xmldom`
- 只有它失败时才考虑 `jsdom`

## 推荐执行顺序

1. 为 namespace XML 兼容性补 focused tests
2. 把 `benchmark-threejs-adapter` 从 `linkedom` 切到 `@xmldom/xmldom`
3. 跑 focused tests 和 `npm run benchmark`
4. 如果对照输出发生变化，再刷新 benchmark 文档与状态
5. 如果仍失败，再单独开 `jsdom` fallback 的小设计与实现边界

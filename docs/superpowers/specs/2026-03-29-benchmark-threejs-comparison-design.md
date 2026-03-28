# Benchmark Three.js 对比设计

**日期：** 2026-03-29

## 摘要

这个设计把 `three.js` 默认 `3MFLoader` 引入现有 benchmark，作为 `fast-3mf-loader` 的同机对照基线。目标不是把 benchmark 变成外部库的验收测试，而是在当前 fixture、当前 Node worker shim、当前命令口径下，为 README 与 `1.0` 发布前证据提供一份更容易解释的对比样本。

本设计保持当前长期方向不变：

- `fast-3mf-loader` 仍然是 benchmark 的主对象
- `three.js` 默认 `3MFLoader` 只是对照项，不是发布门槛
- `1.0` release gate 仍以本库自身验证与 benchmark 证据为准

## 目标

- 在现有 `npm run benchmark` 输出中加入 `fast-3mf-loader` 与 `three.js 3MFLoader` 的同机对比
- 同时展示 `parse/build/total` 三个 phase，而不只给单个总耗时
- 当 `three.js` 在特定 fixture 上失败时，结果显示为 `unsupported/failed`，而不是让整个 benchmark 命令退出
- 保持 benchmark 仍然可复现、可解释，并与当前 `1.0` claim / release gate 叙事一致

## 非目标

- 不把 `three.js` 对比结果包装成跨环境的绝对性能结论
- 不因为引入对比而改变 `fast-3mf-loader` 的公开 API
- 不把 `three.js` 对照失败升级为 `release:check` 失败条件
- 不扩展新的 3MF feature 支持面

## 成功标准

当以下条件同时满足时，这个设计视为成功：

- `npm run benchmark` 在现有 fixture 上输出对比表
- `fast-3mf-loader` 的 phase timing 仍然保留现有 median + spread 口径
- `three.js` 对照项可以输出 `parse/build/total`，或在失败时稳定显示 `unsupported/failed`
- benchmark 的测试与文档能够说明这份对比样本的含义、边界与失败展示规则

## 方案选择

### 选定方案

把 `three.js` 默认 `3MFLoader` 直接并入现有 `npm run benchmark`。

理由：

- 用户只需要运行一个命令就能看到对比结果
- 文档、release gate 与 benchmark 样本可以围绕同一入口维护
- 当前 benchmark 已经具备 Node worker shim、fixture 循环与 phase 汇总逻辑，适合在此基础上扩一个对照实现

### 放弃的方案

#### 单独增加 `benchmark:compare`

优点是实现更独立，但会让对比结果脱离当前 benchmark 主入口，后续很容易和 release 文档、README 样本脱节。

#### 只在文档里手写对比结果

这种方式最省实现，但证据链最弱，后续也无法通过测试和脚本保证结果仍可复现。

## 设计细节

### 1. Benchmark 核心扩展

现有 `scripts/benchmark-core.mjs` 会继续作为共享测量层，但从“测一个实现”扩展为“测任意 loader/builder 组合”。

需要增加两个层次的抽象：

- 单次测量：给定 fixture bytes、parse 实现和 build 实现，返回 `parse/build/total` 与结果元数据
- 对比汇总：把同一 fixture 下两套实现的结果合并成一行对比数据

`fast-3mf-loader` 仍沿用当前：

- `Fast3MFLoader#parse()`
- `fast3mfBuilder()`
- `median + spread`

`three.js` 对照项会适配为同一份 benchmark 数据结构，至少输出：

- `parseMs`
- `buildMs`
- `totalMs`
- `status`

### 2. CLI 输出形态

`scripts/benchmark.mjs` 改为同一轮 fixture 循环中同时测两套实现：

- `fast-3mf-loader`
- `three.js 3MFLoader`

主表按 fixture 输出一行对比结果。推荐列：

- `Fixture`
- `fast Parse`
- `fast Build`
- `fast Total`
- `three Parse`
- `three Build`
- `three Total`
- `Status`

其中：

- `fast-*` 使用当前 median 值
- `three-*` 也使用 measured runs 的 median 值
- `Status` 表示 `ok`、`three unsupported` 或 `three failed`

`fast-3mf-loader` 的 spread 行继续保留在主表之后，因为当前 `1.0` 证据链仍然主要围绕本库建立。`three.js` 对照项先不输出 spread，避免表格过宽、输出过噪。

### 3. three.js 适配层

为了不把 CLI 脚本塞得过满，需要给 `three.js` 默认 `3MFLoader` 增加一个局部适配层：

- 负责在 Node benchmark 环境中初始化 `three/examples/jsm/loaders/3MFLoader.js`
- 复用现有 `Worker`/`navigator`/`TextureLoader` shim
- 把 three.js loader 的输出包装成 benchmark core 可消费的 `parse/build/total` 结果

实现上应尽量把对 three.js 的适配隔离在 benchmark 脚本或 helper 中，而不是污染运行库代码。

### 4. 失败展示规则

这次设计有一个关键约束：`three.js` 对照项失败不应让 benchmark 整体失败。

规则如下：

- `fast-3mf-loader` 失败：整个 benchmark 仍然失败，因为这是本库自身证据链
- `three.js` 失败：该 fixture 的对照列显示 `unsupported/failed`
- `three.js` 失败原因只做轻量分类：
  - `unsupported`：明确属于能力缺口或当前对照环境无法支持
  - `failed`：实现报错但不能稳定归类为支持边界

主表不直接打印长错误堆栈。详细原因以表后附加说明或短行形式展示，保证 benchmark 输出仍可读。

### 5. 发布门槛关系

把 three.js 对比并入 `npm run benchmark` 后，`release:check` 会间接跑到这份对比表，因为它本来就调用 benchmark。

但发布门槛语义保持不变：

- `release:check` 仍然主要验证本库
- `three.js` 的失败不应导致 `release:check` 失败
- release 文档应明确“对照项仅用于解释样本，不是发布阻塞条件”

## 测试策略

### Benchmark Core 测试

扩展 `test/benchmark-core.test.ts`，覆盖：

- 两套实现的同 fixture 汇总
- `three.js` 对照项成功时的对比行结构
- `three.js` 对照项失败时如何落成 `unsupported/failed`

### CLI / 输出测试

如果当前仓库里还没有 benchmark CLI 的输出测试，可以先把重点放在 core helper 的 deterministic 测试上，CLI 通过真实 `npm run benchmark` 验证。

### 回归验证

这次改动完成后，至少要验证：

- `npm test -- test/benchmark-core.test.ts`
- `npm run verify`
- `npm run benchmark`

需要确认：

- `fast-3mf-loader` 的 timing 与 spread 仍正常输出
- `three.js` 对照项不会把 benchmark 命令变成脆弱的失败源

## 文档策略

`docs/benchmarking.md` 需要从“本库自测样本”扩展成“本库 vs three.js 默认 3MFLoader 的同机对照样本”，并明确三条边界：

- 这是同机对照，不是跨环境 SLA
- 这是当前 fixture + Node shim 下的样本，不是对 three.js 的泛化评价
- `three.js` 如果显示 `unsupported/failed`，表示这份对照样本未成功跑通，不等于下结论说 three.js 在所有环境都不支持

如果 sample results 中出现 three.js 失败，也应把失败展示格式记录进文档，避免后续会话误以为 benchmark “坏了”。

## 风险与护栏

### 风险：three.js 对照让 benchmark 变得脆弱

护栏：

- 失败只影响对照列，不影响本库自身 benchmark 成败
- 把对 three.js 的环境适配隔离在 benchmark helper 中

### 风险：输出过于复杂，降低可读性

护栏：

- 主表只保留每个实现的 median
- spread 先仅保留本库一侧
- 失败原因用简短状态与附加说明表达

### 风险：文档把对照结果写成市场化宣传

护栏：

- 明确是同机 sample
- 明确是当前 fixture 与当前 Node shim 条件下的结果
- 明确 `three.js` 对照项不是发布门槛

## 推荐执行顺序

1. 扩展 benchmark core 的对比数据结构与 deterministic tests
2. 加入 three.js loader 适配与失败分类
3. 改造 CLI 输出为同表对比
4. 更新 `docs/benchmarking.md` 样本与说明
5. 跑完整验证并刷新 `current-work`

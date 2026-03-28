# Stable 1.0 Release Roadmap Design

**Date:** 2026-03-28

## Summary

这个设计把 `fast-3mf-loader` 的 `1.0` 路线定义为“稳态发布”而不是“能力扩张发布”。

`1.0` 的目标不是一次性覆盖更多 3MF 扩展能力，而是把当前已经有实现和 fixture-backed evidence 的核心能力做成一个可发布、可验证、可维护的浏览器优先库：

- `Stream Parsing`
- `Multi-threaded Processing`
- `Lightweight and Efficient`
- `TypeScript Support`
- `Browser Compatible`

围绕这五个 README 卖点，`1.0` roadmap 会优先推进三类结果：

1. 性能可信
2. 易用性稳定
3. 支持边界明确

## Context

当前仓库已经具备 `1.0` 稳态发布所需的若干前置条件：

- parse pipeline boundary 已收敛
- fixture-backed parser/builder coverage 已建立
- support matrix 已独立成文
- benchmark 已按 `parse/build/total` phase 拆分
- public API、类型导出和打包入口已有基本测试锚点

这意味着下一阶段的重点不应再是“继续扩 format 支持面”，而应是把 README 中已经对外宣称的能力转化为真正可以支撑 `1.0` 发布的 release gates。

## Goals

- 定义一个浏览器优先、边界清晰的 `1.0` 发布目标
- 把 README 中的五项能力陈述收敛成可验证的发布门槛
- 明确哪些工作是 `1.0` 阻塞项，哪些应延后到 `1.1+`
- 用 roadmap phases 组织文档、测试、性能和易用性工作，而不是用松散 issue 列表管理
- 保持当前公开 API、支持矩阵和架构锚点稳定，除非有新的设计文档明确扩 scope

## Non-Goals

- 不把 `1.0` 定义成“更多 3MF 扩展能力支持”的版本
- 不把 `Print Ticket` 支持纳入 `1.0` 阻塞项
- 不在 `1.0` 中承诺超出当前 fixture coverage 的 extension resources
- 不在没有独立设计和测试锚点的情况下引入新的公开 API 面
- 不把单机 benchmark 样本包装成跨环境的绝对性能承诺

## 1.0 Definition

`fast-3mf-loader@1.0` 应被定义为：

一个浏览器优先的 TypeScript 3MF 解析库，在当前已支持的 archive unzip、relationships、base mesh、vertex colors、texture resources / texture groups、components 能力范围内，提供稳定的解析结果、清晰的类型、可信的性能证据和可预期的集成体验。

这个定义有三个关键边界：

1. `1.0` 先稳定当前能力，而不是继续横向扩 format 支持面。
2. `1.0` 以浏览器使用场景为主叙事，而不是同时承诺完整的跨运行时故事。
3. `1.0` 的卖点必须由文档、测试和 benchmark 共同支撑，不能只保留市场化描述。

## Release Principles

### 1. Claim Truthfulness First

README、README-zh、support matrix、类型导出和测试证据必须互相一致。对外描述应优先表达“当前真实可验证的能力”，而不是实现上“看起来可能支持”的能力。

### 2. Browser-First Before Runtime Expansion

`1.0` 先把现代浏览器路径做扎实，包括 worker 前提、打包入口、默认行为和限制说明，再决定是否扩展更广泛的运行时叙事。

### 3. Evidence Over Intuition

性能结论以同机 benchmark、fixture-backed regression tests 和可复现命令为准，而不是凭体感判断。

### 4. Ergonomics Over Surface Growth

对 `1.0` 更重要的是“第一次接入能顺利成功”和“失败时知道为什么”，而不是继续增加新 feature 名称。

### 5. Stable Boundaries Before New APIs

在公开 API、返回形状、默认 worker 行为和类型别名冻结之前，不应继续引入新的对外能力承诺。

## Known Tension To Resolve Before 1.0

README 当前的 `Stream Parsing` 文案写的是：

> Supports chunked loading and parsing of large files, reducing memory usage

但当前公开主入口仍是 `Fast3MFLoader#parse(data: ArrayBuffer, options?)`。这意味着：

- 现有实现可以合理宣称“内部使用流式 / SAX 风格解析，帮助控制内存占用”
- 但不能把它表述成“当前已经提供对外 chunked input API”

因此，`1.0` 必须在以下两条路线中选择其一：

1. 调整 README 文案，使其与现有公开 API 一致
2. 明确把真正的 chunked input API 设计成 `1.1+` 能力

本设计推荐第 1 条，把 claim truthfulness 放在 `1.0` 之前。

## Roadmap Structure

本 roadmap 采用“发布门槛型”组织方式，而不是纯功能清单。每个阶段都要对应清晰的退出条件。

### Phase A: Claim Alignment

目标：把 README、README-zh、support matrix、类型入口、示例代码、benchmark 文档全部收敛到当前真实能力。

重点工作：

- 收敛 README 中对 `Stream Parsing`、浏览器兼容性和性能的表述
- 确认 README / README-zh / `docs/support-matrix.md` 之间没有支持范围漂移
- 确认导出类型、文档示例和 `test/public-api.test.ts` / `test/types.test.ts` 一致
- 把未支持能力明确标注为未支持，而不是弱承诺

退出条件：

- 五个 README 卖点都有对应证据来源
- 未支持能力在文档中位置清晰、表述一致
- 对外文档不再混用“未来愿景”和“当前支持”

### Phase B: Performance Hardening

目标：把 `Multi-threaded Processing` 与 `Lightweight and Efficient` 变成可复现的工程结论，而不是只存在于 README 文案里。

重点工作：

- 继续围绕 `multipletextures.3mf` 与 `truck.3mf` 做热点优化
- 把 benchmark 输出作为发布前固定观察项
- 在 parser 和 builder 热点路径维持 focused regression coverage
- 明确默认 worker 策略与性能结果之间的关系

退出条件：

- `npm run benchmark` 成为发布前标准检查项
- 大 fixture 的 benchmark 样本可复现，并记录命令与环境
- 性能陈述基于 `parse/build/total` 三段结果，而不是模糊“更快”

### Phase C: Usability And API Stability

目标：让首次接入体验、错误诊断、默认行为和类型体验达到 `1.0` 可接受水平。

重点工作：

- 冻结 `Fast3MFLoader`、`fast3mfBuilder` 和相关类型别名的公开契约
- 收敛 parse failure、worker failure、unsupported capability warning 的可诊断性
- 优化 README 的 first-use path，让用户更快判断“如何接入”和“当前支持什么”
- 明确默认 `workerCount` 行为、浏览器前提和限制条件

退出条件：

- README 快速开始、支持矩阵和错误/限制说明足够完成首次集成
- 常见失败路径有稳定行为与测试
- `1.0` 前不再随意漂移公开 API 或类型形状

### Phase D: Release Readiness

目标：把 `1.0` 发布从“可以发”升级为“发出去后可维护、可验证、可复现”。

重点工作：

- 固化发布前验证清单
- 校验包产物、类型入口和浏览器使用路径
- 准备 `1.0` release notes，明确 supported / unsupported / known limits
- 确认 CI 与本地命令的一致性

退出条件：

- `npm test`、`npm run build`、`npm run benchmark` 全部纳入发布门槛
- `npm pack --dry-run` 和产物检查没有额外惊喜
- `1.0` release notes 可以直接解释 package promise 与 support boundary

## P0 Release Gates

以下项目应视为 `1.0` 发布阻塞项：

### P0.1 Claim Truthfulness

- README 五个卖点都必须能落到代码、测试或文档证据
- `Stream Parsing` 文案必须和当前 API 对齐
- support matrix 与 README / README-zh 不得冲突

### P0.2 Worker Reliability

- 默认 `workerCount` 策略稳定且有文档
- worker 生命周期和异常传播可诊断
- worker 失败路径有 regression coverage

### P0.3 Performance Evidence

- 大 fixture benchmark 结果可复现
- 性能优化有 focused correctness coverage 兜底
- 发布前至少保留一份明确的 benchmark 样本与环境描述

### P0.4 Type Contract Freeze

- 导出类型、README 示例、打包入口和类型测试一致
- `Model3MF` / `ParseResult` 相关文档表述稳定
- `1.0` 前不再随意修改公开返回结构

### P0.5 Browser Confidence

- 浏览器优先路径有清晰文档
- 当前已验证的浏览器前提和限制条件写清楚
- 不把未验证运行时包装成正式承诺

### P0.6 First-Use Ergonomics

- 用户能快速完成“安装 -> parse -> build -> 理解支持边界”
- unsupported capability 行为可解释
- warning / error 的含义足以帮助排障

## Post-1.0 (P1+) Work

以下事项更适合放到 `1.1+`：

- 真正的 chunked input public API
- `Print Ticket` 支持
- 更多 extension resources 的端到端支持
- 更高级的易用性能力，例如 `AbortSignal`、更细粒度进度事件或额外 convenience helpers
- 更广泛的非浏览器运行时叙事

## Success Criteria

当以下条件同时成立时，可以认为 `1.0` roadmap 达成：

- README、README-zh、support matrix 与代码真实能力一致
- 当前支持边界由 fixture-backed tests 和 focused regression tests 共同保护
- benchmark 能稳定说明 parse/build/total 的表现
- `Fast3MFLoader` 与 `fast3mfBuilder` 的公开契约在 `1.0` 前冻结
- 发布前验证流程清晰且可复现

## Risks And Guardrails

### Risk: 把 README 愿景误当成已交付能力

Guardrail：

- 优先修改文案，而不是在 `1.0` 前被动扩 API 来迎合过度承诺

### Risk: 为了 `1.0` 追求更多 feature，导致 scope 漂移

Guardrail：

- 任何新的 format-support 扩张都需要单独 spec，并默认落到 `1.1+`

### Risk: 过度依赖单机 benchmark 结论

Guardrail：

- 只把 benchmark 当作同机前后对比证据，不包装成通用 SLA

### Risk: 文档已更新，但测试与行为没有同步

Guardrail：

- 把文档改动与 public API / support matrix / benchmark verification 绑在一起审视

## Documentation Impact

这个设计获批后，后续文档收敛应至少覆盖：

- `docs/superpowers/roadmap/current-roadmap.md`
- `docs/superpowers/status/current-work.md`
- `README.md`
- `README-zh.md`
- `docs/support-matrix.md`
- `docs/benchmarking.md`

必要时再补一份面向执行的 implementation plan，把 `1.0` roadmap 拆成可连续交付的任务序列。

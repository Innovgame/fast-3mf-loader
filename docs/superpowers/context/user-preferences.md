# User Preferences

## Working Style

- 对仓库范围内的请求，先阅读 summary docs，再提出设计、实现或评审判断。
- 在开始修改前，先用 `current-architecture-context.md`、`current-work.md`、`current-roadmap.md` 校准当前背景，而不是直接凭局部文件做推断。
- 如果请求与当前架构锚点、支持边界、既有 spec/plan 或 roadmap 冲突，先指出冲突并确认，再继续推进。

## Documentation Habits

- 新会话要可接力，因此在任务开始、推进到关键节点、完成任务后，都应同步更新 `docs/superpowers/status/current-work.md`。
- 新 spec 或 plan 默认应与当前 summary docs 及其指向的源文档保持一致；只有在任务本身就是调整架构方向时，才应反向更新这些摘要。
- 摘要文档保持“轻量导航”定位：稳定事实写在 context，当前接力状态写在 status，长期方向写在 roadmap，详细推理留在 specs/plans。

## Communication Preferences

- 工作流与文档说明优先使用简洁中文，必要时保留英文文件路径、导出名、命令名和类型名，避免歧义。
- 倾向项目内真实上下文，不希望保留明显来自其他仓库的模板痕迹。
- 对能力声明以 support matrix 和 fixture-backed behavior 为准，不因为实现里“看起来像支持”就提前对外宣称。

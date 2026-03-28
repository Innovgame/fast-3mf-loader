# AGENTS.md

在这个仓库中处理任务时，请先阅读以下文件，再开始分析、规划、实现或评审：

1. `docs/superpowers/context/current-architecture-context.md`
2. `docs/superpowers/context/user-preferences.md`
3. `docs/superpowers/status/current-work.md`
4. `docs/superpowers/roadmap/current-roadmap.md`

工作规则：

- `current-architecture-context.md` 是仓库级单入口背景摘要，用来快速建立对当前库结构、公开 API、支持边界和架构锚点的共同理解。
- `user-preferences.md` 是用户长期协作偏好摘要；如果它与默认执行方式冲突，以这里的偏好为准，除非用户在当前对话中明确覆盖。
- `current-work.md` 是当前任务接力入口，用于说明最近完成了什么、当前正在做什么、接下来优先做什么。
- `current-roadmap.md` 是长期方向导航页；如果任务涉及架构、路线图、优先级、长期方向或能力边界，请继续阅读 roadmap 中指向的 spec 与 plan。
- 对于仓库范围内的请求，在提出设计、评审结论或代码改动前，先用这些摘要校准判断。
- 如果请求与当前架构锚点、支持边界或 roadmap 冲突，请先指出冲突并在继续前获得确认。
- 开始新任务、推进任务到关键节点、完成任务后，应同步更新 `docs/superpowers/status/current-work.md`，保证新会话能继续接力。
- 编写新的 spec 或 plan 时，除非任务本身是在更新架构决策，否则应与这些摘要及其指向的源文档保持一致。

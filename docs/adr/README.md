# Architecture Decision Records (ADR)

本目录记录 Pagepod (HTML Manager) 核心架构、领域模型演进与工程设计决策。所有涉及核心范式调整的代码提交均须附带或引用对应的 ADR。

| 序号 | 文件名 | 状态 | 决策主题 |
| :--- | :--- | :--- | :--- |
| **0001** | [`0001-standalone-zero-cdn-ingestion.md`](0001-standalone-zero-cdn-ingestion.md) | Accepted | 纯静态单文件沙箱与零 CDN 依赖设计 |
| **0002** | [`0002-open-hosting-cdn-and-style-diversity.md`](0002-open-hosting-cdn-and-style-diversity.md) | Accepted | 开放式托管支持与样式多样性 |
| **0003** | [`0003-content-moderation-and-binary-visibility.md`](0003-content-moderation-and-binary-visibility.md) | Accepted | 违规内容双重审核机制与二元可见性规范 |
| **0003b** | [`0003-dual-tier-pinning-and-orthogonal-language-taxonomy.md`](0003-dual-tier-pinning-and-orthogonal-language-taxonomy.md) | Accepted | 双层级置顶（全局/个人）、正交语言维度与时间衰减排序 |
| **0004** | [`0004-self-hosted-default-sovereignty-and-cloud-decoupling.md`](0004-self-hosted-default-sovereignty-and-cloud-decoupling.md) | Accepted | 默认自托管数据主权与多云解耦架构 |
| **0005** | [`0005-guest-ingestion-and-public-curation-seo-architecture.md`](0005-guest-ingestion-and-public-curation-seo-architecture.md) | Accepted | 匿名访客摄入管道与公共专题 SEO 策展架构 |
| **0006** | [`0006-guest-transient-and-pro-project-customization.md`](0006-guest-transient-and-pro-project-customization.md) | Accepted | 游客临时态生命周期管理与 Pro 项目个性化权益 |
| **0007** | [`0007-hierarchical-folders-and-workspace-management.md`](0007-hierarchical-folders-and-workspace-management.md) | Accepted | 工作台层级目录管理与双栏操作台（Dual-Pane） |
| **0008** | [`0008-scale-up-ui-and-typography-standards.md`](0008-scale-up-ui-and-typography-standards.md) | Accepted | 全站 UI 尺寸与排版全面提升至 Shadcn 工业级标度 |

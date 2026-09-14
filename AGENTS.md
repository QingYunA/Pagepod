# AGENTS.md - HTML Manager 工程与设计准则

本文档记录了 **HTML Manager** 项目的核心架构规范、设计美学与交互准则，所有协助本项目的 AI Agent 和开发者均须严格遵守。

### 🗺️ 核心工程导航指针 (Navigation Pointers)
- **主页与展示画廊 (Marketing)**：[`src/app/(marketing)/page.tsx`](src/app/(marketing)/page.tsx)（注意 Route Group 目录括号）
- **探索专题发现中心 (Explore Hub)**：[`src/app/(marketing)/explore/explore-client.tsx`](src/app/(marketing)/explore/explore-client.tsx)
- **分类专题聚合与静态页**：[`src/app/(marketing)/explore/[category]/page.tsx`](src/app/(marketing)/explore/[category]/page.tsx) 与 [`category-client.tsx`](src/app/(marketing)/explore/[category]/category-client.tsx)
- **独立全屏运行台**：[`src/app/p/[slug]/page.tsx`](src/app/p/[slug]/page.tsx)
- **安全沙箱隔离端点**：[`src/app/raw/[slug]/[[...path]]/route.ts`](src/app/raw/[slug]/[[...path]]/route.ts)
- **创作者双栏工作台 (Workspace Hub)**：[`src/app/workspace/page.tsx`](src/app/workspace/page.tsx)
  - 核心协同宿主：[`src/app/workspace/components/workspace-client.tsx`](src/app/workspace/components/workspace-client.tsx)
  - 左侧层级目录树：[`src/app/workspace/components/workspace-folder-tree.tsx`](src/app/workspace/components/workspace-folder-tree.tsx)
  - 右侧项目网格/表格：[`src/app/workspace/components/admin-table.tsx`](src/app/workspace/components/admin-table.tsx)
  - 批量操作浮动栏：[`src/app/workspace/components/batch-action-bar.tsx`](src/app/workspace/components/batch-action-bar.tsx)
- **项目代码与元数据编辑器 (Project Editor)**：[`src/app/workspace/projects/[id]/edit/editor-client.tsx`](src/app/workspace/projects/[id]/edit/editor-client.tsx)
- **Edge 中间件与子域名路由网关**：[`src/proxy.ts`](src/proxy.ts)
- **匿名访客摄入与临时态流转管道**：[`src/lib/services/guest-upload.ts`](src/lib/services/guest-upload.ts)
- **游客认领与客户端暂存**：[`src/lib/storage/guest-claim.ts`](src/lib/storage/guest-claim.ts)
- **数据访问层与迁移**：[`src/db/index.ts`](src/db/index.ts) 与 [`src/db/schema.ts`](src/db/schema.ts)
- **生产健康自动化探针**：[`scripts/probe-prod.ts`](scripts/probe-prod.ts)（`npm run probe:prod`）

---

## 💎 一、设计美学与视觉原则（严禁“AI 廉价味”）

本项目追求 **Vercel / Linear / shadcn/ui 官方级别** 的顶级工程美感，拒绝低质模型常见的套路化拼凑。

### 1. 坚决禁止的反模式 (Anti-Patterns)
- ❌ **严禁弥散光斑与背景光晕**：禁止使用 `blur-3xl bg-indigo-500/10` 或彩色的毛玻璃背景球。
- ❌ **严禁标题彩虹渐变**：严禁在文字标题上叠加 `bg-gradient-to-r ... bg-clip-text text-transparent`，所有文字采用清晰坚定的实体色。
- ❌ **严禁滥用 Emoji 图标**：页面分类、状态标签、按钮与导航中坚决不使用 Emoji（如 🚀, ✨, 🎮, 🛠️），统一使用 `lucide-react` 线框图标。
- ❌ **严禁臃肿大圆角与厚重阴影**：卡片与控件避免 `rounded-3xl` 或强烈的扩散投影，崇尚精致、轻薄、克制的现代工业感。

### 2. 倡导的正统设计规范 (Best Practices)
- **Monochrome & Zinc 纯粹黑白灰调**：
  - 深色模式采用精炼纯正的 Zinc 深黑基底（`#09090b`），浅色模式采用纯净白（`#ffffff`）。
  - 严格采用 1px 精细 Hairline 边框（`#27272a` / `#e4e4e7`），保持界面的精密感与技术质感。
- **全套 shadcn/ui & Radix UI 组件驱动与标准工业级标度 (Standard Industrial Scale)**：
  - 页面全部交互元素必须调用 `src/components/ui/*` 规范原语：`Button`、`Badge`、`Card`、`Input`、`Tabs`、`Dialog`。
  - 组件尺寸遵循标准工业级标度（`Button`/`Input` 标准 36px `h-9` 高度，次要/小号 32px `h-8`，大号 40px `h-10`；正文与输入 14px `text-sm`，标题 16px `text-base` 以上，次要元数据与角标 12px `text-xs`）。
  - **全站字号物理红线与标准标度**：正文与输入统一采用 14px（`text-sm`），次级标签、徽章与元数据采用 12px（`text-xs`）；全站字号物理下限为 12px，低于 12px 的微缩字号由 `scripts/check-standards.ts` 静态门禁硬拦截，遵循 ADR-0008 规范。
- **静态底图与双核悬浮胶囊操作体系 (Static Poster with Dual-Action Capsule & Resilience Shield)**：
  - **严禁在列表/网格中无差别直出全量 iframe**（彻底避免多重并发大型 HTML/WebGL 造成的 GPU/CPU 峰值、风扇狂转与内存爆炸）；
  - 展示型卡片统一采用 `HoverSandboxPreview`：默认呈现 Zinc 高定技术点阵底图与分类专属线框海报（零网络开销、首屏极速加载）；
  - **双核悬浮胶囊工具栏 (Floating Action Capsule)**：
    - **左侧【预览 / 悬停预览】**：支持直接点击立即运行，或悬停 600ms 环形进度蓄力载入；沙箱启动后胶囊栏收缩为微型运行徽章（绿点呼吸灯 + `×` 暂停按钮）；
    - **右侧【打开】**：快速在新标签页进入全屏独立运行台 `/p/[slug]`；
  - **超大/复杂/异常 HTML 防护体系**：
    - **体积预警**：文件 > 2MB 时右上角标注体积微胶囊，并在预览前提示推荐全屏打开；
    - **超时与异常守护**：6.5s 加载超时自动阻断并提示友好告警与直接打开；捕获脚本致命异常，保障主站性能不受拖累；
  - **全局活跃池与持久预览**：全局通过 LRU 队列（`sandboxPool`）将并发活跃沙箱数上限硬限制为 **最多 6 个**；超出上限时自动淘汰最久未交互的沙箱并恢复静态底图态，并支持用户随时手动点击微型 `×` 释放资源；
  - 必须完整支持深色（Dark）与浅色（Light）双主题无缝切换与系统偏好联动。
- **全域卡片导航交互规范 (Card-Level Full Navigation Invariant)**：
  - 专题导航与展示型卡片（如 Category Hub Cards、Feature Cards）必须将外层根容器作为标准的 Next.js `<Link>`，保证整张卡片（标题、描述、图标、空白区域）100% 区域均可点击；
  - 微动效箭头图标（如 `ArrowUpRight`）仅作视觉动效辅助（`aria-hidden="true"`），严禁作为唯一可点击入口，严禁将卡片写为 `<button>` 并在其内嵌套微型 `<a>`（彻底杜绝合法冒泡被拦截与 DOM 规范违规）。

### 3. 动态交互与加载动效规范 (Motion & Loading Standards)
- **Tailwind v4 旋转动画防死锁准则**：
  - Tailwind v4 默认 `@keyframes spin` 仅声明 `to { transform: rotate(360deg); }`，在 Chromium/WebKit 内核下会因矩阵等价分解导致动画冻结（出现加载图标静止不转的圆圈 Bug）。
  - 全局样式 `globals.css` 必须显式声明包含 `from { transform: rotate(0deg); }` 与 `to { transform: rotate(360deg); }` 的完整关键帧，并为 `.animate-spin` 设置 `transform-origin: center;`。
- **Radix UI / shadcn 进出场平滑过渡**：
  - 必须启用 `@plugin "tailwindcss-animate";`，严禁让 `Dialog`、`Toast`、`DropdownMenu` 失去进出场过渡；
  - 弹窗必须具备微缩放（`zoom-in-95`）与淡入（`fade-in-0`），Toast 反馈必须具备平滑滑入（`slide-in-from-bottom-3`）与淡入，禁止生硬弹跳。
- **异步操作按钮统一 Loading 反馈**：
  - 任何触发异步请求或 Server Action 的确认/提交按钮（删除、生成、撤销、登录等），在 `isPending` 时必须统一渲染精致的 `<Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />`，提供明确的视觉反馈，不可仅改变静态文本。
- **列表删除项过渡态**：
  - 在卡片或表格列表执行删除时，被操作项在执行期间必须即时呈现半透明过渡态（如 `opacity-40 scale-[0.98] pointer-events-none transition-all duration-200`），避免直接生硬截断移除。

### 4. 反浮夸文案与工程高级感 (Anti-Slop & Editorial Voice)
- ❌ **严禁页游与土豪“VIP”套话**：坚决禁止在产品文案中出现“尊享”、“特权”、“VIP”、“自由扩容”、“神级”、“无敌”等浮夸廉价词汇；
- ❌ **严禁同义词三重堆砌与标签罗列**：卡片或模块内严禁在标题、副标题、操作按钮与底部微注中反复变换同义词复述相同属性（如同时出现 `Sandboxed`、`Hardened CSP` 与 `Sandbox Runner`，或重复强调 `Token Protected`、`NoIndex` 与 `Instant Link`）；优先采用极简事实约束（如“无需登录 · 单文件 HTML 最大 2MB”），删除一切无增量信息的口号式底部微字；
- ✅ **倡导中性、克制的技术质感词汇**：统一使用“功能”、“权益”、“配额”、“Features”、“Perks”；
- ❌ **严禁会员付费元素彩虹化**：会员状态标签、价格方案与横幅禁止使用金色渐变（如 `from-amber-500/10`）或厚重阴影（`shadow-2xl`），统一遵守 Zinc 单色黑白灰调、1px 细线边框与 shadcn `<Badge variant="outline">` 原语；
- ✅ **双语国际化零死角**：全链路必须响应式切换；严禁在英文模式下漏译或硬编码中文回退值（如默认未命名账号必须动态适配为 `"Admin"`，严禁硬编码 `"管理员"`）。

---

## 🏗️ 二、核心架构与安全规范

### 1. 存储适配与数据迁移纪律 (Storage, Database & Migrations)
- **存储适配器规范 (Storage Adapter Pattern)**：所有文件读写统一走 `getStorage()` 抽象接口（探测顺序：`BLOB_READ_WRITE_TOKEN` -> `R2_*` -> 本地 `.storage/`），严禁直接在路由中硬编码文件系统操作。
- **双核存储分工模型 (Dual-Storage Responsibility Matrix)**：
  - **Cloudflare R2 / 对象存储**：承载物理静态文件（HTML/JS/CSS/图片/ZIP/截图），不存业务状态，不参与列表过滤；
  - **PostgreSQL / 元数据关系数据库**：存储项目、用户、分类、可见性、审核状态等业务实体。列表检索、分类筛选与计数**必须且仅由数据库承担**；
  - **排障纪律**：若前端作品为 0 或卡片缺失，优先排查 PostgreSQL 过滤条件（`review_status`、`visibility`、租户隔离），切勿误判为 R2 文件丢失。
- **数据库 DDL 祖父法则与存量自愈 (Grandfathering Invariant & Backward-Compatible DDL)**：
  - 严禁排他性默认值：新增参与查询过滤的列（如 `review_status`），列默认值必须设为保证存量可见的宽松状态（如 `'approved'`），新记录再由业务服务层赋待定值；
  - 强制存量数据自愈：过滤状态升级迁移必须配套幂等的自愈更新脚本（如 `autoApproveLegacyProjects()`），在初始化时自动执行，确保历史数据平滑过渡。
- **有状态迁移与代码评审自检 (Stateful Migration Invariant)**：
  - 实施涉及表结构、列增删、默认值或公共过滤条件的 PR 时，评审必须显式确认存量数据的向下兼容性与自愈路径。
- **冷启动 0 DDL 绝对禁令 (Zero Cold-Start DDL Invariant)**：
  - 业务读路径严禁在无异常冷启动阶段无差别执行 DDL 脚本；自愈迁移仅在 `withTableFallback` 捕获到表缺失时按需触发，保障新实例毫秒级响应。

### 2. 安全隔离与领域防线 (Security Sandbox & Domain Invariants)
- **安全沙箱隔离 (Hardened Sandbox)**：托管的外部 HTML 统一走 `/raw/[slug]/[[...path]]`，强制注入 `Content-Security-Policy: sandbox allow-scripts allow-forms allow-downloads allow-popups allow-modals; default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;` 与 `X-Content-Type-Options: nosniff`；iframe 严禁添加 `allow-same-origin`。
- **全链路实体字段渗透审计准则 (Full-Path Schema Ingestion Invariant)**：新增或扩充业务实体元数据字段必须完整渗透闭环：`src/db/schema.ts` -> `src/lib/validation.ts` -> `src/lib/services/project-service.ts` -> `src/app/actions/*` & `/api/upload` -> 客户端表单。
- **批量操作全等防线准则 (Batch Operation Parity Invariant)**：批量操作（`batchDelete`、`batchUpdateVisibility`、`batchMove`）必须与单项领域服务保持 100% 语义全等，强制逐项核验 RBAC 权限与业务风控，并闭环触发存储清理等生命周期副作用。

### 3. 性能优化与异步解耦 (Performance & Non-Blocking Architecture)
- **公共展示页面静态预渲染 (Static ISR Invariant)**：公共分类聚合与 Marketing 页面（如 `/explore/[category]`）严禁在服务端组件入参中直接解构或 `await searchParams`，避免退化为动态 SSR；多语言等偏好抽离至客户端组件通过 React 状态受控处理。
- **写入路径零同步无头渲染准则 (Zero Synchronous Headless Invariant)**：面向用户的项目创建、代码更新与游客即时上传等交互主链路，**严禁在请求生命周期内同步 `await` 重型无头浏览器**；截图与缩略图必须委托至 `after(runCapture)` 或后台静默队列异步回填，确保写接口响应 **< 50ms**；`unlisted` 与 `private` 项目严禁触发外网截图。

### 4. 工程协同、流水线与门禁规范 (Engineering Workflow & Tool Discipline)
- **Git Worktree 与 Webpack 构建**：新建/切换 Worktree 缺少依赖首选软链接主仓库 `ln -s .../node_modules node_modules`（零安装、秒级可用）；规避 Turbopack Panic 本地构建使用 `npm run build:webpack`。
- **Worktree 冲突合并防伪冲突原则**：特性分支拉取主分支更新**优先采用 `git merge origin/main`**（或先 squash 分支历史再 rebase）；Zsh 下包含方括号的动态路由路径命令行参数**必须统一用单引号包裹**（如 `git add 'src/app/p/[slug]/page.tsx'`）。
- **分支合并与流水线规约**：Worktree 提 PR 并通过 `gh pr merge <id> --squash` 合并（**严禁携带 `--delete-branch`**）；合并后本地通过 `git reset --hard origin/main` 对齐。
- **部署监听与自动化探针**：
  - 监听流水线状态优先执行 `npm run deploy:wait`（基于 `scripts/wait-deploy.sh` 秒级轮询），告别高开销交互式重复轮询；
  - 部署验证首选轻量探针 `npm run probe:prod` 秒级断言；仅在复杂视觉排版或人机交互审核时按需调用浏览器。
- **静态工程门禁前置校验与合并回检**：
  - 静态门禁 `scripts/check-standards.ts` 机械化硬拦截冲突标记、亚 12px 微缩字号（`text-[10px]` 等）、原生 `<a>` 标签及反模式文案，并已内置于 `npm test` 首位；
  - **跨分支合并后设计一致性回检 (Post-Merge Design Parity Invariant)**：执行 `git merge origin/main` 后，必须对所有受影响或新增 UI 组件运行 `npm run check:standards`。

---

## 📚 三、特定领域扩展规范 (Domain Standards & Context Pointers)

为保持工程准则高信噪比并遵循渐进式揭示原则（Progressive Disclosure），以下特定业务领域的详细规范已外置独立文档，相关开发时按需触发阅读：

1. **认证与系统事务邮件规范**：
   - 涉及验证码 OTP、注册确认信、邮件客户端排版防垃圾拦截与 CDN 邮件 Logo 时，遵循 [`docs/standards/transactional-emails.md`](docs/standards/transactional-emails.md)。
2. **商业化支付与交易安全规范**：
   - 涉及会员定价方案、结账弹窗意图恢复、PayPal 扣款短路防重与 IDOR 所有权越权核验时，遵循 [`docs/standards/payment-security.md`](docs/standards/payment-security.md)。

---

## 🌐 四、交互沟通与技能语言规范 (Language & Skill Communication Standards)

1. **中文母语交互与汇报基准 (Chinese-First Communication Invariant)**：
   - 除非用户明确要求使用英文，所有与用户的日常交互、阶段性工作汇报、数据分析、排障总结、以及所有 Slash Command 技能的最终答复，**必须一律采用清晰、地道的中文输出**。
   - 专业技术名词、代码标识符（函数名、变量名、类型）、文件路径、Git Commit SHA、HTTP 状态码及行业标准术语（如 `IDOR`、`CSP`、`Zod`、`PostgreSQL`）保持英文原名，严禁生硬机翻，但解释、论述、问题归类必须全中文。

2. **多 Agent 协作与 Matt Pocock 系列技能语言约束 (Subagent Language Constraints)**：
   - 在调用任何外部或内置技能（特别是 Matt Pocock 系列技能如 `/code-review`、`/tdd`、`/diagnosing-bugs`、`/research`、`/domain-modeling`、`/to-spec` 等）派发子 Agent（`invoke_subagent`）时，**必须在 subagent prompt 结尾显式追加中文输出约束**：
     `"Please write the final report in Chinese (中文). Technical terms, standard names, code identifiers, and file paths should remain in English."`
   - **双轴报告本地化 (Bilingual Review Aggregation)**：
     - 当技能要求“verbatim or lightly cleaned”呈现子 Agent 报告时，聚合呈现给用户的 `## Standards`（规范轴）与 `## Spec`（需求轴）报告**必须以中文呈现**，坚决禁止将纯英文子 Agent 原始输出直接粘给用户。


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

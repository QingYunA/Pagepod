# AGENTS.md - HTML Manager 工程与设计准则

本文档记录了 **HTML Manager** 项目的核心架构规范、设计美学与交互准则，所有协助本项目的 AI Agent 和开发者均须严格遵守。

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
- **全套 shadcn/ui & Radix UI 组件驱动**：
  - 页面全部交互元素必须调用 `src/components/ui/*` 规范原语：`Button`、`Badge`、`Card`、`Input`、`Tabs`、`Dialog`。
  - 组件尺寸偏向紧凑精致（32px / 36px 高度，11px~13px 字号）。
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
- ✅ **倡导中性、克制的技术质感词汇**：统一使用“功能”、“权益”、“配额”、“Features”、“Perks”；
- ❌ **严禁会员付费元素彩虹化**：会员状态标签、价格方案与横幅禁止使用金色渐变（如 `from-amber-500/10`）或厚重阴影（`shadow-2xl`），统一遵守 Zinc 单色黑白灰调、1px 细线边框与 shadcn `<Badge variant="outline">` 原语；
- ✅ **双语国际化零死角**：全链路必须响应式切换；严禁在英文模式下漏译或硬编码中文回退值（如默认未命名账号必须动态适配为 `"Admin"`，严禁硬编码 `"管理员"`）。

---

## 🏗️ 二、核心架构与安全规范

1. **安全沙箱隔离 (Hardened Sandbox)**：
   - 托管的所有外部 HTML 运行端点统一走 `/raw/[slug]/[[...path]]`；
   - 必须强制注入 CSP 响应头：
     ```
     Content-Security-Policy: sandbox allow-scripts allow-forms allow-downloads allow-popups allow-modals; default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;
     X-Content-Type-Options: nosniff;
     ```
   - 宿主内的 iframe **严禁**添加 `allow-same-origin`，物理隔绝访问宿主主域的 Cookie、LocalStorage 和管理员 Session。

2. **存储适配器规范 (Storage Adapter Pattern)**：
   - 所有文件读写统一走 `getStorage()` 抽象接口，严禁直接在路由中硬编码文件系统操作；
   - 自动探测顺序：`BLOB_READ_WRITE_TOKEN` (Vercel Blob) -> `R2_*` (Cloudflare R2) -> 本地持久化 `.storage/`。

3. **数据库兼容性**：
   - 采用 Drizzle ORM，原生适配 PostgreSQL（Vercel Postgres / Neon / Supabase）；
   - 在未配置外部数据库的本地开发环境中，通过 `.data/db.json` 自动 fallback，保证开箱即用零报错。

---

## ✉️ 三、认证与系统事务邮件规范 (Auth & Transactional Email Standards)

1. **双语国际化排版规范 (English First, Chinese Second)**：
   - 面向国际化与出海标准，所有系统事务邮件、模版与双语通知一律遵循“**英文为主（首行/主标题）、中文为辅（次行/辅助说明）**”，如 `Confirm your email address / 验证您的邮箱账号`；
   - 按钮文案统一采用双语格式：`Confirm & Sign In / 验证邮箱并登录`。

2. **官方品牌形象与邮件客户端兼容 (Branded Email Assets)**：
   - 邮件头部必须引入生产环境全球 CDN 托管的官方 Logo（`https://www.pagepod.dev/logo.png`），以 30x30 Retina 视网膜规格配合 1px 精细微边框与圆角呈现；
   - **严禁使用 Base64 Data URI**（防范主流邮件服务商 Gmail、Outlook、QQ、网易的垃圾拦截）；
   - 操作按钮下方必须保留纯文本链接回退通道，确保极端环境下用户仍可复制 URL 完成验证。

3. **自适应验证码与剪贴板容错 (Adaptive Verification Token)**：
   - **严禁文案硬编码位数**：前端提示、占位符与邮件文案中严禁硬编码“6 位数字验证码”或“000000”，统一采用自适应的“数字验证码 / Verification Code”；
   - **全链路空格清洗**：前端 OTP 输入框与后端 Action 必须在处理前通过 `.replace(/[\s-]+/g, "")` 自动清洗剪贴板带入的视觉空格与连字符；
   - **输入框宽度自适应**：前端输入框上限放宽至 10 位，完美兼容 Supabase 后端配置的 6~10 位 OTP。

4. **Git Worktree 与 Turbopack 协同避坑 (Worktree Build Discipline)**：
   - Git Worktree 中由于 `node_modules` 软链接特性，Next.js Turbopack 会触发内部 Panic。Worktree 下本地构建测试必须使用 `npx next build --webpack`，或直接切至主仓库目录运行；
   - 分支合并遵循无冲突流程：Worktree 提 PR 并通过 `gh pr merge <id> --squash` 合并（**严禁携带 `--delete-branch`**，避免 Git 尝试自动检出已被主仓库锁定的 main 分支触发 `fatal: 'main' is already checked out` 错误）。主仓库 `git pull origin main` 后，Worktree 执行 `git reset --hard origin/main` 对齐，远端分支在 Web 界面或主仓库安全清理；
   - **生产部署状态秒级监听**：项目通过 GitHub 官方应用连接 Vercel 自动化部署，严禁在本地临时执行 `npx vercel`（避免无效鉴权与漫长安装）。监听流水线状态统一调用 `gh api /repos/QingYunA/Pagepod/commits/<sha>/statuses` 秒级解析 `state: "success" | "pending"`。

---

## 💳 四、商业化支付与交易安全规范 (Commercial Payment & Security Standards)

1. **前置强制鉴权与意图无缝恢复 (Auth Gate & Payment Resumption)**：
   - 未登录用户严禁初始化或唤起真实支付 SDK；
   - 点击付费方案若未登录，必须通过 URL 编码携带意图跳转：`/login?from=${encodeURIComponent('/pricing?tier=' + tier)}`；
   - 登录成功回跳后，定价页必须自动响应式解析 `tier` 参数并自动弹出对应结账弹窗，实现零二次点击的无缝闭环；
   - 定价与支付客户端组件必须外层包裹 `<Suspense fallback={null}>`，避免 Next.js 静态预渲染 de-opt。

2. **支付捕获防越权与幂等短路防御 (IDOR & Idempotency Defense)**：
   - **IDOR 所有权核验**：支付捕获端点（如 `/api/payments/*/capture-order`）必须比对本地订单 `order.userId` 与当前 Session `currentUser.id`（管理员除外），不匹配严禁向支付渠道发起 capture，直接返回 `403 Forbidden`；
   - **本地订单存在性验证**：若本地无此订单直接返回 `404 Not Found`，绝不盲目向上游发起扣款；
   - **短路防重复扣款**：捕获接口必须前置检查本地订单状态，若已为 `completed` 则立即短路返回已有 `captureId`，严禁重复调用上游支付渠道扣款 API；
 ---

## 🌐 五、交互沟通与技能语言规范 (Language & Skill Communication Standards)

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

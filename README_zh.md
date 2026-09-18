<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/brand/pagepod-logo-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="public/brand/pagepod-logo-monochrome.png">
  <img src="public/brand/pagepod-logo-monochrome.png" alt="Pagepod Logo" width="76" height="76">
</picture>

# Pagepod

<p><strong>简单、轻量且支持自托管的 HTML 运行与分享工具。</strong><br>
在线免配置托管：<a href="https://www.pagepod.dev"><strong>Pagepod (pagepod.dev)</strong></a> — 免配置 HTML 文件免费托管，拖拽 3 秒生成在线分享链接与作品展台。<br>
单文件 HTML 或带素材的 zip 压缩包，拖进来就能安全运行并生成分享链接。零构建步骤、严格沙箱隔离、没有云厂商高额流量费。</p>

<p>
  <a href="https://github.com/QingYunA/html-manager/releases"><img src="https://img.shields.io/badge/version-1.0.0-18181b?style=flat" alt="Version"></a>
  <a href="https://hub.docker.com/"><img src="https://img.shields.io/badge/Docker-原生支持-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker"></a>
  <a href="https://coolify.io/"><img src="https://img.shields.io/badge/Deploy%20on-Coolify-6366F1?style=flat" alt="Coolify"></a>
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FQingYunA%2Fhtml-manager&env=ADMIN_PASSWORD&envDescription=Set%20a%20master%20password%20for%20accessing%20the%20admin%20dashboard&stores=%5B%7B%22type%22%3A%22postgres%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D"><img src="https://img.shields.io/badge/Deploy%20with-Vercel-000000?style=flat&logo=vercel" alt="Deploy with Vercel"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-18181b?style=flat" alt="License"></a>
</p>

<p>
  <a href="https://www.pagepod.dev">免费在线托管</a> ·
  <a href="https://www.pagepod.dev/explore">作品画廊</a> ·
  <a href="#部署方案">部署方案</a> ·
  <a href="#工作原理">工作原理</a> ·
  <a href="#对比矩阵">对比矩阵</a> ·
  <a href="https://pagepod.dev/api/docs">API 文档</a> ·
  <a href="README.md">English</a>
</p>

</div>

---

## 为什么做 Pagepod？

平时随手写个网页小工具、Canvas 实验、或者导出一个前端 Demo，想发给别人看看，往往挺麻烦：

- **建站太折腾：** 只是想预览几个 HTML 页面，就得手动写 Nginx/Caddy 配置、配反向代理、再申请 SSL 证书。
- **主域名有安全风险：** 直接把未知的第三方脚本扔在自己的主站域名下跑，随时可能泄露你的登录态 Cookie 或 LocalStorage。
- **平台限制多：** 很多在线代码分享平台限制多文件上传，要么塞满广告，要么按月收费；直接扔云存储桶又担心被刷出天价流量账单。

**Pagepod 给你的 HTML 文件一个干净、独立的家：**
- **零构建步骤：** 单个 `.html` 文件或带图片 CSS 的 `.zip` 压缩包，拖进来就能跑，秒级生成多端预览链接。
- **严格安全沙箱：** 页面运行在独立的 `/raw/[slug]/` 路径下，注入严格 CSP 头且禁用了 `allow-same-origin`。跑未知脚本也不会碰触你的主站凭据。
- **完全跑在你自己的硬件上：** 支持几十块钱一个月的 VPS、Docker、Coolify、家庭服务器，也能零成本部署在 Vercel 上。文件存本地或存 Cloudflare R2（0 流量费）。

---

## 自托管 vs. 官方托管云

| 维度 | 自托管 Pagepod（本仓库） | Pagepod Cloud（官方托管版） |
| :--- | :--- | :--- |
| **价格与授权** | **100% 免费开源（MIT 协议）** | 免费版与终身制会员 |
| **基础设施** | 自由部署在你的 VPS、Docker、Coolify 或 Vercel | 全球高可用托管云集群 |
| **数据所有权** | 100% 在你自己的服务器或 S3/R2 存储桶中 | 托管云端安全存储 |
| **维护成本** | 自行掌控升级与备份 | 零运维，全自动更新与备份 |
| **自定义域名** | 无限制（通过反代或 Caddy） | 开箱自带二级域名分发与路由 |
| **即刻上手** | [查看部署说明](#部署方案) | [访问 pagepod.dev](https://pagepod.dev) |

---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Pagepod 工作原理                                │
│                                                                             │
│  单文件 .html / 资源包 .zip / 网页小工具 / 原型演示                         │
│         │                                        │                          │
│         ▼                                        ▼                          │
│   Web 控制台 (拖拽 / Zip / 代码粘贴)       POST /api/upload (CLI / Token)   │
│         │                                        │                          │
│         └───────────────────┬────────────────────┘                          │
│                             ▼                                               │
│                 Pagepod 核心服务 (Next.js 16)                               │
│                             │                                               │
│    ┌────────────────────────┼────────────────────────┐                      │
│    ▼                        ▼                        ▼                      │
│  存储可选              数据持久层             严格安全沙箱                  │
│  • 本地硬盘存储 (.storage)• PostgreSQL (Neon/DB) • 独立 /raw/ 隔离端点      │
│  • Cloudflare R2 (0流量费)• Supabase Auth 鉴权   • 严格 CSP: 禁 same-origin │
│  • Vercel Blob        • 轻量本地 JSON 降级   • 物理切断主域 Cookie 访问     │
│    │                        │                        │                      │
│    └────────────────────────┼────────────────────────┘                      │
│                             ▼                                               │
│         ┌───────────────────┴───────────────────┐                           │
│         ▼                                       ▼                           │
│  公开画廊 (/explore)                    多端预览与运行台 (/p/[slug])        │
│  • 默认静态封面，轻量省资源             • 桌面 / 平板 / 手机视口一键切换    │
│  • 鼠标悬停或点击才加载                 • 纯净独立沙箱直链 (/raw/)          │
│  • 限制最多同时跑 6 个活跃沙箱          • 源码高亮查看与一键复制            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 对比矩阵

| 核心能力 | Pagepod (自建方案) | CodePen / JSFiddle | v0 / Bolt 原型预览 | 静态 S3 / R2 直出 |
| :--- | :---: | :---: | :---: | :---: |
| **私有化自建部署** | **支持 (VPS / Docker)** | 不支持 (纯云端 SaaS) | 不支持 (纯云端 SaaS) | 支持 |
| **物理隔离 CSP 沙箱** | **支持 (`/raw/` 独立端点)** | 部分隔离 | 部分隔离 | 无 (与存储桶同域风险) |
| **Zip 压缩包与多静态资源解压** | **支持 (自动相对路径映射)** | 仅付费版支持 | 限制支持 | 需手动上传维护 |
| **多端响应式模拟 (桌面/平板/手机)** | **支持 (一键切换)** | 需手动拖拽 | 支持 | 无 |
| **自动化 CLI 与 API 推送 (`/api/upload`)** | **支持 (OpenAPI + Token)** | 不支持 | 不支持 | 仅限云厂商 S3 CLI |
| **电脑不卡顿 (限制并发 iframe)** | **支持 (静态封面 + LRU 限 6)**| 并发多 iframe 卡顿 | 并发大量 iframe | 不适用 |
| **客户端端到端零知识加密 (E2EE)** | **支持 (AES-GCM Web Crypto)**| 不支持 | 不支持 | 不支持 |
| **公网下行流量费用 (Egress)** | **0 元 (R2 免费额度或本地硬盘)**| 订阅年费制 | 订阅年费制 | 产生公网流量账单 |

---

## 核心特性

- **严格安全沙箱：** 页面运行在独立的 `/raw/[slug]/` 路径下，注入严格 CSP 策略，且坚决禁用 `allow-same-origin`。哪怕运行未知的第三方代码，也绝不会碰触主站的 Cookie、管理员登录态或 LocalStorage。
- **首屏轻量，不拖慢电脑：** 列表卡片默认只加载极轻的静态封面，点击或悬停时才唤起沙箱。后台并发沙箱硬限制最多 6 个，超出自动释放旧实例，避免风扇狂转。
- **大文件与死循环防护：** 文件大于 2MB 时自动标注提醒；内置 6.5 秒加载超时保护，脚本死循环自动中止，保证主站浏览丝滑不卡顿。
- **单文件与压缩包通吃：** 支持单文件 `.html`、包含图片/CSS 的 `.zip` 压缩包（自动解压并处理相对路径），或者直接粘贴代码。网页标题和描述自动解析。
- **多端视口预览 (`/p/[slug]`)：** 提供桌面端 (100%)、平板端 (768px)、手机端 (375px) 一键切换模拟，自带浏览器全屏模式和格式化源码查看。
- **开放 API 与终端脚本：** 支持通过终端命令行、CI/CD 脚本或 AI Coding Agent 调用 `POST /api/upload` 快速上传，内置 Scalar 交互式 API 文档 (`/api/docs`)。
- **存储与数据库随意选：** 文件可以直接存在本地硬盘、Cloudflare R2（S3 兼容，免公网流量费）或 Vercel Blob；数据库支持 PostgreSQL，本地开发没配数据库时自动切换到本地轻量 JSON 存储，免去繁琐配置。
- **公开分享或私密小工具：** 项目可设为公开（收录进社区发现广场）或仅自己可见。

---

## 部署方案

### 方式一：Docker Compose（推荐）

在任意 Linux 服务器（Ubuntu、Debian、Hetzner、DigitalOcean、软路由）上一行命令拉起：

```bash
# 1. 下载预置的 docker-compose.yml 配置文件
curl -fsSL https://raw.githubusercontent.com/QingYunA/html-manager/main/docker-compose.yml -o docker-compose.yml

# 2. 将默认密码修改为你自己的安全密码
sed -i 's/change_me_to_a_secure_password/你的强密码/' docker-compose.yml

# 3. 启动容器
docker compose up -d
```

Pagepod 即刻在服务器的 `http://你的IP:3000` 启动运行。文件持久化保存在 `./storage`，数据保存在 `./data`。

### 方式二：在 Coolify 中部署

1. 打开 Coolify 控制台，点击 **+ Create New Resource** → **Public Repository**；
2. 填写仓库地址：`https://github.com/QingYunA/html-manager`；
3. Coolify 将自动识别根目录下的 `Dockerfile`，将容器端口设置为 `3000`；
4. 在 **Environment Variables** 中添加：
   ```env
   ADMIN_PASSWORD=你的强密码
   NODE_ENV=production
   ```
5. 点击 **Deploy**。Coolify 会自动编译镜像、挂载卷并配置免费的 SSL 证书。

### 方式三：Vercel 一键部署（免费云端秒开）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FQingYunA%2Fhtml-manager&env=ADMIN_PASSWORD&envDescription=Set%20a%20master%20password%20for%20accessing%20the%20admin%20dashboard&stores=%5B%7B%22type%22%3A%22postgres%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

1. 点击上方按钮，将仓库 Fork 到你的 GitHub 账户；
2. 在向导中关联免费的 **Vercel Postgres** 与 **Vercel Blob**；
3. 设置 `ADMIN_PASSWORD` 环境变量，点击确认开始部署。

### 方式四：源码运行（本地开发）

初次启动无需配置外部数据库与云存储：

```bash
# 1. 克隆代码仓库
git clone https://github.com/QingYunA/html-manager.git
cd html-manager

# 2. 安装依赖 (推荐 bun，亦可使用 pnpm 或 npm)
bun install

# 3. 启动本地开发服务
bun run dev
```

在浏览器打开 [http://localhost:3000](http://localhost:3000) 即可浏览画廊，访问 `/login` 输入开发默认密码（`admin888`）进入后台管理。

生产环境裸机运行：
```bash
bun run build
bun run start
```

---

## API 与命令行上传

支持在终端脚本或自动化流水线中直接推送 HTML 文件：

- **交互式 API 文档：** 访问 `/api/docs`（由 Scalar 驱动）。
- **OpenAPI 3.1 Schema：** 访问 `/api/openapi.json`。

### CLI 脚本直接上传

```bash
node scripts/upload-cli.js ./reaction-time-test.html \
  --token "YOUR_API_TOKEN" \
  --title "反应速度测试" \
  --category "tools" \
  --endpoint "http://localhost:3000"
```

### cURL 直接上传文件 (Multipart Form)

```bash
curl -X POST https://your-domain.com/api/upload \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F "file=@benchmark.html" \
  -F "title=性能测试小工具" \
  -F "category=tools" \
  -F "tags=Canvas,Benchmark"
```

### cURL 推送代码字符串 (JSON)

```bash
curl -X POST https://your-domain.com/api/upload \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "代码雨动效演示",
    "html": "<!DOCTYPE html><html><head><title>Matrix</title></head><body><canvas id=\"c\"></canvas></body></html>",
    "category": "visualization",
    "tags": ["Canvas", "Animation"]
  }'
```

**响应示例：**

```json
{
  "success": true,
  "id": "ck89ab12cd34",
  "title": "代码雨动效演示",
  "slug": "matrix-rain-demo",
  "url": "https://your-domain.com/p/matrix-rain-demo",
  "rawUrl": "https://your-domain.com/raw/matrix-rain-demo/",
  "category": "visualization",
  "visibility": "public"
}
```

---

## 环境变量

| 环境变量 | 必填项 | 默认值 | 详细说明 |
| :--- | :--- | :--- | :--- |
| `ADMIN_PASSWORD` | **是** | `admin888` *(仅开发环境)* | 控制台管理员登录密码，亦可用作兜底 API Token。 |
| `DATABASE_URL` | 生产环境 | 空 *(本地自动使用轻量 JSON 存储)* | PostgreSQL 连接串（Vercel Postgres、Neon、Supabase）。 |
| `BLOB_READ_WRITE_TOKEN` | 可选 | 空 | Vercel Blob 读写密钥（Vercel 部署自动注入）。 |
| `R2_ACCOUNT_ID` | 可选 | 空 | Cloudflare R2 Account ID（实现 0 流量费时使用）。 |
| `R2_ACCESS_KEY_ID` | 可选 | 空 | Cloudflare R2 Access Key ID。 |
| `R2_SECRET_ACCESS_KEY` | 可选 | 空 | Cloudflare R2 Secret Access Key。 |
| `R2_BUCKET_NAME` | 可选 | `html-manager` | Cloudflare R2 存储桶名称。 |
| `API_TOKEN` | 可选 | 继承 `ADMIN_PASSWORD` | 开放 API 自动化推送的独立鉴权 Token。 |
| `SESSION_SECRET` | 可选 | 继承管理员密码 | 用于签署管理员 Session JWT 的密钥（建议 ≥16 位）。 |
| `NEXT_PUBLIC_SUPABASE_URL` | 可选 | 空 | Supabase 项目 URL（用于启用 Google OAuth 与邮箱验证码登录）。 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 可选 | 空 | Supabase 客户端公钥。 |

---

## 目录结构

```
html-manager/
├── Dockerfile                     # 多阶段生产环境镜像配置
├── docker-compose.yml             # 一键容器启动配置
├── public/                        # 静态资产与示例文件
├── src/
│   ├── app/
│   │   ├── (marketing)/           # 公开画廊、发现中心、关于与条款
│   │   ├── api/                   # 上传端点、OpenAPI 规范与 API 文档
│   │   ├── p/[slug]/              # 多端响应式交互运行台
│   │   ├── raw/[slug]/[[...path]] # 物理隔离沙箱与资源代理端点
│   │   └── workspace/             # 管理控制台与文件上传入口
│   ├── components/                # UI 组件与沙箱预览组件
│   ├── db/                        # Drizzle 数据模型与驱动
│   └── lib/                       # 存储适配器、HTML 解析与业务逻辑
├── drizzle.config.ts              # Drizzle ORM 配置
└── next.config.ts                 # Next.js 构建配置
```

---

## 参与贡献

欢迎提交 Issue 或 Pull Request：

1. Fork 本仓库；
2. 创建特性分支 (`git checkout -b feature/my-feature`)；
3. 提交修改 (`git commit -m 'feat: add my feature'`)；
4. 推送至分支 (`git push origin feature/my-feature`)；
5. 发起 Pull Request。

---

## 开源许可证

Pagepod 基于 [MIT License](LICENSE) 开源发布。

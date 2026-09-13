<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="public/brand/pagepod-logo-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="public/brand/pagepod-logo-monochrome.png">
  <img src="public/brand/pagepod-logo-monochrome.png" alt="Pagepod Logo" width="76" height="76">
</picture>

# Pagepod

<p><strong>A simple, self-hostable space to run and share HTML files.</strong><br>
Drop in standalone HTML files or zip packages, run them safely in an isolated sandbox, and share with a clean link. No build step, no subscription limits, and zero egress fees.</p>

<p>
  <a href="https://github.com/QingYunA/html-manager/releases"><img src="https://img.shields.io/badge/version-1.0.0-18181b?style=flat" alt="Version"></a>
  <a href="https://hub.docker.com/"><img src="https://img.shields.io/badge/Docker-ready-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker"></a>
  <a href="https://coolify.io/"><img src="https://img.shields.io/badge/Deploy%20on-Coolify-6366F1?style=flat" alt="Coolify"></a>
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FQingYunA%2Fhtml-manager&env=ADMIN_PASSWORD&envDescription=Set%20a%20master%20password%20for%20accessing%20the%20admin%20dashboard&stores=%5B%7B%22type%22%3A%22postgres%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D"><img src="https://img.shields.io/badge/Deploy%20with-Vercel-000000?style=flat&logo=vercel" alt="Deploy with Vercel"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-18181b?style=flat" alt="License"></a>
</p>

<p>
  <a href="https://pagepod.dev">Website</a> ·
  <a href="https://pagepod.dev/explore">Live Demo</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#comparison">Comparison</a> ·
  <a href="https://pagepod.dev/api/docs">API Docs</a> ·
  <a href="README_zh.md">简体中文</a>
</p>

</div>

---

## Why Pagepod?

When you build an HTML utility, a canvas experiment, or an exported UI prototype, sharing it should take seconds. In practice, it usually comes with annoying friction:

- **Hosting hassle:** Setting up Nginx configs, reverse proxies, and SSL certificates just to host a couple of static files is tedious.
- **Main domain risk:** Running untrusted third-party JavaScript directly on your main domain risks exposing session cookies and tokens.
- **Playground limits:** Online playgrounds often restrict multi-file assets, show ads, or charge monthly subscriptions. Cloud storage buckets add bandwidth egress bills.

**Pagepod gives your HTML files a clean, sovereign home:**
- **Zero build steps:** Drop in a `.html` file or a `.zip` archive with images and CSS. You get a shareable link and a live preview right away.
- **Hardened sandbox:** Pages run on dedicated `/raw/[slug]/` endpoints with strict CSP and no `allow-same-origin`. Untrusted scripts cannot touch your host cookies or admin sessions.
- **Your own hardware:** Run it on a $4/month VPS, in Docker or Coolify, on a home lab, or free on Vercel. Store files locally or in S3/R2.

---

## Self-Hosted vs. Cloud

| | Self-Hosted Pagepod (This Repo) | Pagepod Cloud (Managed) |
| :--- | :--- | :--- |
| **License & Price** | **100% Free & Open Source (MIT)** | Free & Lifetime Tiers |
| **Infrastructure** | Your own VPS, Coolify, Docker, or Vercel | Fully managed cloud cluster |
| **Data Ownership** | 100% on your hardware or S3/R2 bucket | Managed cloud storage |
| **Maintenance** | Handled by you | Zero maintenance, automatic updates |
| **Custom Domains** | Unlimited (via reverse proxy / Caddy) | Subdomains and custom routing included |
| **Get Started** | [Deployment guide](#deployment) | [pagepod.dev](https://pagepod.dev) |

---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          How Pagepod Works                                  │
│                                                                             │
│  Single .html / Multi-asset .zip / Code Paste / Tools & Games               │
│         │                                        │                          │
│         ▼                                        ▼                          │
│   Web Console (Drag / Zip / Paste)       POST /api/upload (CLI / PAT Token) │
│         │                                        │                          │
│         └───────────────────┬────────────────────┘                          │
│                             ▼                                               │
│                 Pagepod Core (Next.js 16)                                   │
│                             │                                               │
│    ┌────────────────────────┼────────────────────────┐                      │
│    ▼                        ▼                        ▼                      │
│  Storage Options       Database Layer         Hardened Sandbox Guard        │
│  • Local Disk Storage  • PostgreSQL (Neon/DB) • Isolated /raw/ origin       │
│  • Cloudflare R2 ($0)  • Supabase Auth        • Strict CSP: no same-origin  │
│  • Vercel Blob         • Local JSON Fallback  • Zero host cookie leak       │
│    │                        │                        │                      │
│    └────────────────────────┼────────────────────────┘                      │
│                             ▼                                               │
│         ┌───────────────────┴───────────────────┐                           │
│         ▼                                       ▼                           │
│  Public Gallery (/explore)              Runner & Inspector (/p/[slug])      │
│  • Lightweight static posters           • Desktop / Tablet / Mobile views   │
│  • Hover or click to preview            • Raw sandboxed runner (/raw/)      │
│  • Active sandboxes capped at 6         • Formatted source viewer + copy    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Comparison

| Feature | Pagepod (Self-Hosted) | CodePen / JSFiddle | v0 / Bolt Preview | Raw S3 / R2 Bucket |
| :--- | :---: | :---: | :---: | :---: |
| **Self-host on your own hardware** | **Yes (VPS / Docker)** | No (SaaS only) | No (SaaS only) | Yes |
| **Hardened CSP sandbox** | **Yes (`/raw/` isolated)** | Partial | Partial | No (Same-domain risk) |
| **Zip archives with relative assets** | **Yes (Auto-extract)** | Paid tier only | Limited | Manual upload |
| **Multi-device preview (Desktop/Pad/Phone)** | **Yes (1-click switch)** | Manual resize | Yes | No |
| **CLI & API push (`/api/upload`)** | **Yes (OpenAPI + Token)** | No | No | S3 CLI only |
| **Gentle on CPU/GPU (No iframe overload)** | **Yes (Poster + LRU 6)** | Heavy iframes | Heavy iframes | N/A |
| **Client-side encryption (E2EE)** | **Yes (AES-GCM)** | No | No | No |
| **Bandwidth egress markup** | **$0 (R2 or local disk)** | Subscription | Subscription | Cloud provider fees |

---

## Features

- **Hardened security sandbox:** Untrusted HTML runs in an isolated `/raw/[slug]/` endpoint with strict CSP headers. Without `allow-same-origin`, scripts can never access your host cookies, admin tokens, or local storage.
- **Gentle on your hardware:** Gallery cards show clean static posters by default. Sandboxes only boot when you click or hover. A pool limit caps active iframes at 6, keeping memory low and fans quiet.
- **Large file and loop protection:** Visual warnings for files over 2MB, plus an automatic 6.5s timeout guard that stops runaway scripts from freezing your tab.
- **Drop in files or zips:** Upload single `.html` files, `.zip` packages with images and CSS, or paste raw code directly. Page titles and meta descriptions are parsed automatically.
- **Responsive viewports (`/p/[slug]`):** Switch between Desktop (100%), Tablet (768px), and Mobile (375px) with one click. Includes full-screen mode and formatted source viewing.
- **CLI and API uploads:** Push files directly from terminal scripts, CI/CD, or coding agents using `POST /api/upload` with personal access tokens (`pp_live_...`). Interactive docs live at `/api/docs`.
- **Flexible storage & database:** Store files on your local drive, Cloudflare R2 ($0 egress fees), or Vercel Blob. Works with PostgreSQL in production, or a zero-config local JSON file for dev.
- **Public showcase or private tools:** Keep experiments private for your own account, or publish them to the community showcase.

---

## Deployment

### 1. Docker Compose (Recommended)

Run on any Linux VPS (Hetzner, DigitalOcean, Debian, Ubuntu) with one command:

```bash
# 1. Download docker-compose.yml
curl -fsSL https://raw.githubusercontent.com/QingYunA/html-manager/main/docker-compose.yml -o docker-compose.yml

# 2. Set your admin password
sed -i 's/change_me_to_a_secure_password/your_real_password/' docker-compose.yml

# 3. Start the container
docker compose up -d
```

Pagepod is now running at `http://YOUR_SERVER_IP:3000`. Files and data persist in `./storage` and `./data`.

### 2. Deploy on Coolify

1. In Coolify, click **+ Create New Resource** → **Public Repository**.
2. Enter the repository URL: `https://github.com/QingYunA/html-manager`.
3. Coolify will detect the `Dockerfile`. Set the internal container port to `3000`.
4. In **Environment Variables**, add:
   ```env
   ADMIN_PASSWORD=your_secure_password
   NODE_ENV=production
   ```
5. Click **Deploy**. Coolify provisions SSL and starts the container.

### 3. Deploy on Vercel (1-Click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FQingYunA%2Fhtml-manager&env=ADMIN_PASSWORD&envDescription=Set%20a%20master%20password%20for%20accessing%20the%20admin%20dashboard&stores=%5B%7B%22type%22%3A%22postgres%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

1. Click the button above to clone to your GitHub account.
2. Link free **Vercel Postgres** and **Vercel Blob** stores in the wizard.
3. Set `ADMIN_PASSWORD` and deploy.

### 4. Run Locally from Source

No database or external services required for local development:

```bash
# 1. Clone repo
git clone https://github.com/QingYunA/html-manager.git
cd html-manager

# 2. Install dependencies (bun, pnpm, or npm)
bun install

# 3. Start dev server
bun run dev
```

Open `http://localhost:3000` to view the showcase. Visit `/login` with password `admin888` to open the workspace.

For production bare-metal:
```bash
bun run build
bun run start
```

---

## API & CLI Uploads

Push HTML files programmatically from scripts, GitHub Actions, or AI agents.

- **Interactive API Docs:** Available at `/api/docs` (Scalar).
- **OpenAPI 3.1 Spec:** Available at `/api/openapi.json`.

### CLI Upload Script

```bash
node scripts/upload-cli.js ./matrix-rain.html \
  --token "YOUR_API_TOKEN" \
  --title "Matrix Rain Animation" \
  --category "visualization" \
  --endpoint "http://localhost:3000"
```

### Upload via cURL (File)

```bash
curl -X POST https://your-domain.com/api/upload \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F "file=@demo.html" \
  -F "title=Physics Simulator" \
  -F "category=tools" \
  -F "tags=Canvas,Physics"
```

### Push Raw HTML Code via cURL (JSON)

```bash
curl -X POST https://your-domain.com/api/upload \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Interactive Calculator",
    "html": "<!DOCTYPE html><html><head><title>Calc</title></head><body>...</body></html>",
    "category": "tools",
    "tags": ["Utility", "Vue"]
  }'
```

**Response:**

```json
{
  "success": true,
  "id": "ck89ab12cd34",
  "title": "Interactive Calculator",
  "slug": "interactive-calculator",
  "url": "https://your-domain.com/p/interactive-calculator",
  "rawUrl": "https://your-domain.com/raw/interactive-calculator/",
  "category": "tools",
  "visibility": "public"
}
```

---

## Environment Variables

Configure these in `.env.local` or your container environment:

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `ADMIN_PASSWORD` | **Yes** | `admin888` *(dev only)* | Master dashboard password and fallback API token. |
| `DATABASE_URL` | Production | None *(local JSON fallback)* | PostgreSQL connection string (Neon, Supabase, Vercel Postgres). |
| `BLOB_READ_WRITE_TOKEN` | Optional | None | Vercel Blob access token. |
| `R2_ACCOUNT_ID` | Optional | None | Cloudflare R2 Account ID (for $0 egress cloud storage). |
| `R2_ACCESS_KEY_ID` | Optional | None | Cloudflare R2 Access Key ID. |
| `R2_SECRET_ACCESS_KEY` | Optional | None | Cloudflare R2 Secret Access Key. |
| `R2_BUCKET_NAME` | Optional | `html-manager` | Cloudflare R2 bucket name. |
| `API_TOKEN` | Optional | Inherits `ADMIN_PASSWORD` | Dedicated token for API upload authentication. |
| `SESSION_SECRET` | Optional | Fallback to password | Secret key for signing session JWTs (≥16 chars). |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | None | Supabase URL for Google OAuth and Email OTP. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | None | Supabase Anonymous Key for public client auth. |

---

## Project Structure

```
html-manager/
├── Dockerfile                     # Multi-stage production container image
├── docker-compose.yml             # 1-command container deployment recipe
├── public/                        # Static assets, branding, and examples
├── src/
│   ├── app/
│   │   ├── (marketing)/           # Public gallery, explore, about, and privacy pages
│   │   ├── api/                   # Upload endpoints, OpenAPI spec, and docs
│   │   ├── p/[slug]/              # Multi-viewport interactive runner
│   │   ├── raw/[slug]/[[...path]] # Isolated CSP sandbox endpoint
│   │   └── workspace/             # Authenticated dashboard and file uploads
│   ├── components/                # UI primitives (shadcn) and preview components
│   ├── db/                        # Drizzle schema and database drivers
│   └── lib/                       # Storage adapters, parser, and business logic
├── drizzle.config.ts              # Drizzle ORM configuration
└── next.config.ts                 # Next.js build and routing configuration
```

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository.
2. Create your branch (`git checkout -b feature/my-feature`).
3. Commit your changes (`git commit -m 'feat: add my feature'`).
4. Push to the branch (`git push origin feature/my-feature`).
5. Open a Pull Request.

---

## License

Pagepod is open-source under the [MIT License](LICENSE).


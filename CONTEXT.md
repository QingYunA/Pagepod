# CONTEXT.md - Domain Model: html-manager (Pagepod)

This file is the single source of truth for the domain glossary and architectural invariants of the **Pagepod** platform.

---

## 1. Core Domain Terms

- **Project**: A standalone hosted web application, game, or tool represented by a unique `slug`. Can be an ingested single HTML document (`single_html`) or a multi-file zip archive (`zip_bundle`).
- **Actor (`CurrentUser`)**: The authenticated entity performing an operation. Can be a registered user (`userId`), an admin, or the self-hosted default administrator (`selfhost-admin`).
- **ProjectStorage**: A scoped storage abstraction bounded to `sites/${slug}`. Encapsulates path construction, traversal safety checks, and binary/asset persistence so callers never assemble raw storage keys manually.
- **ScreenshotRenderer**: A pure rendering port (`render(html) -> Buffer`) decoupling headless browser capture (Chrome CLI args, timeout, virtual time budget, temp file isolation) and cloud fallbacks from domain and database mutations.
- **BillingService & PlanQuota**: The authority governing user tiers (`free`, `lite`, `pro`) and payment order state transitions. Enforces hard backend limits (e.g. Free: 20 projects, 2MB max upload; Lite: 500 projects, 10MB; Pro: unlimited).
- **Entry Path**: The relative file path to the primary HTML document within the project's storage prefix (typically `index.html`).
- **Visibility**: The discovery and access control tier of a project (binary model per ADR 0003):
  - `public`: Listed in showcase/explore feeds, indexable by search engines, viewable by anyone, protected by automated compliance gates.
  - `private`: Strictly accessible **only by the exact creator**. Even platform administrators cannot view or peek at other users' private project contents or raw endpoints.
  _Avoid_: unlisted (deprecated to eliminate unauthenticated anonymous blast radius).
- **Poster (Screenshot)**: A 1280x720 static PNG preview of the project's entry view. Used for instant, zero-cost card previews across the catalog and workspace without spinning up iframes.
- **Curated Ingestion**: The programmatic ingestion and publication of vetted community and open-source web applications via API tokens into the platform's public showcase gallery.
- **License Provenance**: The legal compliance invariant requiring all catalog showcase applications to possess verified permissive licensing (`MIT`, `Apache-2.0`, `BSD`, `GPL`, `CC0`) with original author and upstream repository attribution.
- **Guest Sovereignty**: The core architectural principle that hosted projects possess full visual and technical autonomy (arbitrary visual styles, frameworks, and external CDN scripts), while security is enforced via strict sandbox CSP boundaries rather than styling constraints.
- **ReviewStatus**: The compliance lifecycle state of a hosted project (`pending`, `approved`, `rejected`, `flagged`).
- **Tiered Enforcement**: The compliance remediation strategy where severe legal violations (CSAM, pornography, gore, phishing) trigger immediate access cutoff (`rejected`), while geopolitical or sensitive political controversies trigger automated downgrade to `private` mode with in-app creator notification and appeal rights.

- **Global Pin (`isGlobalPinned`, `globalPinnedAt`)**: A curated showcase state set exclusively by administrators to promote standout public projects to the very top of the public explore and home galleries, ordered by `globalPinnedAt` descending.
- **Workspace Pin (`isPinned`, `pinnedAt`)**: A user-scoped preference allowing project owners to pin their frequently edited or important projects to the top of their personal `/workspace` table or grid.
- **Language Dimension (`language`)**: An orthogonal classification attribute (`zh` | `en` | `other`) identifying the primary user interface language of the hosted HTML application, automatically detected at ingestion and filterable independently of functional categories.
- **Trending Score**: A time-decay popularity scoring function ($Score = \frac{ViewCount + 1}{(AgeInHours + 2)^{1.5}}$) applied to unpinned public projects to balance fresh submissions with proven high-engagement applications.
- **Taxonomy (Category)**: The functional domain categorization of a project (`tools`, `games`, `visualization`, `prototypes`, `animations`, `ai`, `creative`, `others`).
- **Deployment Mode (`APP_MODE`)**: The operational topology of the platform:
  - `selfhost` (Default): Sovereign single-instance mode with unlimited resource quotas, zero commercial/SaaS UI noise, password-first authentication (`selfhost-admin`), and an independent personal showcase portal.
  - `cloud`: Multi-tenant commercial SaaS mode backed by Supabase Auth (OAuth / magic links / email OTP), transactional emails, tiered subscriptions (`free`, `lite`, `pro`), and automated PayPal payment processing.
- **Sovereign Admin (`selfhost-admin`)**: The root owner of a self-hosted instance possessing unmetered project creation quotas, global showcase pin authority, and complete system autonomy without external SaaS billing dependencies.
- **Commercial Decoupling**: The strict architectural invariant ensuring billing routes (`/pricing`), upgrade prompts, payment SDKs, and subscription banners are completely silenced and bypassed in self-hosted deployments.
- **Dual-Personality Portal**: The adaptive front-door routing of self-hosted instances: presenting an uncommercialized, branded public project portfolio to anonymous visitors, providing seamless dashboard access to the authenticated owner, and supporting `PRIVATE_INSTANCE=true` for fully private intranets.
- **Guest Ingestion (Instant Upload)**: Zero-friction ingestion channel allowing unauthenticated visitors to drag-and-drop single HTML files directly on the home hero to receive a live preview URL, bound by strict $\le 2\text{MB}$ size caps and IP rate limits.
- **Claim Token**: A cryptographic credential generated during guest ingestion and stored in the visitor's `localStorage`, granting ephemeral edit/deletion authority and enabling one-click project claim upon subsequent account sign-in.
- **Secret Leak Guard**: Client-side and server-side heuristic scanners detecting accidentally exposed credentials (OpenAI, Anthropic, AWS, GitHub PATs, private keys) before public publication, enforcing soft-gating or privacy downgrade.
- **Curated Hub (Pillar & Cluster)**: Purpose-built topical showcase routes (e.g. `/explore/tools`, `/explore/games`) organizing public micro-apps by intent rather than abstract tech stacks, adhering to an 80% card grid / 20% concise technical spec ratio.
- **Anti-Bounce Drawer**: An unobtrusive collapsible info-and-recommendation layer on `/p/[slug]` presenting creator metadata, 3~4 related showcase projects, and source inspection to maximize user engagement and session depth.
- **Standard Industrial Scale**: The design system token baseline conforming to standard shadcn/ui ergonomics (`h-9` 36px / `h-10` 40px controls, `text-sm` 14px base, `text-base` 16px cards, minimum `text-xs` 12px for badges/metadata), replacing deprecated ultra-compact micro-scales per ADR 0006.

---

## 2. Invariants & Seam Rules

1. **Authorization at the Seam**: All project lifecycle mutations (`create`, `update`, `delete`, `togglePin`, `toggleGlobalPin`, `updateVisibility`, `updateContent`) must receive an `actor` and enforce ownership rules inside the domain module. Only administrators may execute `toggleGlobalPin`.
2. **Pin Priority Invariant**: Pinned projects strictly precede unpinned projects in both workspace and public showcase views, ordered internally by their respective pin timestamp (`pinnedAt` / `globalPinnedAt` descending).
3. **Orthogonal Language Independence**: Changing or filtering by functional category (`category`) must not alter or restrict the project's language attribute (`language`), and vice versa.
4. **Server-Side Quota Enforcement**: `createProject` verifies project count and payload size limits against `PlanQuota` prior to asset ingestion and storage writes. In self-hosted mode, quotas evaluate to unconstrained sovereign defaults (`selfhost-unlimited`).
5. **Self-Hosted by Default**: The instance must operate in `selfhost` mode by default. Cloud SaaS behavior is only activated when `APP_MODE=cloud` is explicitly declared alongside valid cloud authentication and database credentials.
6. **Zero Commercial Noise in Self-Hosted**: Self-hosted instances must never render subscription pricing, upgrade prompts, or payment capture modals. Accessing `/pricing` in self-hosted mode redirects to `/workspace`.
7. **Encapsulated Asset Storage**: Callers must never manually format or manipulate `sites/${slug}/...` strings. All file writes, zip extractions, and storage cleanup must be encapsulated behind `ProjectStorage` and `ProjectService`.
8. **Atomic State & Poster Synchronization**: Project updates that modify HTML content coordinate screenshot rendering and perform a single atomic database update, followed by unified Next.js view cache revalidation.
9. **Decoupled Rendering Port**: `ScreenshotRenderer` does not touch databases or issue Next.js cache revalidations. It returns raw image buffers to orchestrators.
10. **Typed Domain Exceptions**: Failures within domain layers are signaled by explicit typed errors (`NotFoundError`, `ForbiddenError`, `ValidationError`, `PayloadTooLargeError`), which are translated into appropriate HTTP or Action responses by caller adapters.
11. **Compliance Seam Isolation**: Content moderation executes asynchronously post-commit via dual-core multimodal inspection (HTML DOM text extraction + rendered headless poster audit), preventing illegal content leakage into public discovery feeds without stalling upload latency.
12. **Guest Quota & Ingestion Boundary**: Guest ingestion is strictly limited to single HTML files $\le 2\text{MB}$, enforces IP rate limiting (10 uploads/hour per IP), and requires automated moderation before public listing.
13. **Public Exposure Consent & Secret Guard**: Public publication requires clear user disclosure. If client-side or server-side secret guards detect exposed private API keys or certificates, the project is gated with an explicit confirmation dialog or automatically downgraded to `private`.
14. **Standard Industrial UI & Typography Floor**: All UI components and views adhere to standard industrial scales (`h-9` 36px base controls, 14px~16px content typography). To prevent visual fatigue and sub-pixel illegibility, `text-xs` (12px) is the platform-wide minimum font floor; hardcoded micro-typography (`text-[10px]`, `text-[11px]`) is strictly prohibited per ADR 0006.

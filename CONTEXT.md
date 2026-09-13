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
- **Visibility**: The discovery and access control tier of a project:
  - `public`: Listed in showcase/explore feeds, indexable by search engines, viewable by anyone.
  - `unlisted`: Unindexed and hidden from public feeds; viewable only by anyone possessing the direct link.
  - `private`: Strictly accessible **only by the exact creator**. Even platform administrators cannot view or peek at other users' private project contents or raw endpoints.
- **Poster (Screenshot)**: A 1280x720 static PNG preview of the project's entry view. Used for instant, zero-cost card previews across the catalog and workspace without spinning up iframes.
- **Curated Ingestion**: The programmatic ingestion and automated publication of vetted standalone web applications via API tokens into the platform's public showcase gallery.
- **License Provenance**: The legal compliance invariant requiring all catalog showcase applications to possess verified permissive licensing (`MIT`, `Apache-2.0`, `CC0` or clean-room original IP) with author attribution.
- **Standalone Enclosure**: The engineering contract requiring an ingested HTML document to inline all CSS, JS logic, and SVG iconography with zero blocking external third-party CDN script dependencies.

---

## 2. Invariants & Seam Rules

1. **Authorization at the Seam**: All project lifecycle mutations (`create`, `update`, `delete`, `togglePin`, `updateVisibility`, `updateContent`) must receive an `actor` and enforce ownership rules inside the domain module.
2. **Server-Side Quota Enforcement**: `createProject` verifies project count and payload size limits against `PlanQuota` prior to asset ingestion and storage writes.
3. **Encapsulated Asset Storage**: Callers must never manually format or manipulate `sites/${slug}/...` strings. All file writes, zip extractions, and storage cleanup must be encapsulated behind `ProjectStorage` and `ProjectService`.
4. **Atomic State & Poster Synchronization**: Project updates that modify HTML content coordinate screenshot rendering and perform a single atomic database update, followed by unified Next.js view cache revalidation.
5. **Decoupled Rendering Port**: `ScreenshotRenderer` does not touch databases or issue Next.js cache revalidations. It returns raw image buffers to orchestrators.
6. **Typed Domain Exceptions**: Failures within domain layers are signaled by explicit typed errors (`NotFoundError`, `ForbiddenError`, `ValidationError`, `PayloadTooLargeError`), which are translated into appropriate HTTP or Action responses by caller adapters.

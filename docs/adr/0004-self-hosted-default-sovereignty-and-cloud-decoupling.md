# 0004. Self-Hosted Default Topology, Sovereign Resource Unlock, and Commercial Decoupling

## Context

Pagepod originally evolved with mixed assumptions between multi-tenant commercial SaaS features (Stripe/PayPal billing, tiered quotas like Free/Lite/Pro, Supabase OAuth/email OTP verification) and private single-tenant deployment (`ADMIN_PASSWORD`, `selfhost-admin`).

This produced notable architectural friction and user-experience dissonance in self-hosted environments:
1. **Implicit and Unstable Mode Detection**: The platform inferred "cloud mode" implicitly if Supabase keys were present in the environment, risking unintended activation of external auth requirements on private instances.
2. **Commercial Noise on Sovereign Infrastructure**: Administrators running private instances on their own servers were still confronted with SaaS pricing tiers (`/pricing`), upgrade prompts, and quota exhaustion warnings ("20 projects limit").
3. **Authentication Friction**: The login interface mixed multi-tenant OAuth and email verification forms with self-hosted password validation, introducing confusion when deploying in environments without external SMTP or OAuth providers.
4. **Surfacing Dilemma**: The root path `/` was optimized for commercial conversion (SaaS marketing pitch, customer testimonials, and subscription pricing), which is inappropriate when an individual or team self-hosts Pagepod to showcase their own portfolio.

Benchmark analysis of prominent self-hosted open-source software (Coolify, Sub2API, CLIProxyAPI) revealed clear architectural patterns:
- **Coolify** operates on a single-codebase dual-mode model defaulting to self-hosted (`SELF_HOSTED=true`), bypasses all subscription middleware, and unlocks server limits (`limits = 999999999999`).
- **Sub2API** introduces `RUN_MODE=simple` to early-return and bypass billing/quota engines entirely, while offering `compact_home` and white-label branding.
- **CLIProxyAPI (CPA)** relies on local single-owner configuration and grants unmetered downstream rights.

## Decision

1. **Self-Hosted by Default with Explicit Cloud Activation**:
   - `APP_MODE` defaults to `selfhost`.
   - Cloud multi-tenant mode requires explicit configuration of `APP_MODE=cloud` alongside valid Supabase authentication and database credentials.
   - Centralize environment topology queries behind unified helpers: `isCloudMode(): boolean` and `isSelfHosted(): boolean`.

2. **Sovereign Resource Unlock & Commercial Decoupling**:
   - In self-hosted mode, user quotas evaluate to `selfhost-unlimited`: unlimited project capacity, relaxed upload size limits (`MAX_UPLOAD_SIZE`, defaulting to 50MB-100MB), and unrestricted global pin controls.
   - Completely eliminate commercial UI in self-hosted mode:
     - Hide navigation links to `/pricing`, upgrade buttons, and subscription management.
     - Automatically redirect `/pricing` to `/workspace` (HTTP 307).
     - Disable/short-circuit payment capture endpoints (PayPal).
     - Suppress quota usage progress warnings ("X/20 projects used").

3. **Password-First Sovereign Authentication**:
   - In self-hosted mode, `/login` presents a direct, focused administrator password authentication form (`ADMIN_PASSWORD`).
   - Eliminate mandatory email verification or third-party OAuth flows for self-hosted instances.
   - Preserve `selfhost-admin` as the root sovereign identity across database and storage operations.

4. **Dual-Personality Portal & Private Instance Toggle**:
   - In self-hosted mode, anonymous visitors to `/` see a clean, branded personal/organization portfolio showcase without SaaS marketing pitches, dynamically branded with `SITE_NAME`.
   - Authenticated administrators accessing `/` are seamlessly routed to `/workspace`.
   - Support `PRIVATE_INSTANCE=true`: when enabled, unauthenticated requests to `/` immediately redirect to `/login`, transforming the deployment into a private intranet console.

## Consequences

- Delivers a zero-friction, sovereign developer experience for self-hosters with no external cloud dependencies.
- Eliminates code duplication by maintaining a clean single codebase where commercial concerns are decoupled through explicit mode guards.
- Establishes clear boundaries in `billing-service.ts`, `auth.ts`, `workspace-dashboard-header.tsx`, and routing middleware.

# ADR 0006: GuestTransient Token-Protected Links and Pro Project-Level Customization

- **Status**: accepted
- **Date**: 2026-09-14

## Context

Following automated E2E browser auditing on `pagepod.dev`, two architectural ambiguities were surfaced and clarified:
1. **Visibility Terminology Conflict**: ADR 0003 declared a binary visibility model (`public` vs `private`), deprecating legacy `unlisted` status to close anonymous attack surfaces. However, the guest ingestion pipeline requires an unindexed, protected link state prior to public showcase promotion.
2. **Pro-Tier Feature Manifestation**: Commercial pricing promotes two high-value Pro perks: custom subdomains (`https://[slug].pagepod.dev`) and white-label mode (hiding the "Hosted on Pagepod" viral badge). These capabilities required an explicit domain boundary decision: whether they are bound to the user account or configured per project.

## Decision

1. **GuestTransient Domain Formalization**:
   - The unauthenticated upload state previously referred to colloquially as "Unlisted" is formally codified as **`GuestTransient`** (`Token-Protected Guest Link`).
   - `GuestTransient` is strictly an ingress state: it enforces HTTP `X-Robots-Tag: noindex, nofollow`, requires a client-side `ClaimToken` for mutation authority, and omits the project from public showcase feeds until claimed or manually converted to `public`.
   - The platform core model remains binary (`public` vs `private`) for registered creators.

2. **Project-Scoped Pro Customization**:
   - Pro capabilities (`customSubdomain` and `isWhiteLabel`) are modeled as project-level attributes rather than account-wide toggles.
   - **White-Label Mode (`isWhiteLabel`)**: When enabled on a project by a Pro user, the floating "Hosted on Pagepod" badge is hidden on the runner `/p/[slug]`.
   - **Subdomain Routing (`customSubdomain`)**: Dynamic host rewriting in the edge proxy maps `https://${slug}.pagepod.dev/` directly to `/p/${slug}`, maintaining sandbox CSP isolation.
   - **Authorization at the Seam**: Free-tier accounts attempting to activate `isWhiteLabel` or register custom subdomains are rejected with typed domain errors at `ProjectService`.

3. **Creator Secret Leak Soft-Gating**:
   - Ingestions in `/workspace/upload` run static credential analysis (`scanHtmlForSensitiveData`) on public submission.
   - Detected private keys trigger an interactive modal (`PublicRiskDialog`) providing immediate one-click downgrade to `private` or explicit acknowledged consent before public persistence.

## Consequences

- Resolves vocabulary ambiguity across marketing copy, domain documentation, and database fields.
- Provides Pro creators with modular client delivery workflows: projects can individually opt into white-label branding or showcase attribution.
- Prevents accidental credential leaks without disrupting valid educational code samples.

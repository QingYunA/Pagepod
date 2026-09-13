# ADR 0005: Guest Ingestion, Anti-Abuse Defense, and Public Curation Architecture

- **Status**: accepted
- **Date**: 2026-09-14

## Context

Pagepod targets the low-KD, high-intent keyword cluster around "upload html file and get link" and "host html file free" while building a long-term organic discovery moat through its public showcase gallery. Unlike single-purpose ephemeral upload tools (e.g. host-html.com) that suffer from 16-second dwell times and 37% bounce rates, Pagepod bridges instant utility with public content curation.

## Decision

1. **Dual-Surface Home Hero**: The home hero embeds an instant, zero-friction single HTML drag-and-drop zone (<= 2MB), followed directly by the curated public showcase grid. Unauthenticated guests receive an instant sandboxed link without forced registration.
2. **Four-Layer Anti-Abuse Defense**:
   - **Traffic Layer**: IP rate limit of 10 uploads/hour, enforced via sliding window cache.
   - **Payload Layer**: Strict <= 2MB payload ceiling; content-type nosniff; hardened CSP sandbox disallowing same-origin privileges.
   - **Secret Leak Guard**: Client-side heuristic pre-flight scan checking for sensitive credentials (OpenAI, Anthropic, AWS, GitHub PATs, private keys) with an explicit confirmation dialog before public publication.
   - **Content Moderation**: Synchronous phishing/crypto-drainer heuristic scanning followed by asynchronous multimodal moderation.
3. **Claim Token Ephemeral Ownership**: Guest uploads issue a cryptographic `claimToken` saved to the visitor's `localStorage`. The guest can edit or delete their upload from the same browser, and seamlessly transfer ownership to a registered account upon sign-in.
4. **Curated Topical Hubs**: Topic pages (`/explore/[category]`) maintain an 80% visual card grid to 20% concise technical specification ratio to provide crawlable semantic depth without degrading minimal industrial UI aesthetics.
5. **Anti-Bounce Drawer on Runner**: The full-screen runner `/p/[slug]` retains an unobtrusive, collapsible drawer presenting creator attribution, 3~4 related projects, and source inspection to foster internal link equity and user dwell time.

## Consequences

- Lowers top-of-funnel drop-off by removing authentication friction for first-time tool users.
- Protects infrastructure and domain reputation against spam, phishing, and runaway storage costs.
- Prevents catastrophic accidental exposure of user API keys during public sharing.
- Transforms ephemeral tool traffic into lasting community discovery and Google search index equity.

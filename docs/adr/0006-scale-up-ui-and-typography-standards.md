# ADR 0006: Scale Up UI and Typography Standards (Standard Industrial Scale)

- **Status**: accepted
- **Date**: 2026-09-14

## Context

Previously, `AGENTS.md` and early component implementations encouraged ultra-compact micro-scales ("32px/36px, 11px~13px"). Across modern high-resolution desktop monitors and standard laptop screens, this resulted in an excessively shrunken, illegible user interface:
- Extensive usage of un-semantic `text-[10px]` and `text-[11px]` classes;
- Shrunken buttons (`h-7`/`h-8` with `text-xs` and 12px icons);
- Miniature card titles (`text-sm`) and descriptions (`text-xs`), surrounded by wide, empty negative space;
- Visual fatigue, poor readability, and sub-optimal touch/click ergonomics.

## Decision

1. **Shadcn/UI Standard Industrial Scale**:
   - **Button**: Default size returns to standard `h-9 px-4 text-sm` (36px/14px), `sm` to `h-8 px-3 text-xs` (32px/12px), `lg` to `h-10 px-6 text-sm/text-base` (40px), `icon` to `h-9 w-9`, with SVG icons defaulting to `size-4` (16px).
   - **Input**: Standardize to `h-9 text-sm` (36px/14px).
   - **Badge**: Base badge returns to `text-xs px-2.5 py-0.5` (12px).
2. **Absolute Font Floor Invariant (Zero Micro-Text)**:
   - Completely purge and ban all `text-[10px]` and `text-[11px]` across the platform.
   - The absolute physical floor for typography across the application is `text-xs` (12px), reserved exclusively for secondary metadata, timestamps, and compact status badges.
3. **Gallery & Showcase Card Typography Hierarchy**:
   - Card Titles: `text-base font-semibold` (16px).
   - Card Descriptions: `text-sm text-muted-foreground leading-relaxed` (14px).
   - Tags, Slugs, Status Badges, and Metadata: `text-xs font-medium` (12px).
   - Dual-Action Floating Sandbox Capsule: `text-xs font-medium` with 14px play icon and expanded hit targets.
   - Grid layout maintains 3 columns on desktop, with breathing room widened from `gap-4` (16px) to `gap-5` (20px).
4. **Header & Hero Proportions**:
   - Main navigation bar expanded from `h-14` (56px) to standard `h-16` (64px).
   - Brand logo title scaled to `text-base font-semibold` (16px).
   - Hero subtitle scaled to `text-sm sm:text-base` and feature chips to `text-sm` with 16px icons.
5. **Explore Hub & Category Pages**:
   - Category Hub cards: Title `text-base font-semibold` (16px), description `text-sm text-muted-foreground`, count badge `text-xs font-mono`, category icons `w-5 h-5` (20px).
   - Tag chips: Expanded to `px-3 py-1.5 text-xs sm:text-sm font-mono`.
   - Technical specifications (Curated Pillar Specs): Body text scaled to `text-sm`.
6. **Workspace & Admin Table Density**:
   - Table headers: `text-xs font-semibold uppercase tracking-wider text-muted-foreground`.
   - Table rows: Height relaxed to ~52px with `text-sm font-medium` project titles and `text-xs font-medium` status badges.

## Consequences

- Significantly enhances readability, contrast, and visual balance across desktop and mobile devices.
- Eliminates cramped, amateurish micro-typography while retaining the sleek, monochrome, engineering-first aesthetic.
- Provides a clean, authoritative reference that stops AI agents from regressing to sub-12px styles.

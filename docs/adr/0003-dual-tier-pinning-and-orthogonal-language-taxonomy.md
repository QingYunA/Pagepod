# 0003. Dual-Tier Pinning, Orthogonal Language Dimension, and Time-Decay Ranking

## Context

Pagepod previously used a single boolean `isPinned` on the `projects` table. When users toggled pin status in their personal workspace, the query in `getAllProjects` forced pinned projects to the top of both personal workspaces and the global public showcase. This created an authorization leak where tenant-level actions affected global catalog curation.

Additionally, user requests emerged for "Chinese vs. English" categorization alongside functional categories (e.g. tools, games, visualizations). Modeling language as a functional category enum causes classification conflicts (e.g. a Chinese calculator cannot be categorized as both a "Tool" and "Chinese").

Furthermore, projects were displayed strictly in reverse chronological order without modern popularity scoring or user-selectable sorting.

## Decision

1. **Dual-Tier Pinning Separation**:
   - **Global Pin (`isGlobalPinned`, `globalPinnedAt`)**: Exclusively managed by administrators (`assertCanManageProject` with admin role) for public showcase promotion.
   - **Workspace Pin (`isPinned`, `pinnedAt`)**: Scoped to the project owner's workspace view.
   - Pinned items in each view are ordered by their respective pin timestamp descending (`pinnedAt DESC` / `globalPinnedAt DESC`).

2. **Orthogonal Language Modeling**:
   - Model `language` as an independent, first-class attribute (`zh` | `en` | `other`) on the `projects` table.
   - Ingest projects with automated language detection (evaluating `<html lang="...">` tags and CJK character distribution), allowing manual user overrides during and after upload.
   - Support orthogonal filtering in showcase and explore views (e.g. "Games in Chinese", "Tools in English").

3. **Time-Decay Ranking Algorithm**:
   - Unpinned public projects support selectable sort orders:
     - `trending` (default): Popularity decay score $Score = \frac{ViewCount + 1}{(AgeInHours + 2)^{1.5}}$
     - `newest`: `createdAt DESC`
     - `views`: `viewCount DESC`
     - `alpha`: `title ASC`

## Consequences

- Completely isolates operational curation from tenant workspace preferences.
- Eliminates taxonomy collision between language and utility domains, enabling scalable multi-language internationalization and SEO routes.
- Requires additive database migrations for `is_global_pinned`, `global_pinned_at`, `pinned_at`, and `language`.

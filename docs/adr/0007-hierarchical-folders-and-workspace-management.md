# 0007. Hierarchical Folders and Dual-Pane Workspace Management

To support users managing hundreds of hosted HTML applications without visual clutter or navigation fatigue, we introduce a user-scoped hierarchical `Folder` model completely orthogonal to the public showcase `Category`. The workspace adopts a dual-pane layout (collapsible folder tree sidebar on the left, scoped project table/grid with breadcrumbs on the right), replaces heavy hover iframe sandboxes in table rows with lightweight static fallback posters, and provides a multi-select Batch Action Bar for high-throughput bulk organization.

## Considered Options
- **Flat tags only**: Too loose and disorganized for hundreds of files; doesn't provide structured directory-like separation.
- **Tying folders to public categories**: Conflates private organizational intents (e.g. "Drafts", "Client A") with public catalog taxonomy.
- **Embedded inline tree-table**: Confining tree nesting within a single table makes horizontal scrolling and row controls chaotic.

## Consequences
- Requires a new `folders` schema table and nullable `folderId` column on `projects` with backward-compatible grandfathering (`folderId: null` represents Uncategorized).
- Local JSON database adapter `.data/db.json` must be updated to persist and query `folders`.
- Table view gains predictable sub-millisecond rendering by replacing dynamic iframe popovers with pure static 16:9 thumbnail covers.

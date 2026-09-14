import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc, asc, and, or, isNull, sql } from "drizzle-orm";
import { calculateTrendingScore } from "@/lib/scoring";
import * as schema from "./schema";
import type {
  Project,
  NewProject,
  ApiToken,
  NewApiToken,
  Order,
  NewOrder,
  UserSubscription,
  NewUserSubscription,
  Notification,
  NewNotification,
} from "./schema";

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Local JSON store fallback for zero-config local dev and serverless environments
function resolveLocalDbFile(): string {
  const localDir = path.join(process.cwd(), ".data");
  const localFile = path.join(localDir, "db.json");

  // If local .data is writable or already has db.json, use it
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return localFile;
  } catch {
    // In serverless environments (Vercel Lambda) process.cwd() is read-only.
    // Fall back to os.tmpdir() where writable storage is guaranteed.
    const tmpDir = path.join(os.tmpdir(), "html-manager-data");
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {
      // ignore
    }
    return path.join(tmpDir, "db.json");
  }
}

interface LocalData {
  projects: Project[];
  settings: Record<string, string>;
  apiTokens?: ApiToken[];
  orders?: Order[];
  userSubscriptions?: UserSubscription[];
  notifications?: Notification[];
}

function readLocalData(): LocalData {
  try {
    const dbFile = resolveLocalDbFile();
    const dbDir = path.dirname(dbFile);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(dbFile)) {
      const initial: LocalData = {
        projects: [],
        settings: {},
        apiTokens: [],
        orders: [],
        userSubscriptions: [],
      };
      try {
        fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2), "utf-8");
      } catch {
        // read-only ignore
      }
      return initial;
    }
    const raw = fs.readFileSync(dbFile, "utf-8");
    const data = JSON.parse(raw) as LocalData;
    data.projects = (data.projects || []).map((p) => ({
      ...p,
      isPinned: p.isPinned ?? false,
      pinnedAt: p.pinnedAt ? new Date(p.pinnedAt) : null,
      isGlobalPinned: p.isGlobalPinned ?? (p.isPinned ?? false),
      globalPinnedAt: p.globalPinnedAt ? new Date(p.globalPinnedAt) : (p.isPinned ? new Date(p.createdAt) : null),
      language: p.language ?? "zh",
      isWhiteLabel: p.isWhiteLabel ?? false,
      customSubdomain: p.customSubdomain ?? null,
      visibility: (p.visibility as string) === "unlisted" ? "private" : p.visibility,
      reviewStatus: p.reviewStatus ?? "approved",
      moderationCategory: p.moderationCategory ?? null,
      moderationSummary: p.moderationSummary ?? null,
      screenshotUrl: p.screenshotUrl ?? null,
      keyMode: p.keyMode ?? "legacy-server",
      kdfSalt: p.kdfSalt ?? null,
      kdfIterations: p.kdfIterations ?? null,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    }));
    data.apiTokens = (data.apiTokens || []).map((t) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      lastUsedAt: t.lastUsedAt ? new Date(t.lastUsedAt) : null,
    }));
    data.orders = (data.orders || []).map((o) => ({
      ...o,
      createdAt: new Date(o.createdAt),
      updatedAt: new Date(o.updatedAt),
    }));
    data.userSubscriptions = (data.userSubscriptions || []).map((s) => ({
      ...s,
      updatedAt: new Date(s.updatedAt),
    }));
    data.notifications = (data.notifications || []).map((n) => ({
      ...n,
      createdAt: new Date(n.createdAt),
    }));
    return data;
  } catch (err) {
    console.error("Failed to read local data:", err);
    return { projects: [], settings: {}, apiTokens: [], orders: [], userSubscriptions: [], notifications: [] };
  }
}

function writeLocalData(data: LocalData) {
  try {
    const dbFile = resolveLocalDbFile();
    const dbDir = path.dirname(dbFile);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write local data:", err);
  }
}

let pgPool: Pool | null = null;
let pgDb: ReturnType<typeof drizzle> | null = null;
let tablesInitialized = false;

function getDatabase() {
  if (!dbUrl) return null;

  if (!pgDb) {
    pgPool = new Pool({
      connectionString: dbUrl,
      ssl: dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
      max: 10,
    });
    pgDb = drizzle(pgPool, { schema });
  }
  return pgDb;
}

const SQL_PROJECTS = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'tools',
    tags JSONB DEFAULT '[]',
    asset_type TEXT NOT NULL DEFAULT 'single_html',
    entry_path TEXT NOT NULL DEFAULT 'index.html',
    storage_type TEXT NOT NULL DEFAULT 'local',
    storage_prefix TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'public',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    pinned_at TIMESTAMPTZ,
    is_global_pinned BOOLEAN NOT NULL DEFAULT false,
    global_pinned_at TIMESTAMPTZ,
    language TEXT NOT NULL DEFAULT 'zh',
    is_white_label BOOLEAN NOT NULL DEFAULT false,
    custom_subdomain TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    screenshot_url TEXT,
    is_encrypted BOOLEAN NOT NULL DEFAULT false,
    encryption_iv TEXT,
    key_mode TEXT NOT NULL DEFAULT 'legacy-server',
    kdf_salt TEXT,
    kdf_iterations INTEGER,
    file_size INTEGER DEFAULT 0,
    plan_tier TEXT DEFAULT 'free',
    review_status TEXT NOT NULL DEFAULT 'approved',
    moderation_category TEXT,
    moderation_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

// Idempotent additive migrations for existing databases (ADD COLUMN IF NOT EXISTS)
const SQL_PROJECTS_MIGRATIONS = [
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS screenshot_url TEXT;`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_white_label BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS custom_subdomain TEXT;`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS key_mode TEXT NOT NULL DEFAULT 'legacy-server';`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS kdf_salt TEXT;`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS kdf_iterations INTEGER;`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS encryption_iv TEXT;`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0;`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free';`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_global_pinned BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS global_pinned_at TIMESTAMPTZ;`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'zh';`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved';`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS moderation_category TEXT;`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS moderation_summary TEXT;`,
  `CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects (user_id);`,
  `CREATE INDEX IF NOT EXISTS projects_global_pinned_idx ON projects (is_global_pinned, global_pinned_at);`,
  `CREATE INDEX IF NOT EXISTS projects_language_idx ON projects (language);`,
  `UPDATE projects SET is_global_pinned = true, global_pinned_at = created_at WHERE is_pinned = true AND is_global_pinned = false;`,
  `UPDATE projects SET visibility = 'private' WHERE visibility = 'unlisted';`,
  `UPDATE projects SET review_status = 'approved' WHERE (review_status = 'pending' OR review_status IS NULL) AND moderation_category IS NULL;`,
];

const SQL_SETTINGS = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const SQL_API_TOKENS = `
  CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    token_hint TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const SQL_ORDERS = `
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_email TEXT,
    plan_tier TEXT NOT NULL,
    amount TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'created',
    paypal_order_id TEXT NOT NULL UNIQUE,
    paypal_capture_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const SQL_USER_SUBSCRIPTIONS = `
  CREATE TABLE IF NOT EXISTS user_subscriptions (
    user_id TEXT PRIMARY KEY,
    plan_tier TEXT NOT NULL DEFAULT 'free',
    order_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const SQL_NOTIFICATIONS = `
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
`;

let legacyProjectsApproved = false;
let lastDbError: string | null = null;

export function getLastDbError(): string | null {
  return lastDbError;
}

export async function autoApproveLegacyProjects() {
  if (legacyProjectsApproved || !dbUrl) return;
  try {
    getDatabase();
    if (!pgPool) return;
    await withTableFallback(async () => {
      // Idempotent grandfathering guarded by withTableFallback.
      // Missing tables or columns (42P01 / 42703) will automatically trigger ensurePostgresTables() on-demand.
      await pgPool!.query(
        `UPDATE projects SET review_status = 'approved' WHERE (review_status = 'pending' OR review_status IS NULL) AND moderation_category IS NULL;`
      );
    });
    legacyProjectsApproved = true;
    console.log("[DB] Legacy projects grandfathered to approved status (0 proactive DDL).");
  } catch (err: any) {
    lastDbError = `autoApprove: ${err?.message || String(err)}`;
    console.warn("[DB] autoApproveLegacyProjects notice:", err);
  }
}

async function ensurePostgresTables() {
  if (tablesInitialized || !dbUrl) return;
  try {
    if (!pgPool) {
      pgPool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
      });
    }
    // Execute separately to prevent multi-statement transaction pooler/PgBouncer failures
    for (const sql of [
      SQL_PROJECTS,
      SQL_SETTINGS,
      SQL_API_TOKENS,
      SQL_ORDERS,
      SQL_USER_SUBSCRIPTIONS,
      SQL_NOTIFICATIONS,
      ...SQL_PROJECTS_MIGRATIONS,
    ]) {
      try {
        await pgPool.query(sql);
      } catch (tableErr) {
        console.warn("Table auto-migration notice for table:", tableErr);
      }
    }
    tablesInitialized = true;
  } catch (err) {
    console.warn("Table initialization pool connection notice:", err);
  }
}

async function withTableFallback<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const rawError = err as any;
    const error = (rawError?.cause || rawError) as { code?: string; message?: string };
    const fullMsg = [
      rawError?.message,
      rawError?.cause?.message,
      error?.message,
      String(err),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const code = error?.code || rawError?.code;
    if (
      error?.code === "42P01" ||
      code === "42P01" ||
      error?.code === "42703" ||
      code === "42703" ||
      error?.message?.includes("does not exist") ||
      fullMsg.includes("does not exist") ||
      fullMsg.includes("relation") ||
      fullMsg.includes("column") ||
      fullMsg.includes("failed query")
    ) {
      tablesInitialized = false;
      await ensurePostgresTables();
      return await fn();
    }
    throw err;
  }
}

export type ProjectSortOption = "trending" | "newest" | "views" | "alpha";

export async function getAllProjects(options?: {
  userId?: string;
  isWorkspace?: boolean;
  includePrivate?: boolean;
  allowAllReviewStatuses?: boolean;
  reviewStatus?: string;
  category?: string;
  language?: string;
  tag?: string;
  search?: string;
  sortBy?: ProjectSortOption;
}): Promise<Project[]> {
  await autoApproveLegacyProjects();
  const db = getDatabase();
  let list: Project[] = [];
  let isFilteredInSql = false;

  const isPublicMode = !options?.isWorkspace && !options?.userId;
  const sortBy: ProjectSortOption = options?.sortBy || (isPublicMode ? "trending" : "newest");

  if (db) {
    try {
      list = await withTableFallback(async () => {
        const conditions = [];

        if (options?.userId) {
          conditions.push(eq(schema.projects.userId, options.userId));
        } else if (!options?.includePrivate) {
          conditions.push(eq(schema.projects.visibility, "public"));
          if (!options?.reviewStatus && !options?.allowAllReviewStatuses) {
            conditions.push(
              or(
                eq(schema.projects.reviewStatus, "approved"),
                isNull(schema.projects.reviewStatus)
              )
            );
          }
        }

        if (options?.reviewStatus) {
          conditions.push(eq(schema.projects.reviewStatus, options.reviewStatus));
        }

        if (options?.category && options.category !== "all") {
          conditions.push(eq(schema.projects.category, options.category));
        }

        if (options?.language && options.language !== "all") {
          conditions.push(eq(schema.projects.language, options.language));
        }

        const baseQuery = db.select().from(schema.projects);
        const queryWithWhere = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

        if (isPublicMode) {
          if (sortBy === "trending") {
            return await queryWithWhere.orderBy(
              desc(schema.projects.isGlobalPinned),
              desc(schema.projects.globalPinnedAt),
              sql`(${schema.projects.viewCount} + 1.0) / POWER(GREATEST(0.1, (EXTRACT(EPOCH FROM (NOW() - ${schema.projects.createdAt})) / 3600.0) + 2.0), 1.5) DESC`,
              desc(schema.projects.createdAt)
            );
          } else if (sortBy === "views") {
            return await queryWithWhere.orderBy(
              desc(schema.projects.isGlobalPinned),
              desc(schema.projects.globalPinnedAt),
              desc(schema.projects.viewCount),
              desc(schema.projects.createdAt)
            );
          } else if (sortBy === "alpha") {
            return await queryWithWhere.orderBy(
              desc(schema.projects.isGlobalPinned),
              desc(schema.projects.globalPinnedAt),
              asc(schema.projects.title),
              desc(schema.projects.createdAt)
            );
          } else {
            return await queryWithWhere.orderBy(
              desc(schema.projects.isGlobalPinned),
              desc(schema.projects.globalPinnedAt),
              desc(schema.projects.createdAt)
            );
          }
        } else {
          if (sortBy === "views") {
            return await queryWithWhere.orderBy(
              desc(schema.projects.isPinned),
              desc(schema.projects.pinnedAt),
              desc(schema.projects.viewCount),
              desc(schema.projects.createdAt)
            );
          } else if (sortBy === "alpha") {
            return await queryWithWhere.orderBy(
              desc(schema.projects.isPinned),
              desc(schema.projects.pinnedAt),
              asc(schema.projects.title),
              desc(schema.projects.createdAt)
            );
          } else {
            return await queryWithWhere.orderBy(
              desc(schema.projects.isPinned),
              desc(schema.projects.pinnedAt),
              desc(schema.projects.createdAt)
            );
          }
        }
      });
      isFilteredInSql = true;
    } catch (err: any) {
      lastDbError = `getAllProjects: ${err?.message || String(err)}`;
      console.error("Database query failed, falling back to local data:", err);
      const local = readLocalData();
      list = [...local.projects];
    }
  } else {
    const local = readLocalData();
    list = [...local.projects];
  }

  // Filter and sort in memory if SQL pushdown was not executed (fallback or local mode)
  if (!isFilteredInSql) {
    if (options?.userId) {
      list = list.filter((p) => p.userId === options.userId);
    } else if (!options?.includePrivate) {
      list = list.filter((p) => {
        const isPublic = p.visibility === "public";
        if (!isPublic) return false;
        if (options?.reviewStatus) return p.reviewStatus === options.reviewStatus;
        if (options?.allowAllReviewStatuses) return true;
        return p.reviewStatus === "approved" || !p.reviewStatus;
      });
    }

    if (options?.reviewStatus) {
      list = list.filter((p) => p.reviewStatus === options.reviewStatus);
    }

    if (options?.category && options.category !== "all") {
      list = list.filter((p) => p.category === options.category);
    }

    if (options?.language && options.language !== "all") {
      list = list.filter((p) => (p.language || "zh") === options.language);
    }

    const now = Date.now();

    list.sort((a, b) => {
      if (isPublicMode) {
        if (a.isGlobalPinned !== b.isGlobalPinned) return a.isGlobalPinned ? -1 : 1;
        if (a.isGlobalPinned && b.isGlobalPinned) {
          const aTime = a.globalPinnedAt ? a.globalPinnedAt.getTime() : a.createdAt.getTime();
          const bTime = b.globalPinnedAt ? b.globalPinnedAt.getTime() : b.createdAt.getTime();
          return bTime - aTime;
        }
      } else {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        if (a.isPinned && b.isPinned) {
          const aTime = a.pinnedAt ? a.pinnedAt.getTime() : a.createdAt.getTime();
          const bTime = b.pinnedAt ? b.pinnedAt.getTime() : b.createdAt.getTime();
          return bTime - aTime;
        }
      }

      if (sortBy === "trending") {
        return calculateTrendingScore(b.viewCount, b.createdAt, now) - calculateTrendingScore(a.viewCount, a.createdAt, now);
      }
      if (sortBy === "views") {
        return (b.viewCount || 0) - (a.viewCount || 0);
      }
      if (sortBy === "alpha") {
        return a.title.localeCompare(b.title);
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  if (options?.tag) {
    list = list.filter((p) => Array.isArray(p.tags) && p.tags.includes(options.tag!));
  }

  if (options?.search) {
    const q = options.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.slug.toLowerCase().includes(q) ||
        (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }

  return list;
}

export async function getUserProjectsCount(userId: string): Promise<number> {
  const projects = await getAllProjects({ userId, includePrivate: true });
  return projects.length;
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  await autoApproveLegacyProjects();
  const db = getDatabase();
  if (db) {
    try {
      const rows = await withTableFallback(() =>
        db.select().from(schema.projects).where(eq(schema.projects.slug, slug)).limit(1)
      );
      return rows[0] || null;
    } catch (err) {
      console.error("getProjectBySlug DB query error:", err);
      const local = readLocalData();
      return local.projects.find((p) => p.slug === slug) || null;
    }
  } else {
    const local = readLocalData();
    return local.projects.find((p) => p.slug === slug) || null;
  }
}

export async function getProjectById(id: string): Promise<Project | null> {
  await autoApproveLegacyProjects();
  const db = getDatabase();
  if (db) {
    try {
      const rows = await withTableFallback(() =>
        db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1)
      );
      return rows[0] || null;
    } catch (err) {
      console.error("getProjectById DB query error:", err);
      const local = readLocalData();
      return local.projects.find((p) => p.id === id) || null;
    }
  } else {
    const local = readLocalData();
    return local.projects.find((p) => p.id === id) || null;
  }
}

export async function createProject(data: NewProject): Promise<Project> {
  await autoApproveLegacyProjects();
  const db = getDatabase();
  const now = new Date();
  const newRecord: Project = {
    id: data.id,
    userId: data.userId ?? null,
    title: data.title,
    slug: data.slug,
    description: data.description ?? "",
    category: data.category ?? "tools",
    tags: (data.tags as string[]) ?? [],
    assetType: data.assetType ?? "single_html",
    entryPath: data.entryPath ?? "index.html",
    storageType: data.storageType ?? "local",
    storagePrefix: data.storagePrefix,
    visibility: data.visibility ?? "public",
    isPinned: data.isPinned ?? false,
    pinnedAt: data.pinnedAt ?? (data.isPinned ? now : null),
    isGlobalPinned: data.isGlobalPinned ?? false,
    globalPinnedAt: data.globalPinnedAt ?? (data.isGlobalPinned ? now : null),
    language: data.language ?? "zh",
    isWhiteLabel: data.isWhiteLabel ?? false,
    customSubdomain: data.customSubdomain ?? null,
    viewCount: data.viewCount ?? 0,
    screenshotUrl: data.screenshotUrl ?? null,
    isEncrypted: data.isEncrypted ?? false,
    encryptionIv: data.encryptionIv ?? null,
    keyMode: data.keyMode ?? "legacy-server",
    kdfSalt: data.kdfSalt ?? null,
    kdfIterations: data.kdfIterations ?? null,
    fileSize: data.fileSize ?? 0,
    planTier: data.planTier ?? "free",
    reviewStatus: data.reviewStatus ?? "approved",
    moderationCategory: data.moderationCategory ?? null,
    moderationSummary: data.moderationSummary ?? null,
    createdAt: now,
    updatedAt: now,
  };

  if (db) {
    try {
      const inserted = await withTableFallback(() =>
        db.insert(schema.projects).values(newRecord).returning()
      );
      return inserted[0];
    } catch (err) {
      console.error("createProject DB insert error, saving to local fallback:", err);
      const local = readLocalData();
      local.projects.push(newRecord);
      writeLocalData(local);
      return newRecord;
    }
  } else {
    const local = readLocalData();
    local.projects.push(newRecord);
    writeLocalData(local);
    return newRecord;
  }
}

export async function updateProject(id: string, updates: Partial<NewProject>): Promise<Project | null> {
  const db = getDatabase();
  const now = new Date();
  const patch: Partial<NewProject> = { ...updates };
  if (updates.isPinned !== undefined && updates.pinnedAt === undefined) {
    patch.pinnedAt = updates.isPinned ? now : null;
  }
  if (updates.isGlobalPinned !== undefined && updates.globalPinnedAt === undefined) {
    patch.globalPinnedAt = updates.isGlobalPinned ? now : null;
  }

  if (db) {
    try {
      const updated = await withTableFallback(() =>
        db
          .update(schema.projects)
          .set({ ...patch, updatedAt: now })
          .where(eq(schema.projects.id, id))
          .returning()
      );
      return updated[0] || null;
    } catch (err) {
      console.error("updateProject DB query error:", err);
      return null;
    }
  } else {
    const local = readLocalData();
    const index = local.projects.findIndex((p) => p.id === id);
    if (index === -1) return null;
    const existing = local.projects[index];
    const updatedRecord: Project = {
      ...existing,
      ...patch,
      tags: patch.tags ? (patch.tags as string[]) : existing.tags,
      updatedAt: now,
    };
    local.projects[index] = updatedRecord;
    writeLocalData(local);
    return updatedRecord;
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  const db = getDatabase();
  if (db) {
    try {
      await withTableFallback(() =>
        db.delete(schema.projects).where(eq(schema.projects.id, id))
      );
      return true;
    } catch (err) {
      console.error("deleteProject DB error:", err);
      return false;
    }
  } else {
    const local = readLocalData();
    const originalLength = local.projects.length;
    local.projects = local.projects.filter((p) => p.id !== id);
    writeLocalData(local);
    return local.projects.length < originalLength;
  }
}

export async function incrementViewCount(slug: string): Promise<void> {
  const db = getDatabase();
  if (db) {
    try {
      // Atomic single-statement increment: avoids the read-modify-write race
      await withTableFallback(() =>
        db
          .update(schema.projects)
          .set({ viewCount: sql`${schema.projects.viewCount} + 1` })
          .where(eq(schema.projects.slug, slug))
      );
    } catch {
      // non-critical
    }
  } else {
    const local = readLocalData();
    const proj = local.projects.find((p) => p.slug === slug);
    if (proj) {
      proj.viewCount = (proj.viewCount || 0) + 1;
      writeLocalData(local);
    }
  }
}

export async function getSetting(key: string, defaultValue = ""): Promise<string> {
  const db = getDatabase();
  if (db) {
    try {
      const rows = await withTableFallback(() =>
        db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1)
      );
      return rows[0]?.value ?? defaultValue;
    } catch {
      return defaultValue;
    }
  } else {
    const local = readLocalData();
    return local.settings[key] ?? defaultValue;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  if (db) {
    try {
      await withTableFallback(() =>
        db
          .insert(schema.settings)
          .values({ key, value, updatedAt: now })
          .onConflictDoUpdate({
            target: schema.settings.key,
            set: { value, updatedAt: now },
          })
      );
    } catch (err) {
      console.error("setSetting DB error:", err);
    }
  } else {
    const local = readLocalData();
    local.settings[key] = value;
    writeLocalData(local);
  }
}

// ----------------------------------------------------
// Personal Access Token (API Keys) Operations
// ----------------------------------------------------

export async function createApiTokenRecord(token: NewApiToken): Promise<ApiToken> {
  const db = getDatabase();
  if (db) {
    try {
      const rows = await withTableFallback(() =>
        db.insert(schema.apiTokens).values(token).returning()
      );
      return rows[0];
    } catch (err) {
      console.error("createApiTokenRecord DB error, falling back to local storage:", err);
      const local = readLocalData();
      if (!local.apiTokens) local.apiTokens = [];
      const record: ApiToken = {
        ...token,
        createdAt: new Date(),
        lastUsedAt: null,
      };
      local.apiTokens.push(record);
      writeLocalData(local);
      return record;
    }
  } else {
    const local = readLocalData();
    if (!local.apiTokens) local.apiTokens = [];
    const record: ApiToken = {
      ...token,
      createdAt: new Date(),
      lastUsedAt: null,
    };
    local.apiTokens.push(record);
    writeLocalData(local);
    return record;
  }
}

export async function getApiTokensByUserId(userId: string): Promise<ApiToken[]> {
  const db = getDatabase();
  if (db) {
    try {
      return await withTableFallback(() =>
        db
          .select()
          .from(schema.apiTokens)
          .where(eq(schema.apiTokens.userId, userId))
          .orderBy(desc(schema.apiTokens.createdAt))
      );
    } catch (err) {
      console.error("getApiTokensByUserId DB error, falling back to local data:", err);
      const local = readLocalData();
      return (local.apiTokens || [])
        .filter((t) => t.userId === userId || userId === "selfhost-admin")
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  } else {
    const local = readLocalData();
    return (local.apiTokens || [])
      .filter((t) => t.userId === userId || userId === "selfhost-admin")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export async function findApiTokenByHash(tokenHash: string): Promise<ApiToken | null> {
  const db = getDatabase();
  if (db) {
    try {
      const rows = await withTableFallback(() =>
        db
          .select()
          .from(schema.apiTokens)
          .where(eq(schema.apiTokens.tokenHash, tokenHash))
          .limit(1)
      );
      return rows[0] || null;
    } catch (err) {
      console.error("findApiTokenByHash DB error, falling back to local data:", err);
      const local = readLocalData();
      return (local.apiTokens || []).find((t) => t.tokenHash === tokenHash) || null;
    }
  } else {
    const local = readLocalData();
    return (local.apiTokens || []).find((t) => t.tokenHash === tokenHash) || null;
  }
}

export async function touchApiTokenLastUsed(id: string): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  if (db) {
    try {
      await withTableFallback(() =>
        db
          .update(schema.apiTokens)
          .set({ lastUsedAt: now })
          .where(eq(schema.apiTokens.id, id))
      );
    } catch (err) {
      console.error("touchApiTokenLastUsed DB error, fallback to local:", err);
      const local = readLocalData();
      const token = (local.apiTokens || []).find((t) => t.id === id);
      if (token) {
        token.lastUsedAt = now;
        writeLocalData(local);
      }
    }
  } else {
    const local = readLocalData();
    const token = (local.apiTokens || []).find((t) => t.id === id);
    if (token) {
      token.lastUsedAt = now;
      writeLocalData(local);
    }
  }
}

export async function deleteApiTokenById(id: string, userId: string): Promise<boolean> {
  const db = getDatabase();
  const isSuperAdmin = userId === "selfhost-admin";
  if (db) {
    try {
      await withTableFallback(() => {
        const condition = isSuperAdmin
          ? eq(schema.apiTokens.id, id)
          : and(eq(schema.apiTokens.id, id), eq(schema.apiTokens.userId, userId));
        return db.delete(schema.apiTokens).where(condition);
      });
      return true;
    } catch (err) {
      console.error("deleteApiTokenById DB error, falling back to local data:", err);
      const local = readLocalData();
      const beforeLen = (local.apiTokens || []).length;
      local.apiTokens = (local.apiTokens || []).filter(
        (t) => !(t.id === id && (t.userId === userId || isSuperAdmin))
      );
      writeLocalData(local);
      return (local.apiTokens || []).length < beforeLen;
    }
  } else {
    const local = readLocalData();
    const beforeLen = (local.apiTokens || []).length;
    local.apiTokens = (local.apiTokens || []).filter(
      (t) => !(t.id === id && (t.userId === userId || isSuperAdmin))
    );
    writeLocalData(local);
    return (local.apiTokens || []).length < beforeLen;
  }
}

// ----------------------------------------------------
// Orders & User Subscriptions Operations (PayPal)
// ----------------------------------------------------

export async function createOrderRecord(data: NewOrder): Promise<Order> {
  const db = getDatabase();
  const now = new Date();
  const existing = await getOrderByPayPalId(data.paypalOrderId);
  if (existing) {
    return existing;
  }

  const newRecord: Order = {
    id: data.id,
    userId: data.userId,
    userEmail: data.userEmail ?? null,
    planTier: data.planTier,
    amount: data.amount,
    currency: data.currency ?? "USD",
    status: data.status ?? "created",
    paypalOrderId: data.paypalOrderId,
    paypalCaptureId: data.paypalCaptureId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  if (db) {
    try {
      const rows = await withTableFallback(() =>
        db.insert(schema.orders).values(newRecord).returning()
      );
      return rows[0];
    } catch (err) {
      console.error("createOrderRecord DB error, fallback to local:", err);
      const local = readLocalData();
      if (!local.orders) local.orders = [];
      local.orders.push(newRecord);
      writeLocalData(local);
      return newRecord;
    }
  } else {
    const local = readLocalData();
    if (!local.orders) local.orders = [];
    local.orders.push(newRecord);
    writeLocalData(local);
    return newRecord;
  }
}

export async function getOrderByPayPalId(paypalOrderId: string): Promise<Order | null> {
  const db = getDatabase();
  if (db) {
    try {
      const rows = await withTableFallback(() =>
        db
          .select()
          .from(schema.orders)
          .where(eq(schema.orders.paypalOrderId, paypalOrderId))
          .limit(1)
      );
      return rows[0] || null;
    } catch (err) {
      console.error("getOrderByPayPalId DB error, fallback to local:", err);
      const local = readLocalData();
      return (local.orders || []).find((o) => o.paypalOrderId === paypalOrderId) || null;
    }
  } else {
    const local = readLocalData();
    return (local.orders || []).find((o) => o.paypalOrderId === paypalOrderId) || null;
  }
}

export async function completeOrderRecord(
  paypalOrderId: string,
  paypalCaptureId: string
): Promise<Order | null> {
  const db = getDatabase();
  const now = new Date();

  if (db) {
    try {
      const updated = await withTableFallback(() =>
        db
          .update(schema.orders)
          .set({
            status: "completed",
            paypalCaptureId,
            updatedAt: now,
          })
          .where(eq(schema.orders.paypalOrderId, paypalOrderId))
          .returning()
      );
      if (updated[0]) {
        await setUserPlanTier(
          updated[0].userId,
          updated[0].planTier as "lite" | "pro",
          updated[0].id
        );
        return updated[0];
      }
      return null;
    } catch (err) {
      console.error("completeOrderRecord DB error, fallback to local:", err);
    }
  }

  const local = readLocalData();
  if (!local.orders) local.orders = [];
  const target = local.orders.find((o) => o.paypalOrderId === paypalOrderId);
  if (!target) return null;

  target.status = "completed";
  target.paypalCaptureId = paypalCaptureId;
  target.updatedAt = now;
  writeLocalData(local);

  await setUserPlanTier(target.userId, target.planTier as "lite" | "pro", target.id);
  return target;
}

export async function getUserPlanTier(userId: string): Promise<"free" | "lite" | "pro"> {
  const db = getDatabase();
  if (db) {
    try {
      const rows = await withTableFallback(() =>
        db
          .select()
          .from(schema.userSubscriptions)
          .where(eq(schema.userSubscriptions.userId, userId))
          .limit(1)
      );
      if (rows[0]?.planTier) {
        return rows[0].planTier as "free" | "lite" | "pro";
      }
    } catch (err) {
      console.error("getUserPlanTier DB error, fallback to local:", err);
    }
  }

  const local = readLocalData();
  const sub = (local.userSubscriptions || []).find((s) => s.userId === userId);
  if (sub?.planTier) {
    return sub.planTier as "free" | "lite" | "pro";
  }

  return "free";
}

export async function setUserPlanTier(
  userId: string,
  planTier: "free" | "lite" | "pro",
  orderId?: string
): Promise<void> {
  const db = getDatabase();
  const now = new Date();

  if (db) {
    try {
      await withTableFallback(() =>
        db
          .insert(schema.userSubscriptions)
          .values({
            userId,
            planTier,
            orderId: orderId || null,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: schema.userSubscriptions.userId,
            set: {
              planTier,
              orderId: orderId || null,
              updatedAt: now,
            },
          })
      );
      return;
    } catch (err) {
      console.error("setUserPlanTier DB error, fallback to local:", err);
    }
  }

  const local = readLocalData();
  if (!local.userSubscriptions) local.userSubscriptions = [];
  const idx = local.userSubscriptions.findIndex((s) => s.userId === userId);
  if (idx !== -1) {
    local.userSubscriptions[idx] = {
      userId,
      planTier,
      orderId: orderId || null,
      updatedAt: now,
    };
  } else {
    local.userSubscriptions.push({
      userId,
      planTier,
      orderId: orderId || null,
      updatedAt: now,
    });
  }
  writeLocalData(local);
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const db = getDatabase();
  if (db) {
    try {
      return await withTableFallback(() =>
        db
          .select()
          .from(schema.orders)
          .where(eq(schema.orders.userId, userId))
          .orderBy(desc(schema.orders.createdAt))
      );
    } catch (err) {
      console.error("getUserOrders DB error, fallback to local:", err);
    }
  }

  const local = readLocalData();
  return (local.orders || [])
    .filter((o) => o.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function createNotification(data: NewNotification): Promise<Notification> {
  const db = getDatabase();
  const now = new Date();
  const newRecord: Notification = {
    id: data.id,
    userId: data.userId,
    projectId: data.projectId ?? null,
    type: data.type,
    title: data.title,
    message: data.message,
    isRead: data.isRead ?? false,
    createdAt: now,
  };

  if (db) {
    try {
      const inserted = await withTableFallback(() =>
        db.insert(schema.notifications).values(newRecord).returning()
      );
      return inserted[0];
    } catch (err) {
      console.error("createNotification DB insert error, saving to local fallback:", err);
    }
  }

  const local = readLocalData();
  if (!local.notifications) local.notifications = [];
  const existingIdx = local.notifications.findIndex((n) => n.id === newRecord.id);
  if (existingIdx !== -1) {
    local.notifications[existingIdx] = newRecord;
  } else {
    local.notifications.push(newRecord);
  }
  writeLocalData(local);
  return newRecord;
}

export async function getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
  const db = getDatabase();
  if (db) {
    try {
      return await withTableFallback(() =>
        db
          .select()
          .from(schema.notifications)
          .where(eq(schema.notifications.userId, userId))
          .orderBy(desc(schema.notifications.createdAt))
          .limit(limit)
      );
    } catch (err) {
      console.error("getUserNotifications DB error, fallback to local:", err);
    }
  }

  const local = readLocalData();
  return (local.notifications || [])
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const db = getDatabase();
  if (db) {
    try {
      const result = await withTableFallback(() =>
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.notifications)
          .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.isRead, false)))
      );
      return Number(result[0]?.count || 0);
    } catch (err) {
      console.error("getUnreadNotificationsCount DB error, fallback to local:", err);
    }
  }

  const local = readLocalData();
  return (local.notifications || []).filter((n) => n.userId === userId && !n.isRead).length;
}

export async function markNotificationAsRead(id: string, userId: string): Promise<void> {
  const db = getDatabase();
  if (db) {
    try {
      await withTableFallback(() =>
        db
          .update(schema.notifications)
          .set({ isRead: true })
          .where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, userId)))
      );
      return;
    } catch (err) {
      console.error("markNotificationAsRead DB error, fallback to local:", err);
    }
  }

  const local = readLocalData();
  if (!local.notifications) return;
  const idx = local.notifications.findIndex((n) => n.id === id && n.userId === userId);
  if (idx !== -1) {
    local.notifications[idx].isRead = true;
    writeLocalData(local);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const db = getDatabase();
  if (db) {
    try {
      await withTableFallback(() =>
        db
          .update(schema.notifications)
          .set({ isRead: true })
          .where(eq(schema.notifications.userId, userId))
      );
      return;
    } catch (err) {
      console.error("markAllNotificationsAsRead DB error, fallback to local:", err);
    }
  }

  const local = readLocalData();
  if (!local.notifications) return;
  local.notifications.forEach((n) => {
    if (n.userId === userId) n.isRead = true;
  });
  writeLocalData(local);
}


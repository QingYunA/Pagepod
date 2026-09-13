import { pgTable, text, boolean, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"), // Optional Supabase Auth user ID (for multi-tenant cloud mode)
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").default(""),
    category: text("category").notNull().default("tools"),
    tags: jsonb("tags").$type<string[]>().default([]),
    assetType: text("asset_type").notNull().default("single_html"), // 'single_html' | 'zip_bundle'
    entryPath: text("entry_path").notNull().default("index.html"),
    storageType: text("storage_type").notNull().default("local"), // 'vercel-blob' | 'cloudflare-r2' | 'local' | 'supabase'
    storagePrefix: text("storage_prefix").notNull(),
    visibility: text("visibility").notNull().default("public"), // 'public' | 'unlisted' | 'private'
    isPinned: boolean("is_pinned").notNull().default(false),
    viewCount: integer("view_count").notNull().default(0),
    screenshotUrl: text("screenshot_url"),

    // End-to-End Encryption fields (zero-knowledge)
    isEncrypted: boolean("is_encrypted").notNull().default(false),
    encryptionIv: text("encryption_iv"), // Base64url 12-byte IV for AES-GCM (public)
    keyMode: text("key_mode").notNull().default("legacy-server"), // 'legacy-server' | 'zk-passphrase' | 'zk-recovery'
    kdfSalt: text("kdf_salt"), // Base64url PBKDF2 salt (public, only for zk-passphrase)
    kdfIterations: integer("kdf_iterations"), // PBKDF2 iteration count (public, only for zk-passphrase)
    fileSize: integer("file_size").default(0), // Bytes (for quota tracking)
    planTier: text("plan_tier").default("free"), // 'free' | 'pro'

    // Content moderation fields
    reviewStatus: text("review_status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected' | 'flagged'
    moderationCategory: text("moderation_category"),
    moderationSummary: text("moderation_summary"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("projects_user_id_idx").on(table.userId),
  ]
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiTokens = pgTable("api_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(), // Exact owner (Supabase user id or 'selfhost-admin')
  name: text("name").notNull(), // Descriptive label (e.g. 'Cursor Uploader', 'Python Sync')
  tokenHash: text("token_hash").notNull().unique(), // SHA-256 hashed secret
  tokenHint: text("token_hint").notNull(), // Last 4 chars (e.g. '8f2a')
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  userEmail: text("user_email"),
  planTier: text("plan_tier").notNull(), // 'lite' | 'pro'
  amount: text("amount").notNull(), // '4.90' | '9.90'
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("created"), // 'created' | 'completed' | 'failed'
  paypalOrderId: text("paypal_order_id").notNull().unique(),
  paypalCaptureId: text("paypal_capture_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  userId: text("user_id").primaryKey(),
  planTier: text("plan_tier").notNull().default("free"), // 'free' | 'lite' | 'pro'
  orderId: text("order_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    projectId: text("project_id"),
    type: text("type").notNull(), // 'moderation_downgrade' | 'moderation_rejected' | 'system'
    title: text("title").notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
  ]
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ApiToken = typeof apiTokens.$inferSelect;
export type NewApiToken = typeof apiTokens.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

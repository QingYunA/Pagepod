import { z } from "zod";

export const VISIBILITY_ENUM = ["public", "unlisted", "private"] as const;
export type Visibility = (typeof VISIBILITY_ENUM)[number];

export const visibilitySchema = z.enum(VISIBILITY_ENUM);

export const slugSchema = z
  .string()
  .trim()
  .max(100)
  .regex(/^[a-zA-Z0-9_-]*$/, "Slug may only contain letters, numbers, underscores, and dashes")
  .optional();

export const LANGUAGE_ENUM = ["zh", "en", "other"] as const;
export type Language = (typeof LANGUAGE_ENUM)[number];
export const languageSchema = z.enum(LANGUAGE_ENUM);

export const CATEGORIES_ENUM = [
  "tools",
  "games",
  "visualization",
  "prototypes",
  "animations",
  "ai",
  "creative",
  "others",
] as const;
export type Category = (typeof CATEGORIES_ENUM)[number];

export const categorySchema = z.enum(CATEGORIES_ENUM).default("tools");

export const tagsSchema = z
  .union([
    z.array(z.string()),
    z.string().transform((str) =>
      str
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean)
    ),
  ])
  .default([]);

export const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "api",
  "auth",
  "app",
  "preview",
  "mail",
  "cdn",
  "status",
  "static",
  "assets",
]);

export const SYSTEM_PATHS = new Set([
  "explore",
  "pricing",
  "about",
  "privacy",
  "terms",
  "workspace",
  "login",
  "admin",
  "api",
  "auth",
  "_next",
  "p",
  "raw",
]);

export const customSubdomainSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_-]{2,30}$/, "Subdomain must be 2-30 lowercase letters, numbers, or hyphens")
  .refine(
    (val) => !RESERVED_SUBDOMAINS.has(val.toLowerCase()) && !SYSTEM_PATHS.has(val.toLowerCase()),
    "Subdomain is a reserved system name"
  )
  .optional()
  .nullable();

export const uploadPayloadSchema = z.object({
  title: z.string().trim().max(200).optional(),
  slug: slugSchema,
  description: z.string().trim().max(2000).optional(),
  category: categorySchema,
  language: languageSchema.optional(),
  tags: tagsSchema,
  visibility: visibilitySchema.default("public"),
  isPinned: z.boolean().default(false),
  isGlobalPinned: z.boolean().default(false),
  isWhiteLabel: z.boolean().default(false),
  customSubdomain: customSubdomainSchema,
  htmlContent: z.string().max(20_000_000, "HTML content too large (max 20MB)").optional(),
});

export const updateProjectInputSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(200),
  description: z.string().trim().max(2000).default(""),
  category: categorySchema,
  language: languageSchema.optional(),
  tags: z.array(z.string().trim().max(50)).default([]),
  visibility: visibilitySchema,
  isPinned: z.boolean().default(false),
  isGlobalPinned: z.boolean().optional(),
  isWhiteLabel: z.boolean().optional(),
  customSubdomain: customSubdomainSchema,
  htmlCode: z.string().max(20_000_000).optional(),
});

export const tokenNameSchema = z
  .string()
  .trim()
  .min(1, "Token name is required")
  .max(100, "Token name is too long");

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_HTML_PASTE_BYTES = 20 * 1024 * 1024; // 20MB
export const MAX_ZIP_EXTRACTED_BYTES = 100 * 1024 * 1024; // 100MB decompression limit
export const MAX_ZIP_ENTRIES = 500; // ZIP bomb protection

import { z } from "zod";

export const VISIBILITY_ENUM = ["public", "private"] as const;
export type Visibility = (typeof VISIBILITY_ENUM)[number];

export const visibilitySchema = z.enum(["public", "unlisted", "private"]).transform((val) => {
  return (val === "unlisted" ? "private" : val) as Visibility;
});

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

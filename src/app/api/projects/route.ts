import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllProjects, getLastDbError } from "@/db";

export async function GET(request: Request) {
  const user = await getCurrentUser(request);
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const search = searchParams.get("search") || undefined;
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  // If user is authenticated via Bearer token / session, return their projects (including private)
  // If not authenticated, return public projects only
  let projects = await getAllProjects({
    userId: user ? user.id : undefined,
    includePrivate: Boolean(user),
    category,
    tag,
    search,
  });

  if (Number.isFinite(limit) && limit > 0) {
    projects = projects.slice(0, limit);
  }

  return NextResponse.json({
    success: true,
    count: projects.length,
    projects: projects.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      category: p.category,
      tags: p.tags,
      visibility: p.visibility,
      isPinned: p.isPinned,
      screenshotUrl: p.screenshotUrl,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    debug: {
      dbConfigured: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
      dbError: getLastDbError(),
    },
  });
}

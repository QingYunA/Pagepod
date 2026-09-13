import { NextResponse } from "next/server";
import { getProjectBySlug, incrementViewCount } from "@/db";
import { getProjectStorage } from "@/lib/storage";
import { getCurrentUser, isExactProjectCreator } from "@/lib/auth";
import { verifySnapshotToken } from "@/lib/services/screenshot-service";
import { verifyProjectAccessToken } from "@/lib/services/guest-upload";

interface RouteParams {
  params: Promise<{
    slug: string;
    path?: string[];
  }>;
}

export async function GET(request: Request, context: RouteParams) {
  const { slug, path: subPaths } = await context.params;

  const project = await getProjectBySlug(slug);
  if (!project) {
    return new NextResponse("Project not found", { status: 404 });
  }

  // 1. Compliance Hard Gate:
  // If project is rejected by content moderation, immediately cutoff raw execution
  if (project.reviewStatus === "rejected") {
    return new NextResponse(
      "451 Unavailable For Legal Reasons: This project was removed due to content safety violations.",
      {
        status: 451,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  }

  // 2. Compute creator ownership once if access is restricted (pending review, private, or unlisted)
  const isPrivate = project.visibility === "private";
  const isUnlisted = project.visibility === "unlisted";
  const isPending = project.reviewStatus === "pending";

  let isExactCreator = false;
  if (isPrivate || isUnlisted || isPending) {
    const currentUser = await getCurrentUser();
    isExactCreator = isExactProjectCreator(currentUser, project);
  }

  // 3. Pending Moderation Gate:
  // While undergoing asynchronous review, authenticated creators OR authorized snapshot tokens can render the preview
  const url = new URL(request.url);
  const snapshotToken = url.searchParams.get("_snapshot_token");
  const isAuthorizedSnapshot = Boolean(snapshotToken && verifySnapshotToken(slug, snapshotToken));

  if (isPending && !isExactCreator && !isAuthorizedSnapshot) {
    return new NextResponse(
      "403 Forbidden: Content is currently undergoing safety and compliance review.",
      {
        status: 403,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  }

  // 4. Strict Privacy Enforcement:
  // If a project is private, ONLY the exact project creator can access raw endpoints.
  // Platform admins CANNOT inspect or access other users' private projects!
  if (isPrivate && !isExactCreator) {
    return new NextResponse("403 Forbidden: Private Resource. Only the project owner can access this content.", {
      status: 403,
    });
  }

  // 5. Unlisted Token Gate Enforcement:
  // If a project is unlisted, require valid ?token= or creator ownership
  if (isUnlisted && !isAuthorizedSnapshot) {
    const token = url.searchParams.get("token");
    const hasToken = verifyProjectAccessToken(project, token, isExactCreator);
    if (!hasToken) {
      return new NextResponse(
        "403 Forbidden: Protected Unlisted Project. A valid access token is required to view this resource.",
        {
          status: 403,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          },
        }
      );
    }
  }

  const subpath = subPaths && subPaths.length > 0 ? subPaths.join("/") : project.entryPath;
  const projectStorage = getProjectStorage(project.slug);
  let file: { data: Buffer | Uint8Array; contentType: string } | null = null;
  try {
    file = await projectStorage.readFile(subpath);
  } catch {
    return new NextResponse("Invalid resource path", { status: 400 });
  }

  if (!file) {
    return new NextResponse(`File not found: ${subpath}`, { status: 404 });
  }

  // Increment view count if accessing the entry HTML
  if (!subPaths || subPaths.length === 0 || subpath === project.entryPath) {
    incrementViewCount(slug).catch(() => {});
  }

  const headers = new Headers();
  headers.set("Content-Type", file.contentType);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  // Conditional requests / ETag for zero-bandwidth 304 Not Modified caching
  const isImageOrMedia = file.contentType.startsWith("image/") || file.contentType.startsWith("font/");
  const fileLen = Buffer.isBuffer(file.data) ? file.data.length : Buffer.byteLength(String(file.data));
  const updatedAtMs = new Date(project.updatedAt).getTime() || 0;
  const etag = `W/"${project.id}-${updatedAtMs}-${fileLen}"`;
  headers.set("ETag", etag);

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304, headers });
  }

  // Private or unlisted resources must never be cached by shared proxies/CDNs
  if (isPrivate || isUnlisted) {
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    headers.set("Vary", "Cookie, Authorization");
    headers.set("X-Robots-Tag", "noindex, nofollow");
  } else if (isImageOrMedia) {
    // Static media & screenshots: 1 day in browser, 30 days on CDN edge
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400");
  } else {
    // Dynamic HTML documents
    headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
  }

  // Mandatory hardened sandbox CSP for ALL active document types (HTML, SVG, XML)
  // Ensures arbitrary user-uploaded markup/scripts cannot access parent origin cookies, session, or localStorage
  const activeDocumentTypes = ["text/html", "image/svg+xml", "application/xml", "text/xml"];
  const isActiveDocument = activeDocumentTypes.some((t) => file.contentType.toLowerCase().includes(t));

  if (isActiveDocument) {
    headers.set(
      "Content-Security-Policy",
      "sandbox allow-scripts allow-forms allow-downloads allow-popups allow-modals; default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
    );
  }

  let responseBody: BodyInit = file.data as unknown as BodyInit;

  // In-memory localStorage/sessionStorage shim for sandboxed HTML documents.
  // Sandboxed iframes without allow-same-origin have an opaque 'null' origin,
  // causing browser window.localStorage access to throw SecurityError/DOMException.
  // This polyfill provides a safe, transparent in-memory storage so web apps function smoothly without throwing errors.
  if (file.contentType.toLowerCase().includes("text/html")) {
    const rawHtml = file.data.toString("utf-8");
    const storageShim = `<script>(function(){try{var t="__storage_test__";window.localStorage.setItem(t,t);window.localStorage.removeItem(t);}catch(e){var m={};function createStorage(){if(typeof Proxy!=="undefined"){return new Proxy({},{get:function(t,p){if(p==="getItem")return function(k){return m.hasOwnProperty(k)?m[k]:null;};if(p==="setItem")return function(k,v){m[k]=String(v);};if(p==="removeItem")return function(k){delete m[k];};if(p==="clear")return function(){m={};};if(p==="key")return function(i){return Object.keys(m)[i]||null;};if(p==="length")return Object.keys(m).length;return m.hasOwnProperty(p)?m[p]:undefined;},set:function(t,p,v){m[p]=String(v);return true;}});}var S=function(){this.getItem=function(k){return m.hasOwnProperty(k)?m[k]:null;};this.setItem=function(k,v){m[k]=String(v);};this.removeItem=function(k){delete m[k];};this.clear=function(){m={};};this.key=function(i){return Object.keys(m)[i]||null;};Object.defineProperty(this,"length",{get:function(){return Object.keys(m).length;}});};return new S();}try{Object.defineProperty(window,"localStorage",{value:createStorage(),writable:true,configurable:true});Object.defineProperty(window,"sessionStorage",{value:createStorage(),writable:true,configurable:true});}catch(err){}}})();</script>`;
    if (rawHtml.includes("<head>")) {
      responseBody = rawHtml.replace("<head>", `<head>${storageShim}`);
    } else if (rawHtml.includes("<HEAD>")) {
      responseBody = rawHtml.replace("<HEAD>", `<HEAD>${storageShim}`);
    } else {
      responseBody = storageShim + rawHtml;
    }
  }

  return new NextResponse(responseBody, {
    status: 200,
    headers,
  });
}

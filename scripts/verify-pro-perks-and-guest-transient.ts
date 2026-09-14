import { uploadPayloadSchema, updateProjectInputSchema } from "@/lib/validation";
import { updateProject, createProject, ProjectForbiddenError } from "@/lib/services/project-service";
import type { CurrentUser } from "@/lib/auth";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

console.log("\n=== 1. Pro Perks Schema Validation Tests ===");

// Default isWhiteLabel is false
const parsedDefault = uploadPayloadSchema.safeParse({
  title: "Test",
  slug: "test-slug",
});
assert(parsedDefault.success, "Upload payload parsing succeeds");
if (parsedDefault.success) {
  assert(parsedDefault.data.isWhiteLabel === false, "isWhiteLabel defaults to false");
  assert(parsedDefault.data.customSubdomain === undefined, "customSubdomain defaults to undefined");
}

// Valid custom subdomain
const parsedValidSub = updateProjectInputSchema.safeParse({
  title: "Test",
  visibility: "public",
  category: "tools",
  customSubdomain: "my-custom-app",
  isWhiteLabel: true,
});
assert(parsedValidSub.success, "Valid custom subdomain passes validation");
if (parsedValidSub.success) {
  assert(parsedValidSub.data.customSubdomain === "my-custom-app", "customSubdomain parsed accurately");
  assert(parsedValidSub.data.isWhiteLabel === true, "isWhiteLabel parsed accurately");
}

// Invalid custom subdomain (special characters or uppercase)
const parsedInvalidSub = updateProjectInputSchema.safeParse({
  title: "Test",
  visibility: "public",
  category: "tools",
  customSubdomain: "invalid.subdomain!",
});
assert(!parsedInvalidSub.success, "Invalid custom subdomain with dots/symbols is strictly rejected");

console.log("\n=== 2. Pro Perks RBAC Authorization at Seam ===");

const freeUser: CurrentUser = {
  id: "user-free-123",
  email: "free@example.com",
  role: "user",
  planTier: "free",
};

const proUser: CurrentUser = {
  id: "user-pro-456",
  email: "pro@example.com",
  role: "user",
  planTier: "pro",
};

// 1. Pro user workflow
const proProject = await createProject(proUser, {
  title: "Pro Project",
  slug: "pro-project-test-" + Date.now(),
  visibility: "public",
  htmlContent: "<h1>Hello Pro</h1>",
});

const testSubdomain = "pro-tool-" + Math.floor(Math.random() * 1000000);
const updatedPro = await updateProject(proUser, proProject.id, {
  isWhiteLabel: true,
  customSubdomain: testSubdomain,
});
assert(updatedPro.isWhiteLabel === true, "Pro user can successfully activate isWhiteLabel");
assert(updatedPro.customSubdomain === testSubdomain, "Pro user can successfully set customSubdomain");

// 2. Free user workflow (owns project, but lacks Pro tier)
const freeProject = await createProject(freeUser, {
  title: "Free Project",
  slug: "free-project-test-" + Date.now(),
  visibility: "public",
  htmlContent: "<h1>Hello Free</h1>",
});

let freeBlocked = false;
try {
  await updateProject(freeUser, freeProject.id, {
    isWhiteLabel: true,
  });
} catch (err: any) {
  if (err?.name === "ProjectForbiddenError" || err instanceof ProjectForbiddenError) {
    freeBlocked = true;
  }
}
assert(freeBlocked, "Free user is strictly blocked from activating isWhiteLabel (ProjectForbiddenError)");

let freeSubBlocked = false;
try {
  await updateProject(freeUser, freeProject.id, {
    customSubdomain: "free-sub",
  });
} catch (err: any) {
  if (err?.name === "ProjectForbiddenError" || err instanceof ProjectForbiddenError) {
    freeSubBlocked = true;
  }
}
assert(freeSubBlocked, "Free user is strictly blocked from setting customSubdomain (ProjectForbiddenError)");

let freeCreateWhiteLabelBlocked = false;
try {
  await createProject(freeUser, {
    title: "Free Exploit Project",
    slug: "free-exploit-wl-" + Date.now(),
    visibility: "public",
    isWhiteLabel: true,
    htmlContent: "<h1>Exploit</h1>",
  });
} catch (err: any) {
  if (err?.name === "ProjectForbiddenError" || err instanceof ProjectForbiddenError) {
    freeCreateWhiteLabelBlocked = true;
  }
}
assert(freeCreateWhiteLabelBlocked, "Free user is strictly blocked from creating project with isWhiteLabel (ProjectForbiddenError)");

let freeCreateSubBlocked = false;
try {
  await createProject(freeUser, {
    title: "Free Exploit Sub",
    slug: "free-exploit-sub-" + Date.now(),
    visibility: "public",
    customSubdomain: "exploit-sub",
    htmlContent: "<h1>Exploit</h1>",
  });
} catch (err: any) {
  if (err?.name === "ProjectForbiddenError" || err instanceof ProjectForbiddenError) {
    freeCreateSubBlocked = true;
  }
}
assert(freeCreateSubBlocked, "Free user is strictly blocked from creating project with customSubdomain (ProjectForbiddenError)");

console.log("\n=== 3. Custom Subdomain Routing & Uniqueness Tests ===");

import { getProjectBySlug, getAllProjects } from "@/db";
import { ProjectValidationError, isProActor } from "@/lib/services/project-service";
import { handleGuestUpload, claimGuestProjects } from "@/lib/services/guest-upload";
import { scanHtmlForSensitiveData } from "@/lib/scanner/sensitive-scanner";
import fs from "node:fs";
import path from "node:path";

// 1. Resolve project by custom subdomain via getProjectBySlug
const resolvedBySubdomain = await getProjectBySlug(testSubdomain);
assert(resolvedBySubdomain !== null, "getProjectBySlug resolves project via customSubdomain");
assert(resolvedBySubdomain?.id === proProject.id, "Resolved project matches proProject.id");

// 2. Reject duplicate custom subdomain
const proUser2: CurrentUser = {
  id: "user-pro-789",
  email: "pro2@example.com",
  role: "user",
  planTier: "pro",
};
let duplicateSubBlocked = false;
try {
  await createProject(proUser2, {
    title: "Pro 2 Project",
    slug: "pro-2-" + Date.now(),
    visibility: "public",
    customSubdomain: testSubdomain,
    htmlContent: "<h1>Collision</h1>",
  });
} catch (err: any) {
  if (err?.name === "ProjectValidationError" || err instanceof ProjectValidationError) {
    duplicateSubBlocked = true;
  }
}
assert(duplicateSubBlocked, "Duplicate custom subdomain is strictly rejected (already taken)");

// 3. Reject reserved system subdomain
let reservedSubBlocked = false;
try {
  await createProject(proUser2, {
    title: "Pro Reserved",
    slug: "pro-res-" + Date.now(),
    visibility: "public",
    customSubdomain: "admin",
    htmlContent: "<h1>Reserved</h1>",
  });
} catch (err: any) {
  if (err?.name === "ProjectValidationError" || err instanceof ProjectValidationError) {
    reservedSubBlocked = true;
  }
}
assert(reservedSubBlocked, "Reserved system subdomain ('admin') is strictly rejected");

console.log("\n=== 4. GuestTransient Domain Lifecycle Tests ===");

// 1. Guest upload creates isGuestTransient: true
const guestResult = await handleGuestUpload({
  htmlContent: "<h1>Guest App</h1>",
  clientIp: "127.0.0.1",
  title: "Guest Transient App",
  slug: "guest-transient-" + Date.now(),
});
assert(guestResult.success, "Guest upload succeeds");
const guestSlug = guestResult.slug!;
const guestClaimToken = guestResult.claimToken!;

const guestProject = await getProjectBySlug(guestSlug);
assert(guestProject !== null, "Guest project retrieved successfully");
assert(guestProject?.isGuestTransient === true, "Guest project is marked isGuestTransient === true");

// 2. Public showcase query strictly excludes GuestTransient project
const publicShowcase = await getAllProjects({ isWorkspace: false });
const foundInPublic = publicShowcase.some((p) => p.slug === guestSlug);
assert(!foundInPublic, "GuestTransient project is strictly excluded from public showcase feed");

// 3. Claiming guest project resets isGuestTransient to false
const claimResult = await claimGuestProjects(proUser, [{ slug: guestSlug, claimToken: guestClaimToken }]);
assert(claimResult.claimedCount === 1, "Guest project successfully claimed by authenticated user");

const claimedProject = await getProjectBySlug(guestSlug);
assert(claimedProject?.isGuestTransient === false, "Claimed project transitions to isGuestTransient === false");
assert(claimedProject?.userId === proUser.id, "Claimed project userId is updated to new owner");

// 4. Public showcase now includes claimed project
const publicShowcaseAfterClaim = await getAllProjects({ isWorkspace: false });
const foundAfterClaim = publicShowcaseAfterClaim.some((p) => p.slug === guestSlug);
assert(foundAfterClaim, "Claimed project is now visible in public showcase feed");

console.log("\n=== 5. Anti-Slop Copy & Ingestion Integrity Tests ===");

// 1. Verify editor-client.tsx complies with Anti-Slop (no "尊享")
const editorPath = path.resolve(process.cwd(), "src/app/workspace/projects/[id]/edit/editor-client.tsx");
const editorContent = fs.readFileSync(editorPath, "utf-8");
assert(!editorContent.includes("尊享"), "editor-client.tsx contains zero '尊享' anti-slop copy");
assert(editorContent.includes("Pro 权益定制 (Pro Perks)"), "editor-client.tsx uses compliant 'Pro 权益定制' title");

// 2. Verify isProActor helper function
assert(isProActor(proUser) === true, "isProActor returns true for Pro user");
assert(isProActor(freeUser) === false, "isProActor returns false for Free user");
assert(isProActor({ id: "admin-1", role: "admin" }) === true, "isProActor returns true for Admin");
assert(isProActor({ id: "selfhost-admin", role: "user" }) === true, "isProActor returns true for selfhost-admin");

// 3. Verify sensitive scanner heuristic for upload dialog
const cleanCode = "<html><body><h1>Clean portfolio</h1><p>No secrets here</p></body></html>";
const cleanScan = scanHtmlForSensitiveData(cleanCode);
assert(cleanScan.matches.length === 0, "Clean HTML produces 0 sensitive risk matches (no pop-up)");

const secretCode = "<html><body><script>const apiKey = 'sk-proj-abcdef1234567890123456789012345678901234';</script></body></html>";
const secretScan = scanHtmlForSensitiveData(secretCode);
assert(secretScan.matches.length > 0, "Leaked OpenAI secret produces > 0 matches (triggers modal)");

console.log("\n========================================");
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}

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

const updatedPro = await updateProject(proUser, proProject.id, {
  isWhiteLabel: true,
  customSubdomain: "my-pro-tool",
});
assert(updatedPro.isWhiteLabel === true, "Pro user can successfully activate isWhiteLabel");
assert(updatedPro.customSubdomain === "my-pro-tool", "Pro user can successfully set customSubdomain");

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

console.log("\n========================================");
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}

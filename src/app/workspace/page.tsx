import { getAllProjects } from "@/db";
import type { Project } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import AdminTable from "./admin-table";
import { HomeHeader } from "@/components/home-header";
import WorkspaceDashboardHeader, {
  WorkspaceApiTokenHeaderButton,
} from "./workspace-dashboard-header";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const currentUser = await getCurrentUser();

  // Strict Privacy Enforcement:
  // 1. If selfhost admin: can view all public projects and local projects.
  // 2. In Cloud mode:
  //    - If standard user: ONLY views projects belonging to their own userId.
  //    - If platform admin: ONLY permitted to manage and inspect PUBLIC projects. User-private projects are strictly hidden!
  let projects: Project[] = [];

  if (currentUser?.id === "selfhost-admin") {
    projects = await getAllProjects({ includePrivate: true });
  } else if (currentUser?.id) {
    if (currentUser.role === "admin") {
      // Platform admin also sees public items from everyone for moderation, but NEVER others' private items!
      const [myProjects, publicProjects] = await Promise.all([
        getAllProjects({ userId: currentUser.id }),
        getAllProjects({ includePrivate: false }),
      ]);
      const map = new Map<string, Project>();
      [...myProjects, ...publicProjects].forEach((p) => map.set(p.id, p));
      projects = Array.from(map.values());
    } else {
      // User sees their own projects (including their own private ones)
      projects = await getAllProjects({ userId: currentUser.id });
    }
  } else {
    projects = await getAllProjects({ includePrivate: false });
  }

  const totalViews = projects.reduce((sum, p) => sum + (p.viewCount || 0), 0);
  const publicCount = projects.filter((p) => p.visibility === "public").length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Universal Top Header */}
      <HomeHeader
        currentUser={currentUser}
        extraActions={<WorkspaceApiTokenHeaderButton />}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        <WorkspaceDashboardHeader
          currentUser={currentUser}
          projectCount={projects.length}
          publicCount={publicCount}
          totalViews={totalViews}
        />

        {/* Projects Management Table */}
        <AdminTable
          initialProjects={projects}
          isAdmin={currentUser?.role === "admin" || currentUser?.id === "selfhost-admin"}
        />
      </main>
    </div>
  );
}

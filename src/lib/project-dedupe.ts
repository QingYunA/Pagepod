import type { Project } from "@/db/schema";

type DedupeCandidate = Pick<Project, "userId" | "title" | "description">;

const MIN_DESCRIPTION_LENGTH = 20;

function normalize(value: string | null | undefined): string {
  return (value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Collapses reposts of the same project by the same owner, keeping the first (best-ranked) copy.
 * Distinct owners sharing a common title, and projects without a meaningful description,
 * are never treated as duplicates.
 */
export function dedupePublicProjects<T extends DedupeCandidate>(projects: T[]): T[] {
  const seenFingerprints = new Set<string>();
  return projects.filter((project) => {
    const description = normalize(project.description);
    if (!project.userId || description.length < MIN_DESCRIPTION_LENGTH) return true;
    const fingerprint = `${project.userId}\n${normalize(project.title)}\n${description}`;
    if (seenFingerprints.has(fingerprint)) return false;
    seenFingerprints.add(fingerprint);
    return true;
  });
}

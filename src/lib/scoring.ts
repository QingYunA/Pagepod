/**
 * Universal trending score calculator using gravity time-decay formula:
 * Score = (ViewCount + 1) / (AgeInHours + 2)^1.5
 *
 * Enforces a minimum base of 0.1 to avoid negative or division-by-zero errors.
 */

export function calculateTrendingScore(
  viewCount: number = 0,
  createdAt: Date | string | number,
  referenceTime: number | Date = Date.now()
): number {
  const createdMs =
    typeof createdAt === "number"
      ? createdAt
      : new Date(createdAt).getTime();

  const refMs =
    typeof referenceTime === "number"
      ? referenceTime
      : referenceTime.getTime();

  const safeCreatedMs = Number.isNaN(createdMs) ? refMs : createdMs;
  const ageHours = Math.max(0, (refMs - safeCreatedMs) / (1000 * 60 * 60));
  const base = Math.max(0.1, ageHours + 2.0);

  return ((viewCount || 0) + 1.0) / Math.pow(base, 1.5);
}

/**
 * Guest Upload Claims Client Storage & Event Dispatcher
 * Single Source of Truth for guest claim tokens in localStorage and reconciliation events.
 */

export const GUEST_CLAIMS_STORAGE_KEY = "pagepod_guest_claims";
export const GUEST_CLAIMED_EVENT = "pagepod:claimed";

export interface GuestClaimRecord {
  slug: string;
  claimToken: string;
}

export interface GuestClaimedEventDetail {
  claimedCount: number;
  resolvedSlugs: string[];
}

export function getStoredGuestClaims(): GuestClaimRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CLAIMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestClaim(claim: GuestClaimRecord): void {
  if (typeof window === "undefined") return;
  try {
    const claims = getStoredGuestClaims();
    const existingIndex = claims.findIndex((c) => c.slug === claim.slug);
    if (existingIndex >= 0) {
      claims[existingIndex] = claim;
    } else {
      claims.push(claim);
    }
    localStorage.setItem(GUEST_CLAIMS_STORAGE_KEY, JSON.stringify(claims));
  } catch {
    // Gracefully handle storage quota or privacy mode errors
  }
}

export function purgeGuestClaims(resolvedSlugs: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const claims = getStoredGuestClaims();
    const remaining = claims.filter((c) => !resolvedSlugs.includes(c.slug));
    if (remaining.length > 0) {
      localStorage.setItem(GUEST_CLAIMS_STORAGE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(GUEST_CLAIMS_STORAGE_KEY);
    }
  } catch {
    // Gracefully handle errors
  }
}

export function clearAllGuestClaims(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_CLAIMS_STORAGE_KEY);
  } catch {
    // Gracefully handle errors
  }
}

export function dispatchGuestClaimedEvent(detail: GuestClaimedEventDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(GUEST_CLAIMED_EVENT, {
      detail,
    })
  );
}

type EventDataValue = string | number | boolean;
export type EventData = Record<string, EventDataValue>;

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: EventData) => void;
    };
  }
}

/**
 * Safely send custom event data to Umami Analytics.
 * Never throws and safely fails silently if Umami is not loaded or blocked by ad-blockers.
 */
export function trackEvent(eventName: string, eventData?: EventData): void {
  try {
    if (typeof window !== "undefined" && window.umami && typeof window.umami.track === "function") {
      window.umami.track(eventName, eventData);
    }
  } catch {
    // Non-fatal telemetry error
  }
}

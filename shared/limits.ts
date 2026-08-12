/**
 * Burn Box file size policy
 *
 * - Hard cap: 20 GB per file (no unbounded watcher uploads)
 * - Confirm: explicit user permission required over 5 GB
 * - Ritual animation: fire → snap → shiny box for drops over 1 GB
 */

export const BYTES = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
} as const;

/** Absolute maximum accepted file size */
export const MAX_FILE_BYTES = 20 * BYTES.GB;

/** User must confirm before upload */
export const CONFIRM_THRESHOLD_BYTES = 5 * BYTES.GB;

/** Play the burn-and-rebirth drop animation */
export const ANIMATION_THRESHOLD_BYTES = 1 * BYTES.GB;

/** Header client sends after confirming a >5 GB upload */
export const CONFIRM_LARGE_HEADER = "x-burn-box-confirm-large";

/** Header client may send for preferred storage backend */
export const STORAGE_BACKEND_HEADER = "x-burn-box-storage";

export type StorageBackendId = "local" | "cloud";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value < 10 && i > 0 ? value.toFixed(2) : value.toFixed(1)} ${units[i]}`;
}

export function needsLargeConfirm(bytes: number): boolean {
  return bytes > CONFIRM_THRESHOLD_BYTES;
}

export function needsBurnAnimation(bytes: number): boolean {
  return bytes > ANIMATION_THRESHOLD_BYTES;
}

export function exceedsMax(bytes: number): boolean {
  return bytes > MAX_FILE_BYTES;
}

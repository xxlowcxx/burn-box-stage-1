import { resolveReadablePath } from "./blob-store";

// Helper to get safe copy path for a file record (local or cloud mirror)
export function getSafeCopyPath(file: { safeCopyPath: string; storageBackend?: string | null }): string {
  return resolveReadablePath(file.storageBackend, file.safeCopyPath);
}

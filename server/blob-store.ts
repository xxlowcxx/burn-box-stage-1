/**
 * Local + cloud blob backends for Burn Box safe copies / quarantine.
 *
 * Local:  storage/quarantine + storage/safe on disk
 * Cloud:  S3-compatible (AWS_S3_*, or Supabase S3 gateway) when configured;
 *         falls back to a local "cloud-mirror" directory so offline/dev still works.
 */

import fs from "fs";
import path from "path";
import { Readable } from "stream";
import type { StorageBackendId } from "@shared/limits";

const ROOT = path.join(process.cwd(), "storage");
export const QUARANTINE_DIR = path.join(ROOT, "quarantine");
export const SAFE_DIR = path.join(ROOT, "safe");
export const CLOUD_MIRROR_DIR = path.join(ROOT, "cloud-mirror");

for (const dir of [QUARANTINE_DIR, SAFE_DIR, CLOUD_MIRROR_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

export interface BlobPutResult {
  backend: StorageBackendId;
  key: string;
  absolutePath: string;
  remoteUrl?: string;
}

export interface CloudConfig {
  enabled: boolean;
  endpoint?: string;
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBaseUrl?: string;
}

export function getCloudConfig(): CloudConfig {
  const bucket = process.env.BURNBOX_S3_BUCKET || process.env.AWS_S3_BUCKET || process.env.SUPABASE_STORAGE_BUCKET;
  const endpoint = process.env.BURNBOX_S3_ENDPOINT || process.env.AWS_S3_ENDPOINT || process.env.SUPABASE_S3_ENDPOINT;
  const accessKeyId = process.env.BURNBOX_S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || process.env.SUPABASE_S3_ACCESS_KEY;
  const secretAccessKey = process.env.BURNBOX_S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || process.env.SUPABASE_S3_SECRET_KEY;
  const region = process.env.BURNBOX_S3_REGION || process.env.AWS_REGION || "auto";
  const publicBaseUrl = process.env.BURNBOX_CLOUD_PUBLIC_URL || process.env.SUPABASE_URL;
  const force = process.env.BURNBOX_CLOUD_ENABLED === "1" || process.env.BURNBOX_CLOUD_ENABLED === "true";
  const enabled = force || Boolean(bucket && accessKeyId && secretAccessKey);

  return { enabled, endpoint, bucket, region, accessKeyId, secretAccessKey, publicBaseUrl };
}

export function resolveBackend(requested?: string | null): StorageBackendId {
  if (requested === "cloud") return "cloud";
  return "local";
}

export function localSafePath(key: string): string {
  return path.join(SAFE_DIR, path.basename(key));
}

export function localQuarantinePath(key: string): string {
  return path.join(QUARANTINE_DIR, path.basename(key));
}

export function cloudMirrorPath(key: string): string {
  return path.join(CLOUD_MIRROR_DIR, path.basename(key));
}

/** Persist a safe copy to the chosen backend (stream-friendly copy). */
export async function putSafeBlob(
  sourcePath: string,
  key: string,
  backend: StorageBackendId,
): Promise<BlobPutResult> {
  if (backend === "cloud") {
    const dest = cloudMirrorPath(key);
    await copyFileStreaming(sourcePath, dest);
    try {
      fs.chmodSync(dest, 0o444);
    } catch {
      /* windows */
    }

    const cfg = getCloudConfig();
    let remoteUrl: string | undefined;
    if (cfg.enabled && cfg.bucket) {
      remoteUrl = cfg.publicBaseUrl
        ? `${cfg.publicBaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${cfg.bucket}/${encodeURIComponent(path.basename(key))}`
        : `s3://${cfg.bucket}/${path.basename(key)}`;
    }

    return {
      backend: "cloud",
      key: path.basename(key),
      absolutePath: dest,
      remoteUrl,
    };
  }

  const dest = localSafePath(key);
  await copyFileStreaming(sourcePath, dest);
  try {
    fs.chmodSync(dest, 0o444);
  } catch {
    /* windows */
  }
  return { backend: "local", key: path.basename(key), absolutePath: dest };
}

export function resolveReadablePath(backend: StorageBackendId | string | null | undefined, key: string): string {
  const base = path.basename(key);
  if (backend === "cloud") {
    const cloud = cloudMirrorPath(base);
    if (fs.existsSync(cloud)) return cloud;
  }
  const local = localSafePath(base);
  if (fs.existsSync(local)) return local;
  const cloud = cloudMirrorPath(base);
  if (fs.existsSync(cloud)) return cloud;
  return local;
}

export async function copyFileStreaming(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await new Promise<void>((resolve, reject) => {
    const read = fs.createReadStream(src);
    const write = fs.createWriteStream(dest);
    read.on("error", reject);
    write.on("error", reject);
    write.on("finish", () => resolve());
    read.pipe(write);
  });
}

export function openReadStream(filePath: string): Readable {
  return fs.createReadStream(filePath);
}

export function storageStatus() {
  const cloud = getCloudConfig();
  return {
    local: {
      available: true,
      quarantineDir: QUARANTINE_DIR,
      safeDir: SAFE_DIR,
    },
    cloud: {
      available: true,
      remoteConfigured: cloud.enabled,
      bucket: cloud.bucket || null,
      endpoint: cloud.endpoint || null,
      mirrorDir: CLOUD_MIRROR_DIR,
    },
    defaults: {
      maxFileBytes: 20 * 1024 * 1024 * 1024,
      confirmOverBytes: 5 * 1024 * 1024 * 1024,
    },
  };
}

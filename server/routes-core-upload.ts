import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import {
  MAX_FILE_BYTES,
  formatBytes,
  exceedsMax,
} from "@shared/limits";
import { QUARANTINE_DIR } from "./blob-store";

// Multer config: store uploads in quarantine (temp). Cap = 20 GB.
export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, QUARANTINE_DIR),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  }),
  limits: { fileSize: MAX_FILE_BYTES },
});

/** Reject oversize / unconfirmed large uploads before scan work. */
export function enforceLargeFilePolicy(req: Request, res: Response, next: NextFunction) {
  const cl = req.headers["content-length"];
  if (cl) {
    const n = parseInt(String(cl), 10);
    if (Number.isFinite(n) && exceedsMax(n)) {
      return res.status(413).json({
        error: `File exceeds maximum of ${formatBytes(MAX_FILE_BYTES)}`,
        maxBytes: MAX_FILE_BYTES,
      });
    }
  }
  next();
}

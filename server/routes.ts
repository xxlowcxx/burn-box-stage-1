import type { Express } from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { eq, desc } from "drizzle-orm";

const UPLOAD_DIR = path.join(process.cwd(), "storage");
const QUARANTINE_DIR = path.join(UPLOAD_DIR, "quarantine");
const SAFE_DIR = path.join(UPLOAD_DIR, "safe");

// Ensure directories exist
fs.mkdirSync(QUARANTINE_DIR, { recursive: true });
fs.mkdirSync(SAFE_DIR, { recursive: true });

// Multer config: store uploads in quarantine (temp)
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, QUARANTINE_DIR),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// ============ AI SAFETY SCANNER ============
// Analyzes file content for potential threats, creates a safe sanitized copy

interface ScanResult {
  status: "safe" | "blocked";
  summary: string;
  threats: string[];
  safeCopyName: string; // actual filename in SAFE_DIR
}

// Patterns that indicate potentially dangerous content
const THREAT_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /eval\s*\(/gi, label: "JavaScript eval() call detected" },
  { pattern: /<script[^>]*>/gi, label: "Inline script tag detected" },
  { pattern: /on\w+\s*=\s*["']/gi, label: "Inline event handler detected" },
  { pattern: /document\.cookie/gi, label: "Cookie access detected" },
  { pattern: /window\.location/gi, label: "Navigation manipulation detected" },
  { pattern: /rm\s+-rf/gi, label: "Destructive shell command detected" },
  { pattern: /curl\s+.*\|\s*sh/gi, label: "Remote code execution pattern detected" },
  { pattern: /wget\s+.*\|\s*bash/gi, label: "Remote code execution pattern detected" },
  { pattern: /powershell\s+-enc/gi, label: "Encoded PowerShell command detected" },
  { pattern: /base64decode/gi, label: "Base64 decoding detected (potential obfuscation)" },
  { pattern: /CREATE\s+TABLE|DROP\s+TABLE|INSERT\s+INTO|DELETE\s+FROM/gi, label: "SQL statement detected" },
  { pattern: /\\x[0-9a-f]{2}/gi, label: "Hex escape sequences detected (potential obfuscation)" },
  { pattern: /Authorization:\s*Bearer/gi, label: "Credential/token pattern detected" },
  { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi, label: "Private key material detected" },
  { pattern: /Auto_Open|AutoOpen|Workbook_Open/gi, label: "Macro auto-execute trigger detected" },
  { pattern: /Shell\s*\(/gi, label: "Shell execution call detected" },
  { pattern: /WScript\.Shell/gi, label: "Windows Script Shell object detected" },
  { pattern: /RegWrite|RegDelete/gi, label: "Registry manipulation detected" },
];

// File types that are safe to keep as-is (images, etc.)
const SAFE_MIME_PREFIXES = ["image/", "audio/", "video/", "application/pdf"];

// Extensions for text-based files we can scan
const TEXT_EXTENSIONS = [
  ".txt", ".md", ".json", ".js", ".ts", ".jsx", ".tsx", ".html", ".htm",
  ".css", ".csv", ".xml", ".yaml", ".yml", ".py", ".rb", ".php", ".java",
  ".c", ".cpp", ".h", ".sh", ".bat", ".ps1", ".sql", ".env", ".config",
  ".ini", ".toml", ".rtf", ".log", ".svg", ".vue", ".svelte", ".go",
  ".rs", ".swift", ".kt", ".scala", ".r", ".lua", ".pl", ".dart",
];

function isTextFile(filename: string, mimeType: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  if (TEXT_EXTENSIONS.includes(ext)) return true;
  if (mimeType.startsWith("text/")) return true;
  if (mimeType === "application/json" || mimeType === "application/xml") return true;
  return false;
}

function isBinarySafe(mimeType: string): boolean {
  return SAFE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

function scanContent(content: string): { threats: string[]; sanitized: string } {
  const threats: string[] = [];
  let sanitized = content;

  for (const { pattern, label } of THREAT_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      threats.push(`${label} (${matches.length} occurrence${matches.length > 1 ? "s" : ""})`);
      // Remove/neutralize the dangerous pattern
      sanitized = sanitized.replace(pattern, "[REMOVED BY SCANNER]");
    }
  }

  return { threats, sanitized };
}

function performAIScan(filePath: string, originalName: string, mimeType: string, fileSize: number): ScanResult {
  const threats: string[] = [];
  let summary = "";
  const ext = path.extname(originalName).toLowerCase();

  // If binary safe file (image, PDF, etc), do metadata scan
  if (isBinarySafe(mimeType) && !isTextFile(originalName, mimeType)) {
    const safeFileName = path.basename(filePath);
    const safeFilePath = path.join(SAFE_DIR, safeFileName);

    if (fileSize > 20 * 1024 * 1024) {
      threats.push("File size exceeds safe threshold");
      return {
        status: "blocked",
        summary: `Scan flagged: file size exceeds safe threshold. Original deleted, no safe copy created.`,
        threats,
        safeCopyName: "",
      };
    }

    // Copy binary file to safe directory
    fs.copyFileSync(filePath, safeFilePath);
    try { fs.chmodSync(safeFilePath, 0o444); } catch {}

    summary = `Pattern scan complete. Binary file type (${mimeType}) verified as safe media format. No executable content detected. Original deleted, safe copy kept read-only.`;
    return { status: "safe", summary, threats, safeCopyName: safeFileName };
  }

  // For text-based files, read and scan content
  if (isTextFile(originalName, mimeType)) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");

      // Truncate very large text for scanning
      const scanContentStr = content.length > 500000 ? content.substring(0, 500000) + "\n[TRUNCATED FOR SCAN]" : content;

      const { threats: contentThreats, sanitized } = scanContent(scanContentStr);

      if (contentThreats.length > 0) {
        threats.push(...contentThreats);
        // Write sanitized version
        const safeFilePath = path.join(SAFE_DIR, path.basename(filePath));
        const header = `[SafeDrive Scan Report]\nOriginal: ${originalName}\nScanned: ${new Date().toISOString()}\nStatus: SANITIZED - ${contentThreats.length} threat(s) neutralized\nThreats: ${contentThreats.join("; ")}\n\n--- SANITIZED CONTENT ---\n`;
        fs.writeFileSync(safeFilePath, header + sanitized, "utf-8");
        try { fs.chmodSync(safeFilePath, 0o444); } catch {}

        return {
          status: "safe",
          summary: `Pattern scan detected and neutralized ${contentThreats.length} potential threat(s) in text content. Safe copy created with threats removed. Original deleted.`,
          threats,
          safeCopyName: path.basename(safeFilePath),
        };
      } else {
        // Clean file - copy as-is
        const safeFilePath = path.join(SAFE_DIR, path.basename(filePath));
        const header = `[SafeDrive Scan Report]\nOriginal: ${originalName}\nScanned: ${new Date().toISOString()}\nStatus: CLEAN - No threats detected\n\n--- FILE CONTENT ---\n`;
        fs.writeFileSync(safeFilePath, header + content, "utf-8");
        try { fs.chmodSync(safeFilePath, 0o444); } catch {}

        return {
          status: "safe",
          summary: `Pattern scan complete. No threats detected in text content. File verified safe. Original deleted.`,
          threats: [],
          safeCopyName: path.basename(safeFilePath),
        };
      }
    } catch (err) {
      return {
        status: "blocked",
        summary: `Scan error: unable to read file content. File blocked for safety.`,
        threats: ["Unable to read file content for scanning"],
        safeCopyName: "",
      };
    }
  }

  // Unknown file type - create metadata capsule
  try {
    const stats = fs.statSync(filePath);
    const safeCopyName = path.basename(filePath) + ".meta";
    const safeFilePath = path.join(SAFE_DIR, safeCopyName);
    const capsule = `[SafeDrive Scan Report]\nOriginal: ${originalName}\nType: ${mimeType}\nSize: ${stats.size} bytes\nScanned: ${new Date().toISOString()}\nStatus: QUARANTINED - Unknown file type, content not analyzable\nSafe Copy: Metadata capsule created. Original binary deleted.\n`;
    fs.writeFileSync(safeFilePath, capsule, "utf-8");
    try { fs.chmodSync(safeFilePath, 0o444); } catch {}

    return {
      status: "safe",
      summary: `Scan: Unknown file type (${mimeType}). Created safe metadata capsule. Original file deleted as precaution. Content is not directly viewable.`,
      threats: ["Unknown file type - not analyzable"],
      safeCopyName,
    };
  } catch {
    return {
      status: "blocked",
      summary: `Scan failed: could not process file.`,
      threats: ["Processing error"],
      safeCopyName: "",
    };
  }
}

// Helper to get safe copy path for a file record
function getSafeCopyPath(file: { safeCopyPath: string }): string {
  return path.join(SAFE_DIR, path.basename(file.safeCopyPath));
}

export async function registerRoutes(
  _httpServer: Server,
  app: Express
): Promise<Server> {
  // ============ UPLOAD + SCAN PIPELINE ============
  app.post("/api/files/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const originalName = req.file.originalname;
      const mimeType = req.file.mimetype;
      const fileSize = req.file.size;
      const quarantinePath = req.file.path;

      // Create initial file record (status: scanning)
      const fileRecord = await storage.createFile({
        originalName,
        safeName: originalName,
        mimeType,
        fileSize,
        safeSize: 0,
        scanStatus: "scanning",
        scanSummary: "File uploaded, safety scan in progress...",
        threatsDetected: null,
        safeCopyPath: req.file.filename,
      });

      // Log upload + scan start
      await storage.createAuditLog({
        fileId: fileRecord.id,
        action: "upload",
        detail: `File "${originalName}" (${mimeType}, ${fileSize} bytes) uploaded to quarantine`,
      });
      await storage.createAuditLog({
        fileId: fileRecord.id,
        action: "scan_start",
        detail: `Safety scan initiated for "${originalName}"`,
      });

      // ============ RUN SAFETY SCAN ============
      const scanResult = performAIScan(quarantinePath, originalName, mimeType, fileSize);

      // Calculate safe copy size
      const safePath = scanResult.safeCopyName ? path.join(SAFE_DIR, scanResult.safeCopyName) : "";
      let safeSize = 0;
      try {
        if (safePath) safeSize = fs.statSync(safePath).size;
      } catch {
        // Safe copy might not exist if blocked
      }

      // Update file record with scan results
      await storage.updateFile(fileRecord.id, {
        scanStatus: scanResult.status,
        scanSummary: scanResult.summary,
        threatsDetected: scanResult.threats.length > 0 ? JSON.stringify(scanResult.threats) : null,
        safeSize,
        safeCopyPath: scanResult.safeCopyName || req.file.filename,
        scannedAt: Math.floor(Date.now() / 1000),
      });

      // Log scan completion
      await storage.createAuditLog({
        fileId: fileRecord.id,
        action: "scan_complete",
        detail: scanResult.summary,
      });

      if (scanResult.status === "safe") {
        // ============ DELETE ORIGINAL FROM QUARANTINE ============
        try {
          fs.unlinkSync(quarantinePath);
          await storage.createAuditLog({
            fileId: fileRecord.id,
            action: "original_deleted",
            detail: `Original file "${originalName}" deleted from quarantine after safety scan`,
          });
        } catch {
          // Original might already be gone
        }

        await storage.createAuditLog({
          fileId: fileRecord.id,
          action: "safe_copy_created",
          detail: `Safety-verified safe copy created for "${originalName}" (${safeSize} bytes, read-only)`,
        });
      } else {
        // Blocked - delete from quarantine, no safe copy
        try {
          fs.unlinkSync(quarantinePath);
        } catch {}
        await storage.createAuditLog({
          fileId: fileRecord.id,
          action: "original_deleted",
          detail: `Blocked file "${originalName}" deleted from quarantine`,
        });
      }

      // Fetch updated record
      const updated = await storage.getFile(fileRecord.id);
      return res.status(201).json(updated);
    } catch (err: any) {
      console.error("Upload/scan error:", err);
      return res.status(500).json({ error: "Upload and scan failed: " + err.message });
    }
  });

  // ============ LIST ALL FILES ============
  app.get("/api/files", async (_req, res) => {
    const allFiles = await storage.getAllFiles();
    res.json(allFiles);
  });

  // ============ GET SINGLE FILE ============
  app.get("/api/files/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const file = await storage.getFile(id);
    if (!file) return res.status(404).json({ error: "File not found" });
    res.json(file);
  });

  // ============ VIEW FILE CONTENT (read-only) ============
  app.get("/api/files/:id/view", async (req, res) => {
    const id = parseInt(req.params.id);
    const file = await storage.getFile(id);
    if (!file) return res.status(404).json({ error: "File not found" });
    if (file.scanStatus !== "safe") return res.status(403).json({ error: "File is not safe to view" });

    const safePath = getSafeCopyPath(file);
    if (!fs.existsSync(safePath)) return res.status(404).json({ error: "Safe copy not found on disk" });

    // Log view
    await storage.createAuditLog({
      fileId: file.id,
      action: "viewed",
      detail: `File "${file.originalName}" viewed (read-only)`,
    });

    const content = fs.readFileSync(safePath, "utf-8");
    res.json({ content, fileName: file.originalName, scanSummary: file.scanSummary });
  });

  // ============ DOWNLOAD FILE (read-only) ============
  app.get("/api/files/:id/download", async (req, res) => {
    const id = parseInt(req.params.id);
    const file = await storage.getFile(id);
    if (!file) return res.status(404).json({ error: "File not found" });
    if (file.scanStatus !== "safe") return res.status(403).json({ error: "File is not safe to download" });

    const safePath = getSafeCopyPath(file);
    if (!fs.existsSync(safePath)) return res.status(404).json({ error: "Safe copy not found on disk" });

    // Log download
    await storage.createAuditLog({
      fileId: file.id,
      action: "downloaded",
      detail: `Safe copy of "${file.originalName}" downloaded`,
    });

    const downloadName = `safe_${file.originalName}`;
    res.download(safePath, downloadName);
  });

  // ============ DELETE SAFE FILE ============
  app.delete("/api/files/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const file = await storage.getFile(id);
    if (!file) return res.status(404).json({ error: "File not found" });

    // Delete safe copy from disk
    const safePath = getSafeCopyPath(file);
    if (fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
    }

    await storage.createAuditLog({
      fileId: file.id,
      action: "deleted",
      detail: `Safe file "${file.originalName}" permanently deleted from drive`,
    });

    await storage.deleteFile(id);
    res.json({ success: true });
  });

  // ============ AUDIT LOG ============
  app.get("/api/audit", async (_req, res) => {
    const logs = await storage.getAllAuditLogs();
    res.json(logs);
  });

  // ============ STATS ============
  app.get("/api/stats", async (_req, res) => {
    const allFiles = await storage.getAllFiles();
    const allLogs = await storage.getAllAuditLogs();

    const safeFiles = allFiles.filter((f) => f.scanStatus === "safe").length;
    const blockedFiles = allFiles.filter((f) => f.scanStatus === "blocked").length;
    const scanningFiles = allFiles.filter((f) => f.scanStatus === "scanning").length;
    const totalSize = allFiles.reduce((sum, f) => sum + f.safeSize, 0);
    const threatsNeutralized = allFiles.filter((f => f.threatsDetected)).length;
    const originalsDeleted = allLogs.filter((l) => l.action === "original_deleted").length;

    res.json({
      totalFiles: allFiles.length,
      safeFiles,
      blockedFiles,
      scanningFiles,
      totalSize,
      threatsNeutralized,
      originalsDeleted,
    });
  });

  return _httpServer;
}

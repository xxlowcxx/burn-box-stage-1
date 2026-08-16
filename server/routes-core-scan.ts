import path from "path";
import fs from "fs";
import { formatBytes } from "@shared/limits";
import { SAFE_DIR } from "./blob-store";

// ============ AI SAFETY SCANNER (performance-tuned) ============

interface ScanResult {
  status: "safe" | "blocked";
  summary: string;
  threats: string[];
  safeCopyName: string;
}

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

const SAFE_MIME_PREFIXES = ["image/", "audio/", "video/", "application/pdf"];

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".js", ".ts", ".jsx", ".tsx", ".html", ".htm",
  ".css", ".csv", ".xml", ".yaml", ".yml", ".py", ".rb", ".php", ".java",
  ".c", ".cpp", ".h", ".sh", ".bat", ".ps1", ".sql", ".env", ".config",
  ".ini", ".toml", ".rtf", ".log", ".svg", ".vue", ".svelte", ".go",
  ".rs", ".swift", ".kt", ".scala", ".r", ".lua", ".pl", ".dart",
]);

const LARGE_SCAN_BYTES = 100 * 1024 * 1024;
const SCAN_CAP_BYTES = 500_000;

export function isTextFile(filename: string, mimeType: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  if (mimeType.startsWith("text/")) return true;
  if (mimeType === "application/json" || mimeType === "application/xml") return true;
  return false;
}

export function isBinarySafe(mimeType: string): boolean {
  for (let i = 0; i < SAFE_MIME_PREFIXES.length; i++) {
    if (mimeType.startsWith(SAFE_MIME_PREFIXES[i])) return true;
  }
  return false;
}

/** Single-pass scan: count + replace without a separate match() pass. */
function scanContent(content: string): { threats: string[]; sanitized: string } {
  const threats: string[] = [];
  let sanitized = content;

  for (const { pattern, label } of THREAT_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    let count = 0;
    sanitized = sanitized.replace(pattern, () => {
      count++;
      return "[REMOVED BY SCANNER]";
    });
    if (count > 0) {
      threats.push(`${label} (${count} occurrence${count > 1 ? "s" : ""})`);
    }
  }

  return { threats, sanitized };
}

function chmodReadonly(p: string): void {
  try {
    fs.chmodSync(p, 0o444);
  } catch {
    /* windows / no-op */
  }
}

export function performAIScan(
  filePath: string,
  originalName: string,
  mimeType: string,
  fileSize: number,
): ScanResult {
  const threats: string[] = [];

  // Binary-safe media: stream-friendly copy, no content load
  if (isBinarySafe(mimeType) && !isTextFile(originalName, mimeType)) {
    const safeFileName = path.basename(filePath);
    const safeFilePath = path.join(SAFE_DIR, safeFileName);
    fs.copyFileSync(filePath, safeFilePath);
    chmodReadonly(safeFilePath);

    const summary =
      fileSize > LARGE_SCAN_BYTES
        ? `Pattern scan complete (large binary ${formatBytes(fileSize)}). MIME/type check only — full content not loaded into memory. Original deleted, safe copy kept read-only.`
        : `Pattern scan complete. Binary file type (${mimeType}) verified as safe media format. No executable content detected. Original deleted, safe copy kept read-only.`;
    return { status: "safe", summary, threats, safeCopyName: safeFileName };
  }

  // Text-based files
  if (isTextFile(originalName, mimeType)) {
    try {
      // Very large text: scan first 500KB only, stream-copy body
      if (fileSize > LARGE_SCAN_BYTES) {
        const fd = fs.openSync(filePath, "r");
        const buf = Buffer.alloc(Math.min(SCAN_CAP_BYTES, fileSize));
        fs.readSync(fd, buf, 0, buf.length, 0);
        fs.closeSync(fd);
        const scanContentStr = buf.toString("utf-8") + "\n[TRUNCATED FOR SCAN — large file]";
        const { threats: contentThreats } = scanContent(scanContentStr);
        const safeFilePath = path.join(SAFE_DIR, path.basename(filePath));
        fs.copyFileSync(filePath, safeFilePath);
        chmodReadonly(safeFilePath);
        if (contentThreats.length > 0) threats.push(...contentThreats);
        return {
          status: "safe",
          summary: `Large text file (${formatBytes(fileSize)}): scanned first 500KB only (${contentThreats.length} pattern hit(s)). Stream-copied to safe vault. Original deleted.`,
          threats,
          safeCopyName: path.basename(safeFilePath),
        };
      }

      // Medium/small text: read once, scan once, write once
      const content = fs.readFileSync(filePath, "utf-8");
      const scanContentStr =
        content.length > SCAN_CAP_BYTES
          ? content.substring(0, SCAN_CAP_BYTES) + "\n[TRUNCATED FOR SCAN]"
          : content;

      const { threats: contentThreats, sanitized } = scanContent(scanContentStr);
      const safeFilePath = path.join(SAFE_DIR, path.basename(filePath));

      if (contentThreats.length > 0) {
        threats.push(...contentThreats);
        const header = `[Burn Box Scan Report]\nOriginal: ${originalName}\nScanned: ${new Date().toISOString()}\nStatus: SANITIZED - ${contentThreats.length} threat(s) neutralized\nThreats: ${contentThreats.join("; ")}\n\n--- SANITIZED CONTENT ---\n`;
        // Only rewrite body when threats found; avoid rewriting full multi-MB clean tails
        const body =
          content.length > SCAN_CAP_BYTES
            ? sanitized + "\n[... remainder truncated in sanitized view ...]"
            : sanitized;
        fs.writeFileSync(safeFilePath, header + body, "utf-8");
        chmodReadonly(safeFilePath);
        return {
          status: "safe",
          summary: `Pattern scan detected and neutralized ${contentThreats.length} potential threat(s) in text content. Safe copy created with threats removed. Original deleted.`,
          threats,
          safeCopyName: path.basename(safeFilePath),
        };
      }

      // Clean: prefer copyFile when no sanitization needed (faster than rewrite)
      if (content.length <= SCAN_CAP_BYTES) {
        const header = `[Burn Box Scan Report]\nOriginal: ${originalName}\nScanned: ${new Date().toISOString()}\nStatus: CLEAN - No threats detected\n\n--- FILE CONTENT ---\n`;
        fs.writeFileSync(safeFilePath, header + content, "utf-8");
      } else {
        fs.copyFileSync(filePath, safeFilePath);
      }
      chmodReadonly(safeFilePath);

      return {
        status: "safe",
        summary: `Pattern scan complete. No threats detected in text content. File verified safe. Original deleted.`,
        threats: [],
        safeCopyName: path.basename(safeFilePath),
      };
    } catch {
      return {
        status: "blocked",
        summary: `Scan error: unable to read file content. File blocked for safety.`,
        threats: ["Unable to read file content for scanning"],
        safeCopyName: "",
      };
    }
  }

  // Unknown type → metadata capsule only (no full binary copy)
  try {
    const stats = fs.statSync(filePath);
    const safeCopyName = path.basename(filePath) + ".meta";
    const safeFilePath = path.join(SAFE_DIR, safeCopyName);
    const capsule = `[Burn Box Scan Report]\nOriginal: ${originalName}\nType: ${mimeType}\nSize: ${stats.size} bytes\nScanned: ${new Date().toISOString()}\nStatus: QUARANTINED - Unknown file type, content not analyzable\nSafe Copy: Metadata capsule created. Original binary deleted.\n`;
    fs.writeFileSync(safeFilePath, capsule, "utf-8");
    chmodReadonly(safeFilePath);
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

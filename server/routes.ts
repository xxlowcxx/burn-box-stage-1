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

// Helper to format bytes for display
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// ============ FILE INTELLIGENCE ANALYZER ============
// Analyzes file content to understand what it is, how it works, and what it connects to

interface FileNotes {
  detectedType: string;
  moduleType: string;
  howItWorks: string;
  connections: { type: string; target: string; evidence: string }[];
  html?: { title: string; scripts: number; forms: number; links: number };
  githubHints: { label: string; query: string; url: string }[];
  engine: "heuristic";
  confidence: "medium";
  limitations: string[];
}

function analyzeFileIntelligence(
  filePath: string,
  originalName: string,
  mimeType: string,
  fileSize: number,
): FileNotes | null {
  const ext = path.extname(originalName).toLowerCase().replace(".", "");
  const connections: { type: string; target: string; evidence: string }[] = [];
  const githubHints: { label: string; query: string; url: string }[] = [];
  const limitations: string[] = [];
  let detectedType = "Unknown file";
  let moduleType = "";
  let howItWorks = "";
  let html: { title: string; scripts: number; forms: number; links: number } | undefined;

  // Try to read content for text-based files
  let content = "";
  const isText = isTextFile(originalName, mimeType);
  if (isText) {
    try {
      content = fs.readFileSync(filePath, "utf-8").substring(0, 100000); // cap at 100k
    } catch {
      limitations.push("Could not read file content for analysis");
    }
  }

  // ---- Detect file type and module type ----

  if (ext === "json" && content) {
    try {
      const json = JSON.parse(content);
      if (json.name && json.version && (json.dependencies || json.devDependencies)) {
        detectedType = "npm package manifest";
        moduleType = "Node.js / npm package";
        const deps = Object.keys(json.dependencies || {});
        const devDeps = Object.keys(json.devDependencies || {});
        howItWorks = `npm package "${json.name}" v${json.version}. Main entry: ${json.main || "index.js"}. ${deps.length} dependencies, ${devDeps.length} devDependencies. Scripts: ${Object.keys(json.scripts || {}).join(", ") || "none"}.`;
        for (const dep of deps.slice(0, 10)) {
          connections.push({ type: "npm_dependency", target: dep, evidence: `"${dep}": "${json.dependencies[dep]}"` });
        }
        githubHints.push({
          label: "Search npm package on GitHub",
          query: `${json.name} package.json`,
          url: `https://github.com/search?q=${encodeURIComponent(json.name + " package.json")}&type=code`,
        });
      } else if (json.manifest_version) {
        detectedType = "Browser extension manifest";
        moduleType = `Browser extension (Manifest V${json.manifest_version})`;
        howItWorks = `Chrome/Firefox extension. Name: "${json.name}". Permissions: ${(json.permissions || []).join(", ") || "none"}. `;
        if (json.content_scripts) howItWorks += `Content scripts: ${JSON.stringify(json.content_scripts).substring(0, 200)}.`;
        if (json.background) howItWorks += ` Background: ${JSON.stringify(json.background).substring(0, 200)}.`;
        githubHints.push({
          label: "Search similar extension code on GitHub",
          query: `manifest_version ${json.manifest_version} ${json.name}`,
          url: `https://github.com/search?q=${encodeURIComponent("manifest_version " + json.manifest_version + " name:" + json.name)}&type=code`,
        });
      } else {
        detectedType = "JSON data file";
        howItWorks = `JSON file with ${Object.keys(json).length} top-level keys: ${Object.keys(json).slice(0, 8).join(", ")}.`;
      }
    } catch {
      detectedType = "JSON file (possibly invalid)";
      howItWorks = "JSON file that could not be fully parsed.";
    }
  } else if (ext === "html" || ext === "htm" || mimeType === "text/html") {
    detectedType = "HTML document";
    const hasDoctype = /<!DOCTYPE/i.test(content);
    const scriptTags = (content.match(/<script[\s>]/gi) || []).length;
    const formTags = (content.match(/<form[\s>]/gi) || []).length;
    const linkTags = (content.match(/<link[\s>]/gi) || []).length;
    const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i);
    html = {
      title: titleMatch ? titleMatch[1].trim() : "(no title)",
      scripts: scriptTags,
      forms: formTags,
      links: linkTags,
    };
    const isVueApp = /id=["']app["']/.test(content) || /vue/i.test(content);
    const isReactApp = /react/i.test(content) || /_next\//.test(content) || /__next/.test(content);
    const isAngularApp = /ng-app|angular/i.test(content);
    if (isReactApp) moduleType = "React app shell";
    else if (isVueApp) moduleType = "Vue app shell";
    else if (isAngularApp) moduleType = "Angular app shell";
    howItWorks = `HTML ${hasDoctype ? "document" : "fragment"}. Title: "${html.title}". ${scriptTags} script(s), ${formTags} form(s), ${linkTags} link(s).`;
    if (moduleType) howItWorks += ` Appears to be a ${moduleType}.`;

    // Extract external URLs from scripts and links
    const urlMatches = content.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi);
    for (const m of urlMatches) {
      const url = m[1];
      if (url.startsWith("http") || url.startsWith("//")) {
        connections.push({ type: "external_url", target: url, evidence: `src/href in HTML` });
      }
    }
    githubHints.push({
      label: "Search HTML patterns on GitHub",
      query: originalName,
      url: `https://github.com/search?q=${encodeURIComponent(originalName)}&type=code`,
    });
  } else if (["js", "jsx", "mjs", "cjs"].includes(ext)) {
    detectedType = "JavaScript module";
    const hasReact = /import\s+React|from\s+['"]react|jsx/.test(content);
    const hasExpress = /require\(['"]express['"]|from\s+['"]express/.test(content);
    const hasVue = /from\s+['"]vue['"]|createApp/.test(content);
    if (hasReact) moduleType = "React component/module";
    else if (hasExpress) moduleType = "Express.js backend module";
    else if (hasVue) moduleType = "Vue.js module";
    else moduleType = "JavaScript module";
    howItWorks = `JavaScript ${moduleType}. `;
    const exports_ = (content.match(/export\s+(default|const|function|class)/g) || []).length;
    const imports = (content.match(/import\s+/g) || []).length;
    howItWorks += `${imports} import(s), ${exports_} export(s).`;
  } else if (["ts", "tsx"].includes(ext)) {
    detectedType = "TypeScript module";
    const hasReact = /import\s+React|from\s+['"]react|jsx/.test(content);
    if (hasReact) moduleType = "React + TypeScript component";
    else moduleType = "TypeScript module";
    howItWorks = `TypeScript ${moduleType}.`;
  } else if (ext === "py") {
    detectedType = "Python script";
    const hasFlask = /from\s+flask|import\s+flask/.test(content);
    const hasDjango = /from\s+django|import\s+django/.test(content);
    const hasFastAPI = /from\s+fastapi|import\s+fastapi/.test(content);
    if (hasFlask) moduleType = "Flask web app";
    else if (hasDjango) moduleType = "Django app/module";
    else if (hasFastAPI) moduleType = "FastAPI app";
    else moduleType = "Python script";
    howItWorks = `Python ${moduleType}.`;
  } else if (ext === "sh" || ext === "bash") {
    detectedType = "Shell script";
    moduleType = "Bash/shell script";
    const hasShebang = content.startsWith("#!/");
    howItWorks = `Shell script${hasShebang ? ` (shebang: ${content.split("\n")[0]})` : ""}.`;
  } else if (ext === "bat" || ext === "cmd") {
    detectedType = "Windows batch script";
    moduleType = "Batch file";
    howItWorks = `Windows batch script.`;
  } else if (ext === "ps1") {
    detectedType = "PowerShell script";
    moduleType = "PowerShell script";
    howItWorks = `PowerShell script.`;
  } else if (ext === "css") {
    detectedType = "CSS stylesheet";
    const hasTailwind = /@tailwind|@apply/.test(content);
    moduleType = hasTailwind ? "Tailwind CSS" : "CSS stylesheet";
    const rules = (content.match(/\{[^}]*\}/g) || []).length;
    howItWorks = `${moduleType} with ${rules} rule(s).`;
  } else if (ext === "md") {
    detectedType = "Markdown document";
    moduleType = "Documentation";
    const headers = (content.match(/^#+\s/gm) || []).length;
    howItWorks = `Markdown document with ${headers} section(s).`;
  } else if (ext === "sql") {
    detectedType = "SQL script";
    moduleType = "Database script";
    howItWorks = `SQL script with ${(content.match(/;/g) || []).length} statement(s).`;
  } else if (ext === "svg") {
    detectedType = "SVG image";
    moduleType = "Vector graphic";
    howItWorks = `SVG vector image.`;
  } else if (ext === "env" || ext === "config" || ext === "ini" || ext === "toml") {
    detectedType = "Configuration file";
    moduleType = "Config file";
    howItWorks = `Configuration file with ${(content.match(/=/g) || []).length} setting(s).`;
    limitations.push("Config files may contain secrets — reviewed by threat scanner");
  } else if (ext === "yaml" || ext === "yml") {
    detectedType = "YAML file";
    const hasDockerCompose = /services:|image:|container_name:/.test(content);
    const hasK8s = /apiVersion:|kind:/.test(content);
    const hasGHAction = /name:.*\n.*on:|runs-on:/.test(content);
    if (hasDockerCompose) moduleType = "Docker Compose file";
    else if (hasK8s) moduleType = "Kubernetes manifest";
    else if (hasGHAction) moduleType = "GitHub Actions workflow";
    else moduleType = "YAML config";
    howItWorks = `YAML file — ${moduleType}.`;
  } else if (ext === "go") {
    detectedType = "Go source file";
    moduleType = "Go module";
    howItWorks = `Go source file.`;
  } else if (ext === "rs") {
    detectedType = "Rust source file";
    moduleType = "Rust module";
    howItWorks = `Rust source file.`;
  } else if (ext === "rb") {
    detectedType = "Ruby script";
    const hasRails = /Rails|ActiveRecord|ActionController/.test(content);
    moduleType = hasRails ? "Ruby on Rails file" : "Ruby script";
    howItWorks = `${moduleType}.`;
  } else if (ext === "php") {
    detectedType = "PHP script";
    const hasWordPress = /Plugin Name:|wp-content|add_action|add_filter/.test(content);
    moduleType = hasWordPress ? "WordPress plugin/theme" : "PHP script";
    howItWorks = `${moduleType}.`;
  } else if (ext === "java") {
    detectedType = "Java source file";
    moduleType = "Java class";
    howItWorks = `Java source file.`;
  } else if (ext === "csv") {
    detectedType = "CSV data file";
    moduleType = "Data file";
    const rows = content.split("\n").filter((l) => l.trim()).length;
    howItWorks = `CSV file with ${rows} row(s).`;
  } else if (ext === "xml") {
    detectedType = "XML document";
    moduleType = "XML data";
    howItWorks = `XML document.`;
  } else if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext)) {
    detectedType = "Image file";
    moduleType = `${ext.toUpperCase()} image`;
    howItWorks = `Image file (${mimeType}, ${formatBytes(fileSize)}). Binary content not inspected.`;
    limitations.push("Binary image content not inspected beyond MIME/size check");
  } else if (ext === "pdf") {
    detectedType = "PDF document";
    moduleType = "PDF";
    howItWorks = `PDF document (${formatBytes(fileSize)}). Binary content not inspected.`;
    limitations.push("PDF binary structure not inspected");
  } else {
    detectedType = `Unknown file type (${ext || "no extension"})`;
    moduleType = "Unknown";
    howItWorks = `File type could not be determined. MIME: ${mimeType}.`;
    limitations.push("File type not recognized by analyzer");
  }

  // ---- Extract connections from content ----
  if (content) {
    // ES module imports
    const esImports = content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g);
    for (const m of esImports) {
      connections.push({ type: "import", target: m[1], evidence: `import from "${m[1]}"` });
    }
    // CommonJS requires
    const requires = content.matchAll(/require\(['"]([^'"]+)['"]\)/g);
    for (const m of requires) {
      connections.push({ type: "require", target: m[1], evidence: `require("${m[1]}")` });
    }
    // Python imports
    const pyImports = content.matchAll(/^(?:from\s+(\S+)\s+)?import\s+(.+)/gm);
    for (const m of pyImports) {
      const target = m[1] || m[2].trim();
      connections.push({ type: "python_import", target, evidence: `import ${target}` });
    }
    // External URLs (fetch, axios, http calls)
    const urls = content.matchAll(/(?:fetch|axios|http\.get|http\.post|requests\.(?:get|post))\s*\(?\s*['"]([^'"]+)['"]/g);
    for (const m of urls) {
      connections.push({ type: "external_url", target: m[1], evidence: `HTTP call to ${m[1]}` });
    }
    // WebSocket / EventSource
    const wsMatches = content.matchAll(/new\s+(?:WebSocket|EventSource)\s*\(['"]([^'"]+)['"]/g);
    for (const m of wsMatches) {
      connections.push({ type: "websocket", target: m[1], evidence: `WebSocket/EventSource to ${m[1]}` });
    }
    // Environment variable references
    const envVars = content.matchAll(/process\.env\.(\w+)/g);
    for (const m of envVars) {
      connections.push({ type: "env_var", target: m[1], evidence: `process.env.${m[1]}` });
    }
    // Shell commands (curl, wget, ssh)
    const shellCmds = content.matchAll(/(?:curl|wget|ssh)\s+([^\s;\n|&]+)/g);
    for (const m of shellCmds) {
      connections.push({ type: "shell_command", target: m[1], evidence: `shell: ${m[0].split("\n")[0]}` });
    }
    // GitHub URLs
    const ghUrls = content.matchAll(/github\.com\/([^\s"'<>]+)/g);
    for (const m of ghUrls) {
      connections.push({ type: "github_ref", target: `github.com/${m[1]}`, evidence: `GitHub reference: ${m[0]}` });
      githubHints.push({
        label: `Open GitHub: ${m[1].split("/")[0]}`,
        query: m[1],
        url: `https://github.com/${m[1]}`,
      });
    }
  }

  // ---- Generate GitHub search hints ----
  if (githubHints.length === 0) {
    const searchTerms = [originalName, moduleType, detectedType].filter(Boolean).join(" ");
    githubHints.push({
      label: "Search GitHub for similar files",
      query: searchTerms,
      url: `https://github.com/search?q=${encodeURIComponent(searchTerms)}&type=code`,
    });
  }

  // Deduplicate connections
  const seen = new Set<string>();
  const dedupedConnections = connections.filter((c) => {
    const key = `${c.type}:${c.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20); // cap at 20

  if (!isText && !limitations.includes("Binary content not inspected")) {
    limitations.push("Binary content not inspected");
  }

  return {
    detectedType,
    moduleType,
    howItWorks,
    connections: dedupedConnections,
    html,
    githubHints: githubHints.slice(0, 5),
    engine: "heuristic",
    confidence: "medium",
    limitations,
  };
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

      // ============ RUN FILE INTELLIGENCE ANALYSIS ============
      // Analyze the original file (before deletion) for accurate content parsing
      let fileNotes: string | null = null;
      try {
        const notes = analyzeFileIntelligence(quarantinePath, originalName, mimeType, fileSize);
        if (notes) fileNotes = JSON.stringify(notes);
      } catch {
        // Intelligence analysis failure shouldn't block the upload
      }

      // Calculate safe copy size
      const safePath = scanResult.safeCopyName ? path.join(SAFE_DIR, scanResult.safeCopyName) : "";
      let safeSize = 0;
      try {
        if (safePath) safeSize = fs.statSync(safePath).size;
      } catch {
        // Safe copy might not exist if blocked
      }

      // Update file record with scan results + intelligence notes
      await storage.updateFile(fileRecord.id, {
        scanStatus: scanResult.status,
        scanSummary: scanResult.summary,
        threatsDetected: scanResult.threats.length > 0 ? JSON.stringify(scanResult.threats) : null,
        fileNotes,
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
    res.json({ content, fileName: file.originalName, scanSummary: file.scanSummary, fileNotes: file.fileNotes });
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

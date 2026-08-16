/**
 * File intelligence heuristics (non-blocking enrichment).
 * Kept separate so scan path stays fast.
 */
import path from "path";
import fs from "fs";
import { formatBytes } from "@shared/limits";
import { isTextFile } from "./routes-core-scan";

export interface FileNotes {
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

export function analyzeFileIntelligence(
  filePath: string,
  originalName: string,
  mimeType: string,
  fileSize: number,
): FileNotes | null {
  const ext = path.extname(originalName).toLowerCase().replace(".", "");
  const connections: FileNotes["connections"] = [];
  const githubHints: FileNotes["githubHints"] = [];
  const limitations: string[] = [];
  let detectedType = "Unknown file";
  let moduleType = "";
  let howItWorks = "";
  let html: FileNotes["html"];

  let content = "";
  if (isTextFile(originalName, mimeType)) {
    try {
      const buf = Buffer.alloc(Math.min(100_000, fileSize || 100_000));
      const fd = fs.openSync(filePath, "r");
      const n = fs.readSync(fd, buf, 0, buf.length, 0);
      fs.closeSync(fd);
      content = buf.slice(0, n).toString("utf-8");
    } catch {
      limitations.push("Could not read file content for analysis");
    }
  }

  if (ext === "json" && content) {
    try {
      const json = JSON.parse(content);
      if (json.name && json.version && (json.dependencies || json.devDependencies)) {
        detectedType = "npm package manifest";
        moduleType = "Node.js / npm package";
        howItWorks = `npm package "${json.name}" v${json.version}.`;
      } else if (json.manifest_version) {
        detectedType = "Browser extension manifest";
        moduleType = `Browser extension (Manifest V${json.manifest_version})`;
        howItWorks = `Extension "${json.name || "unknown"}".`;
      } else {
        detectedType = "JSON data file";
        howItWorks = `JSON with ${Object.keys(json).length} top-level keys.`;
      }
    } catch {
      detectedType = "JSON file (possibly invalid)";
      howItWorks = "JSON could not be fully parsed.";
    }
  } else if (ext === "html" || ext === "htm" || mimeType === "text/html") {
    detectedType = "HTML document";
    const scriptTags = (content.match(/<script[\s>]/gi) || []).length;
    const formTags = (content.match(/<form[\s>]/gi) || []).length;
    const linkTags = (content.match(/<link[\s>]/gi) || []).length;
    const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    html = {
      title: titleMatch ? titleMatch[1].trim() : "(no title)",
      scripts: scriptTags,
      forms: formTags,
      links: linkTags,
    };
    howItWorks = `HTML. Title: "${html.title}". ${scriptTags} script(s).`;
  } else if (["js", "jsx", "mjs", "cjs", "ts", "tsx"].includes(ext)) {
    detectedType = ext.startsWith("t") ? "TypeScript module" : "JavaScript module";
    moduleType = detectedType;
    howItWorks = `${detectedType}.`;
  } else if (ext === "py") {
    detectedType = "Python script";
    moduleType = "Python";
    howItWorks = "Python source.";
  } else if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "pdf"].includes(ext)) {
    detectedType = ext === "pdf" ? "PDF document" : "Image file";
    moduleType = ext.toUpperCase();
    howItWorks = `${detectedType} (${mimeType}, ${formatBytes(fileSize)}).`;
    limitations.push("Binary content not inspected beyond MIME/size");
  } else {
    detectedType = `File type (${ext || "no extension"})`;
    moduleType = "Unknown";
    howItWorks = `MIME: ${mimeType}.`;
  }

  if (content) {
    for (const m of content.matchAll(/import\s+.*?from\s+['"]([^'"]+)['"]/g)) {
      connections.push({ type: "import", target: m[1], evidence: `from "${m[1]}"` });
    }
    for (const m of content.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
      connections.push({ type: "require", target: m[1], evidence: `require("${m[1]}")` });
    }
  }

  const seen = new Set<string>();
  const deduped = connections
    .filter((c) => {
      const k = `${c.type}:${c.target}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 20);

  if (!content && !limitations.includes("Binary content not inspected beyond MIME/size")) {
    limitations.push("Binary content not inspected");
  }

  githubHints.push({
    label: "Search GitHub for similar files",
    query: [originalName, moduleType, detectedType].filter(Boolean).join(" "),
    url: `https://github.com/search?q=${encodeURIComponent(originalName)}&type=code`,
  });

  return {
    detectedType,
    moduleType,
    howItWorks,
    connections: deduped,
    html,
    githubHints: githubHints.slice(0, 5),
    engine: "heuristic",
    confidence: "medium",
    limitations,
  };
}

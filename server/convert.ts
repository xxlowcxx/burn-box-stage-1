/**
 * Pure-Node file conversion for Burn Box safe copies.
 * Always writes a NEW safe file; originals in vault stay untouched.
 */

import fs from "fs";
import path from "path";
import type { ConvertTarget } from "@shared/convert";
import { extOf } from "@shared/convert";

export interface ConvertResult {
  outputName: string;
  mimeType: string;
  content: Buffer | string;
}

function mdToHtml(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  html = html
    .split(/\n\n+/)
    .map((block) => {
      if (/^<h[1-3]>/.test(block) || /^<pre>/.test(block)) return block;
      return `<p>${block.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Burn Box convert</title></head><body>\n${html}\n</body></html>\n`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim() + "\n";
}

function htmlToMd(html: string): string {
  let md = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
  md = md.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<\/p>/gi, "\n\n");
  md = md.replace(/<[^>]+>/g, "");
  return md.replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function csvToJson(csv: string): string {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return "[]\n";
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i] ?? "";
    });
    return obj;
  });
  return JSON.stringify(rows, null, 2) + "\n";
}

function jsonToCsv(jsonText: string): string {
  const data = JSON.parse(jsonText);
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) return "";
  const headers = Array.from(
    arr.reduce((set: Set<string>, row: unknown) => {
      if (row && typeof row === "object") {
        Object.keys(row as object).forEach((k) => set.add(k));
      }
      return set;
    }, new Set<string>()),
  );
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...arr.map((row: Record<string, unknown>) =>
      headers.map((h) => escape(row?.[h])).join(","),
    ),
  ];
  return lines.join("\n") + "\n";
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQ = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function baseNameWithoutExt(name: string): string {
  const base = path.basename(name);
  const i = base.lastIndexOf(".");
  return i > 0 ? base.slice(0, i) : base;
}

export function convertFile(
  sourcePath: string,
  originalName: string,
  target: ConvertTarget,
): ConvertResult {
  const ext = extOf(originalName);
  const stem = baseNameWithoutExt(originalName);

  if (target === "base64") {
    const buf = fs.readFileSync(sourcePath);
    return {
      outputName: `${stem}.b64.txt`,
      mimeType: "text/plain",
      content: buf.toString("base64") + "\n",
    };
  }

  if (target === "hex") {
    const buf = fs.readFileSync(sourcePath);
    const hex = buf.toString("hex").match(/.{1,2}/g)?.join(" ") ?? "";
    return {
      outputName: `${stem}.hex.txt`,
      mimeType: "text/plain",
      content: hex + "\n",
    };
  }

  const maxText = 50 * 1024 * 1024;
  const stat = fs.statSync(sourcePath);
  if (stat.size > maxText && ["md", "html", "txt", "json", "csv", "upper", "lower"].includes(target)) {
    throw new Error(`Convert refused: text transforms limited to 50 MB (file is ${stat.size} bytes)`);
  }

  const text = fs.readFileSync(sourcePath, "utf-8");
  const body = text.replace(
    /^\[Burn Box Scan Report\][\s\S]*?--- (?:SANITIZED CONTENT|FILE CONTENT) ---\n/,
    "",
  );

  switch (target) {
    case "html":
      if (ext === "md" || ext === "markdown") {
        return { outputName: `${stem}.html`, mimeType: "text/html", content: mdToHtml(body) };
      }
      throw new Error(`Cannot convert .${ext} to HTML`);
    case "txt":
      if (ext === "html" || ext === "htm") {
        return { outputName: `${stem}.txt`, mimeType: "text/plain", content: htmlToText(body) };
      }
      throw new Error(`Cannot convert .${ext} to txt`);
    case "md":
      if (ext === "html" || ext === "htm") {
        return { outputName: `${stem}.md`, mimeType: "text/markdown", content: htmlToMd(body) };
      }
      if (ext === "txt" || ext === "log") {
        return {
          outputName: `${stem}.md`,
          mimeType: "text/markdown",
          content: "```\n" + body + (body.endsWith("\n") ? "" : "\n") + "```\n",
        };
      }
      throw new Error(`Cannot convert .${ext} to Markdown`);
    case "json":
      if (ext === "csv") {
        return { outputName: `${stem}.json`, mimeType: "application/json", content: csvToJson(body) };
      }
      throw new Error(`Cannot convert .${ext} to JSON`);
    case "csv":
      if (ext === "json") {
        return { outputName: `${stem}.csv`, mimeType: "text/csv", content: jsonToCsv(body) };
      }
      throw new Error(`Cannot convert .${ext} to CSV`);
    case "upper":
      return { outputName: `${stem}.upper.${ext || "txt"}`, mimeType: "text/plain", content: body.toUpperCase() };
    case "lower":
      return { outputName: `${stem}.lower.${ext || "txt"}`, mimeType: "text/plain", content: body.toLowerCase() };
    default:
      throw new Error(`Unsupported convert target: ${target}`);
  }
}

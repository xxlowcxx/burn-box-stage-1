/**
 * Supported conversion matrix (Stage 2).
 * Server implements pure-Node transforms; platforms may shell out to system tools later.
 */

export type ConvertTarget =
  | "txt"
  | "md"
  | "html"
  | "json"
  | "csv"
  | "base64"
  | "hex"
  | "upper"
  | "lower";

export interface ConvertOption {
  from: string[]; // extensions without dot, or "*"
  to: ConvertTarget;
  label: string;
  description: string;
}

export const CONVERT_OPTIONS: ConvertOption[] = [
  {
    from: ["md", "markdown"],
    to: "html",
    label: "Markdown → HTML",
    description: "Lightweight MD to HTML (headings, bold, code, links)",
  },
  {
    from: ["html", "htm"],
    to: "txt",
    label: "HTML → plain text",
    description: "Strip tags and keep readable text",
  },
  {
    from: ["html", "htm"],
    to: "md",
    label: "HTML → Markdown",
    description: "Best-effort HTML to Markdown",
  },
  {
    from: ["json"],
    to: "csv",
    label: "JSON → CSV",
    description: "Array of objects to CSV rows",
  },
  {
    from: ["csv"],
    to: "json",
    label: "CSV → JSON",
    description: "CSV rows to JSON array",
  },
  {
    from: ["*"],
    to: "base64",
    label: "Any → Base64 text",
    description: "Encode file bytes as base64 (.b64.txt)",
  },
  {
    from: ["*"],
    to: "hex",
    label: "Any → Hex dump",
    description: "Hex representation for inspection (.hex.txt)",
  },
  {
    from: ["txt", "md", "csv", "log", "json", "html", "htm"],
    to: "upper",
    label: "Text → UPPERCASE",
    description: "Transform text content to uppercase",
  },
  {
    from: ["txt", "md", "csv", "log", "json", "html", "htm"],
    to: "lower",
    label: "Text → lowercase",
    description: "Transform text content to lowercase",
  },
  {
    from: ["txt", "log"],
    to: "md",
    label: "Text → Markdown",
    description: "Wrap plain text as a Markdown code/pre block",
  },
];

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function optionsForFile(name: string): ConvertOption[] {
  const ext = extOf(name);
  return CONVERT_OPTIONS.filter(
    (o) => o.from.includes("*") || o.from.includes(ext),
  );
}

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import type * as z from "zod/mini";

// Files table - stores metadata for AI-scanned safe copies
export const files = sqliteTable("files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  originalName: text("original_name").notNull(),
  safeName: text("safe_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  safeSize: integer("safe_size").notNull(),
  scanStatus: text("scan_status").notNull().default("scanning"), // scanning | safe | blocked
  scanSummary: text("scan_summary").notNull().default(""),
  threatsDetected: text("threats_detected"), // JSON array of threat strings, null if none
  safeCopyPath: text("safe_copy_path").notNull(),
  createdAt: integer("created_at").notNull().default(Math.floor(Date.now() / 1000)),
  scannedAt: integer("scanned_at"),
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  scannedAt: true,
});

export type InsertFile = z.infer<typeof insertFileSchema>;
export type FileRecord = typeof files.$inferSelect;

// Audit log table - tracks all operations in the drive
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fileId: integer("file_id"),
  action: text("action").notNull(), // upload | scan_start | scan_complete | original_deleted | safe_copy_created | downloaded | viewed | deleted
  detail: text("detail").notNull().default(""),
  timestamp: integer("timestamp").notNull().default(Math.floor(Date.now() / 1000)),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

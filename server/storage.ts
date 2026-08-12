import { files, auditLogs } from '@shared/schema';
import type { FileRecord, AuditLog, InsertFile, InsertAuditLog } from '@shared/schema';
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";
import { migrateStage2Columns } from "./schema-migrate";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
migrateStage2Columns(sqlite);

export const db = drizzle(sqlite);

export interface FileListQuery {
  q?: string;
  folder?: string;
  backend?: string;
  status?: string;
}

export interface IStorage {
  getAllFiles(query?: FileListQuery): Promise<FileRecord[]>;
  getFile(id: number): Promise<FileRecord | undefined>;
  createFile(file: InsertFile): Promise<FileRecord>;
  updateFile(id: number, updates: Partial<InsertFile> & Record<string, unknown>): Promise<FileRecord | undefined>;
  deleteFile(id: number): Promise<void>;
  getAllAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  async getAllFiles(query?: FileListQuery): Promise<FileRecord[]> {
    let rows = db.select().from(files).orderBy(desc(files.createdAt)).all();
    if (query?.folder != null && query.folder !== "") {
      rows = rows.filter((f) => (f.folder || "") === query.folder);
    }
    if (query?.backend) {
      rows = rows.filter((f) => (f.storageBackend || "local") === query.backend);
    }
    if (query?.status) {
      rows = rows.filter((f) => f.scanStatus === query.status);
    }
    if (query?.q) {
      const needle = query.q.toLowerCase();
      rows = rows.filter((f) => {
        const name = (f.displayName || f.originalName || "").toLowerCase();
        const tags = (f.tags || "").toLowerCase();
        const folder = (f.folder || "").toLowerCase();
        return name.includes(needle) || tags.includes(needle) || folder.includes(needle);
      });
    }
    return rows;
  }

  async getFile(id: number): Promise<FileRecord | undefined> {
    return db.select().from(files).where(eq(files.id, id)).get();
  }

  async createFile(insertFile: InsertFile): Promise<FileRecord> {
    return db.insert(files).values(insertFile).returning().get();
  }

  async updateFile(id: number, updates: Partial<InsertFile> & Record<string, unknown>): Promise<FileRecord | undefined> {
    db.update(files).set(updates as Partial<InsertFile>).where(eq(files.id, id)).run();
    return db.select().from(files).where(eq(files.id, id)).get();
  }

  async deleteFile(id: number): Promise<void> {
    db.delete(files).where(eq(files.id, id)).run();
  }

  async getAllAuditLogs(): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp)).all();
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    return db.insert(auditLogs).values(insertLog).returning().get();
  }
}

export const storage = new DatabaseStorage();

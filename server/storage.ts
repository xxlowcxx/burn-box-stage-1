import { files, auditLogs } from '@shared/schema';
import type { FileRecord, AuditLog, InsertFile, InsertAuditLog } from '@shared/schema';
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  // Files
  getAllFiles(): FileRecord[];
  getFile(id: number): FileRecord | undefined;
  createFile(file: InsertFile): FileRecord;
  updateFile(id: number, updates: Partial<InsertFile>): FileRecord | undefined;
  deleteFile(id: number): void;
  // Audit logs
  getAllAuditLogs(): AuditLog[];
  createAuditLog(log: InsertAuditLog): AuditLog;
}

export class DatabaseStorage implements IStorage {
  async getAllFiles(): Promise<FileRecord[]> {
    return db.select().from(files).orderBy(desc(files.createdAt)).all();
  }

  async getFile(id: number): Promise<FileRecord | undefined> {
    return db.select().from(files).where(eq(files.id, id)).get();
  }

  async createFile(insertFile: InsertFile): Promise<FileRecord> {
    return db.insert(files).values(insertFile).returning().get();
  }

  async updateFile(id: number, updates: Partial<InsertFile>): Promise<FileRecord | undefined> {
    db.update(files).set(updates).where(eq(files.id, id)).run();
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

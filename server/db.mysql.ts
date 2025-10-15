import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

// ==========================================
// MYSQL VERSION OF DB CONNECTION
// ==========================================
// File này là phiên bản MySQL của db.ts
// Để sử dụng MySQL:
// 1. Backup file server/db.ts hiện tại
// 2. Copy toàn bộ nội dung file này
// 3. Paste vào server/db.ts
// ==========================================

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const connection = await mysql.createConnection(process.env.DATABASE_URL);
export const db = drizzle(connection, { schema, mode: 'default' });

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
// 4. Cài mysql2: npm install mysql2
// ==========================================

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Tạo connection pool cho MySQL
export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 10, // Số lượng connection tối đa
  waitForConnections: true,
  queueLimit: 0,
});

// Tạo Drizzle instance với connection pool
export const db = drizzle(pool, { schema, mode: 'default' });

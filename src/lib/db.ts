import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Tạo connection pool cho MySQL với cấu hình tối ưu
// Sau khi tối ưu queries (sử dụng enriched endpoints), số connections giảm đáng kể
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 15, // Đủ cho hệ thống đã được tối ưu (giảm từ 25)
  waitForConnections: true,
  queueLimit: 0,
  maxIdle: 5, // Maximum idle connections (giảm từ 10)
  idleTimeout: 60000, // 60 seconds - close idle connections
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Tạo Drizzle instance
export const db = drizzle(pool, { schema, mode: 'default' });

import { defineConfig } from "drizzle-kit";

// ==========================================
// MYSQL VERSION OF DRIZZLE CONFIG
// ==========================================
// File này là phiên bản MySQL của drizzle.config.ts
// Để sử dụng MySQL:
// 1. Backup file drizzle.config.ts hiện tại
// 2. Copy toàn bộ nội dung file này
// 3. Paste vào drizzle.config.ts
// ==========================================

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",  // THAY ĐỔI: "postgresql" → "mysql"
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});

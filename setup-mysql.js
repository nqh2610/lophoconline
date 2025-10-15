#!/usr/bin/env node

/**
 * Script tự động chuyển drizzle.config.ts sang MySQL
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, 'drizzle.config.ts');

try {
  let content = readFileSync(configPath, 'utf8');
  
  // Thay đổi dialect từ postgresql sang mysql
  content = content.replace(
    /dialect:\s*["']postgresql["']/g,
    'dialect: "mysql"'
  );
  
  writeFileSync(configPath, content, 'utf8');
  
  console.log('✅ Đã cấu hình drizzle.config.ts cho MySQL thành công!');
  console.log('📝 Tiếp theo:');
  console.log('   1. Tạo file .env với DATABASE_URL và SESSION_SECRET');
  console.log('   2. Chạy: npm run db:push');
  console.log('   3. Chạy: npm run dev');
} catch (error) {
  console.error('❌ Lỗi:', error.message);
  process.exit(1);
}

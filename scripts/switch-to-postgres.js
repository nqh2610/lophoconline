#!/usr/bin/env node

/**
 * Script tự động chuyển về PostgreSQL
 * Sử dụng: node scripts/switch-to-postgres.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔄 Bắt đầu chuyển về PostgreSQL...\n');

// Kiểm tra backup files
const backupFiles = [
  { from: 'drizzle.config.postgres.backup.ts', to: 'drizzle.config.ts' },
  { from: 'server/db.postgres.backup.ts', to: 'server/db.ts' },
  { from: 'shared/schema.postgres.backup.ts', to: 'shared/schema.ts' },
];

console.log('📦 Khôi phục các file PostgreSQL...');
let hasBackup = true;

backupFiles.forEach(({ from, to }) => {
  const fromPath = path.join(rootDir, from);
  const toPath = path.join(rootDir, to);
  
  if (fs.existsSync(fromPath)) {
    fs.copyFileSync(fromPath, toPath);
    console.log(`  ✅ Restore: ${from} → ${to}`);
  } else {
    console.log(`  ❌ Không tìm thấy backup: ${from}`);
    hasBackup = false;
  }
});

if (!hasBackup) {
  console.log('\n⚠️  Không tìm thấy file backup PostgreSQL!');
  console.log('Vui lòng khôi phục thủ công hoặc tải lại mã nguồn gốc.\n');
  process.exit(1);
}

// Cập nhật package.json
console.log('\n🔧 Cập nhật package.json...');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Xóa mysql2
if (packageJson.dependencies && packageJson.dependencies['mysql2']) {
  delete packageJson.dependencies['mysql2'];
  console.log('  ✅ Đã xóa: mysql2');
}

// Thêm @neondatabase/serverless
if (packageJson.dependencies && !packageJson.dependencies['@neondatabase/serverless']) {
  packageJson.dependencies['@neondatabase/serverless'] = '^0.10.4';
  console.log('  ✅ Đã thêm: @neondatabase/serverless@^0.10.4');
}

// Ghi lại package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('\n✨ Hoàn tất khôi phục PostgreSQL!\n');
console.log('📋 Các bước tiếp theo:');
console.log('  1. Chạy: npm install');
console.log('  2. Cập nhật .env với PostgreSQL connection:');
console.log('     DATABASE_URL=postgresql://user:pass@localhost:5432/lophoc_online');
console.log('  3. Chạy: npm run db:push');
console.log('  4. Chạy: npm run dev\n');

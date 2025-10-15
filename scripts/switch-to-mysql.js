#!/usr/bin/env node

/**
 * Script tự động chuyển đổi từ PostgreSQL sang MySQL
 * Sử dụng: node scripts/switch-to-mysql.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔄 Bắt đầu chuyển đổi sang MySQL...\n');

// Bước 1: Backup các file PostgreSQL
console.log('📦 Bước 1: Backup các file PostgreSQL hiện tại...');
const backupFiles = [
  { from: 'drizzle.config.ts', to: 'drizzle.config.postgres.backup.ts' },
  { from: 'server/db.ts', to: 'server/db.postgres.backup.ts' },
  { from: 'shared/schema.ts', to: 'shared/schema.postgres.backup.ts' },
];

backupFiles.forEach(({ from, to }) => {
  const fromPath = path.join(rootDir, from);
  const toPath = path.join(rootDir, to);
  
  if (fs.existsSync(fromPath)) {
    fs.copyFileSync(fromPath, toPath);
    console.log(`  ✅ Backup: ${from} → ${to}`);
  }
});

console.log('\n📝 Bước 2: Copy file cấu hình MySQL...');
const copyFiles = [
  { from: 'drizzle.config.mysql.ts', to: 'drizzle.config.ts' },
  { from: 'server/db.mysql.ts', to: 'server/db.ts' },
  { from: 'shared/schema.mysql.ts', to: 'shared/schema.ts' },
  { from: '.env.mysql.example', to: '.env.example' },
];

copyFiles.forEach(({ from, to }) => {
  const fromPath = path.join(rootDir, from);
  const toPath = path.join(rootDir, to);
  
  if (fs.existsSync(fromPath)) {
    fs.copyFileSync(fromPath, toPath);
    console.log(`  ✅ Copy: ${from} → ${to}`);
  } else {
    console.log(`  ⚠️  Không tìm thấy: ${from}`);
  }
});

// Bước 3: Cập nhật package.json
console.log('\n🔧 Bước 3: Cập nhật package.json...');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Xóa @neondatabase/serverless
if (packageJson.dependencies && packageJson.dependencies['@neondatabase/serverless']) {
  delete packageJson.dependencies['@neondatabase/serverless'];
  console.log('  ✅ Đã xóa: @neondatabase/serverless');
}

// Thêm mysql2
if (packageJson.dependencies && !packageJson.dependencies['mysql2']) {
  packageJson.dependencies['mysql2'] = '^3.11.0';
  console.log('  ✅ Đã thêm: mysql2@^3.11.0');
}

// Ghi lại package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('\n✨ Hoàn tất chuyển đổi!\n');
console.log('📋 Các bước tiếp theo:');
console.log('  1. Chạy: npm install');
console.log('  2. Tạo database MySQL: CREATE DATABASE lophoc_online;');
console.log('  3. Tạo file .env với MySQL connection:');
console.log('     DATABASE_URL=mysql://root:password@localhost:3306/lophoc_online');
console.log('  4. Chạy: npm run db:push');
console.log('  5. Chạy: npm run dev\n');
console.log('💾 File backup PostgreSQL đã được lưu với đuôi .postgres.backup.ts');
console.log('🔄 Để quay lại PostgreSQL, chạy: node scripts/switch-to-postgres.js\n');

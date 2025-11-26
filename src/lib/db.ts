import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Optimize connection pool based on environment
const isProduction = process.env.NODE_ENV === 'production';

// ✅ PERFORMANCE: Optimized connection pool settings
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  // ✅ CRITICAL: Force UTC timezone for all connections
  timezone: '+00:00',
  // Connection pool settings (scaled for production)
  connectionLimit: isProduction ? 20 : 10, // More connections in production
  waitForConnections: true,
  queueLimit: 0, // Unlimited queue
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // ✅ FASTER: Reduced connection timeout for quicker failures
  connectTimeout: 5000, // 5 seconds (down from 10)
  // Idle connection cleanup
  idleTimeout: 60000, // Close idle connections after 60 seconds
  maxIdle: isProduction ? 10 : 5, // Keep more idle connections in production
  // ✅ PERFORMANCE: Enable multiple statements for batch operations
  multipleStatements: false, // Keep false for security
  // ✅ FASTER: Compress protocol for large result sets
  compress: isProduction, // Enable compression in production
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});

// Tạo Drizzle instance
export const db = drizzle(pool, { schema, mode: 'default' });

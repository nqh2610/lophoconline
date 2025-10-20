import { db } from "./db";
import { sql } from "drizzle-orm";

export interface AuditLogEntry {
  adminId: number;
  adminUsername: string;
  action: string;
  targetUserId?: number;
  targetUsername?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
}

/**
 * Log admin actions for security audit
 * This helps track admin activities for compliance and security
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    // Create audit_logs table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        admin_username VARCHAR(255) NOT NULL,
        action VARCHAR(100) NOT NULL,
        target_user_id INT,
        target_username VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_id (admin_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insert log entry
    await db.execute(sql`
      INSERT INTO audit_logs (
        admin_id,
        admin_username,
        action,
        target_user_id,
        target_username,
        ip_address,
        user_agent,
        details
      ) VALUES (
        ${entry.adminId},
        ${entry.adminUsername},
        ${entry.action},
        ${entry.targetUserId || null},
        ${entry.targetUsername || null},
        ${entry.ipAddress || null},
        ${entry.userAgent || null},
        ${entry.details || null}
      )
    `);
  } catch (error) {
    // Don't throw error - logging should not break the application
    console.error("Failed to log admin action:", error);
  }
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    undefined
  );
}

import { Database } from "bun:sqlite";
import { BaseDatabaseService } from "./base";
import type { UserSession } from "../../types/user";
import { snakeToCamel } from "../../lib/utils";

export class SessionService extends BaseDatabaseService {
  constructor(db: Database) {
    super();
    this.db = db;
  }

  async createSession(
    sessionId: string,
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO user_sessions (id, user_id, refresh_token, expires_at, user_agent, ip_address, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      sessionId,
      userId,
      refreshToken,
      expiresAt.toISOString(),
      userAgent ?? null,
      ipAddress ?? null
    );
  }

  async getSession(sessionId: string): Promise<any> {
    const stmt = this.db.prepare("SELECT * FROM user_sessions WHERE id = ?");
    return stmt.get(sessionId) as any;
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE user_sessions 
      SET last_active_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(sessionId);
  }

  async updateSession(sessionId: string, refreshToken: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE user_sessions 
      SET refresh_token = ?, last_active_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(refreshToken, sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM user_sessions WHERE id = ?");
    stmt.run(sessionId);
  }

  async deleteAllUserSessions(
    userId: string,
    excludeSessionId?: string
  ): Promise<void> {
    if (excludeSessionId) {
      const stmt = this.db.prepare(`
        DELETE FROM user_sessions 
        WHERE user_id = ? AND id != ?
      `);
      stmt.run(userId, excludeSessionId);
    } else {
      const stmt = this.db.prepare(
        "DELETE FROM user_sessions WHERE user_id = ?"
      );
      stmt.run(userId);
    }
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    const stmt = this.db.prepare(`
      SELECT 
        id,
        user_id as userId,
        user_agent as userAgent,
        ip_address as ipAddress,
        created_at as createdAt,
        last_active_at as lastActiveAt,
        expires_at as expiresAt,
        CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 ELSE 0 END as isActive
      FROM user_sessions 
      WHERE user_id = ?
      ORDER BY last_active_at DESC
    `);

    const rows = stmt.all(userId) as any[];
    return rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      lastActiveAt: new Date(row.lastActiveAt),
      expiresAt: new Date(row.expiresAt),
      isActive: Boolean(row.isActive),
    }));
  }

  async createTempSession(
    sessionToken: string,
    userId: string,
    type: "2FA" | "RECOVERY",
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    const expiry = type === "2FA" ? 5 : 60;
    const stmt = this.db.prepare(`
      INSERT INTO temp_sessions (token, user_id, type, user_agent, ip_address, expires_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '+${expiry} minutes'))
    `);

    stmt.run(sessionToken, userId, type, userAgent ?? null, ipAddress ?? null);
  }

  async getTempSession(sessionToken: string): Promise<any> {
    const stmt = this.db.prepare(`
      SELECT * FROM temp_sessions 
      WHERE token = ? AND expires_at > datetime('now')
    `);
    return snakeToCamel(stmt.get(sessionToken) as any);
  }

  async deleteTempSession(sessionToken: string): Promise<void> {
    const stmt = this.db.prepare("DELETE FROM temp_sessions WHERE token = ?");
    stmt.run(sessionToken);
  }
}

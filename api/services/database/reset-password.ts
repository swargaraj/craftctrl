import { Database } from "bun:sqlite";
import { BaseDatabaseService } from "./base";
import type { Notification } from "../../types/user";

export class ResetPasswordService extends BaseDatabaseService {
  constructor(db: Database) {
    super();
    this.db = db;
  }

  async createPasswordResetToken(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

    const stmt = this.db.prepare(`
      INSERT INTO password_reset_tokens (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(token, userId, expiresAt.toISOString());
    return token;
  }

  async getPasswordResetToken(token: string): Promise<any> {
    const stmt = this.db.prepare(`
      SELECT * FROM password_reset_tokens 
      WHERE token = ? AND expires_at > datetime('now') AND used = FALSE
    `);
    return stmt.get(token) as any;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE password_reset_tokens SET used = TRUE WHERE token = ?
    `);
    stmt.run(token);
  }
}

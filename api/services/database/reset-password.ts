import { Database } from "bun:sqlite";
import { BaseDatabaseService } from "./base";
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { config } from "../../config";
import type { User } from "../../types/user";
import { getResetEmailTemplate } from "../../lib/reset-mail-template";
import { AppError } from "../../middlewares/error";
import { logger } from "../../lib/logger";
import { UAParser } from "ua-parser-js";

if (!config.MAILERSEND_API_KEY || !config.SENDER_EMAIL) {
  logger.warn("MAILERSEND_API_KEY or SENDER_EMAIL is not set", 500);
}

const mailerSend = new MailerSend({
  apiKey: config.MAILERSEND_API_KEY || "",
});

export class ResetPasswordService extends BaseDatabaseService {
  constructor(db: Database) {
    super();
    this.db = db;
  }

  async canSendResetEmail(userId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
    SELECT created_at FROM password_reset_tokens 
    WHERE user_id = ? AND created_at > datetime('now', '-5 minutes')
    ORDER BY created_at DESC 
    LIMIT 1
  `);
    const recentEmail = stmt.get(userId) as { created_at: string } | undefined;

    return !recentEmail;
  }

  async createPasswordResetToken(
    user: User,
    frontend: string,
    userAgent: string,
    ipAddress: string
  ): Promise<string> {
    const parser = new UAParser(userAgent);

    const browser = parser.getBrowser();
    const browserName = browser.name + " " + browser.version;
    const os = parser.getOS();
    const osName = os.name + " " + os.version;

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

    const stmt = this.db.prepare(`
      INSERT INTO password_reset_tokens (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(token, user.id, expiresAt.toISOString());

    const resetLink = `${frontend}/change/${token}?server=${
      config.API_URL + config.API_PREFIX
    }`;
    const sentFrom = new Sender(config.SENDER_EMAIL, "CraftCtrl");
    const recipients = [new Recipient(user.email, user.username)];

    const emailParams = new EmailParams()
      .setTo(recipients)
      .setFrom(sentFrom)
      .setSubject("Reset Your Password")
      .setHtml(getResetEmailTemplate(resetLink, ipAddress, browserName, osName))
      .setText(`Reset your password using this link: ${resetLink}`);

    try {
      await mailerSend.email.send(emailParams);
    } catch (error: any) {
      if (error.body.errors) {
        throw new AppError(error.body.message, 500);
      }
    }

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

  async deleteAllPasswordResetTokens(userId: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM password_reset_tokens WHERE user_id = ?
    `);
    stmt.run(userId);
  }
}

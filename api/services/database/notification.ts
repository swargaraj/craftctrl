import { Database } from "bun:sqlite";
import { BaseDatabaseService } from "./base";
import type { Notification } from "../../types/user";

export class NotificationService extends BaseDatabaseService {
  constructor(db: Database) {
    super();
    this.db = db;
  }

  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: "info" | "warning" | "error" | "success" = "info"
  ): Promise<string> {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, userId, title, message, type);
    return id;
  }

  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    const whereClause = unreadOnly
      ? "WHERE user_id = ? AND is_read = 0"
      : "WHERE user_id = ?";
    const stmt = this.db.prepare(`
      SELECT 
        id,
        user_id as userId,
        title,
        message,
        type,
        is_read as isRead,
        created_at as createdAt,
        read_at as readAt
      FROM notifications 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    const params = unreadOnly
      ? [userId, limit, offset]
      : [userId, limit, offset];
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      readAt: row.readAt ? new Date(row.readAt) : undefined,
      isRead: Boolean(row.isRead),
    }));
  }

  async markNotificationAsRead(
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE notifications 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `);

    const result = stmt.run(notificationId, userId);
    return result.changes > 0;
  }

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE notifications 
      SET is_read = 1, read_at = CURRENT_TIMESTAMP 
      WHERE user_id = ? AND is_read = 0
    `);

    const result = stmt.run(userId);
    return result.changes > 0;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `);

    const result = stmt.get(userId) as { count: number };
    return result.count;
  }

  async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    const stmt = this.db.prepare(`
      DELETE FROM notifications 
      WHERE id = ? AND user_id = ?
    `);

    const result = stmt.run(notificationId, userId);
    return result.changes > 0;
  }
}

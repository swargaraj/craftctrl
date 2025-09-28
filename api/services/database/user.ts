import { Database } from "bun:sqlite";
import { BaseDatabaseService } from "./base";
import type { User } from "../../types/user";
import { camelToSnake } from "../../lib/utils";

export class UserService extends BaseDatabaseService {
  constructor(db: Database) {
    super();
    this.db = db;
  }

  async createUser(
    userData: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<User> {
    const existing = this.db.prepare(
      "SELECT * FROM users WHERE username = ? OR email = ?"
    );

    const existingUser = existing.get(userData.username, userData.email) as any;

    if (existingUser) {
      throw new Error("Username or email already exists");
    }
    
    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, email, password_hash, is_super_admin, is_active, change_password)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const id = crypto.randomUUID();
    const now = new Date();

    const result = stmt.run(
      id,
      userData.username,
      userData.email,
      userData.passwordHash,
      userData.isSuperAdmin || false,
      userData.isActive !== false,
      userData.changePassword || true
    );

    if (result.changes === 0) {
      throw new Error("Failed to create user");
    }

    return {
      id,
      ...userData,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const stmt = this.db.prepare("SELECT * FROM users WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapRowToUser(row);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const stmt = this.db.prepare("SELECT * FROM users WHERE username = ?");
    const row = stmt.get(username) as any;
    if (!row) return null;
    return this.mapRowToUser(row);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const allowedFields = [
      "username",
      "email",
      "isActive",
      "passwordHash",
      "twoFactorSecret",
      "twoFactorEnabled",
      "changePassword",
    ];
    const updateFields = Object.keys(updates).filter((key) =>
      allowedFields.includes(key)
    );

    if (updateFields.length === 0) return this.getUserById(id);

    const setClause = updateFields
      .map((field) => `${camelToSnake(field)} = ?`)
      .join(", ");
    const stmt = this.db.prepare(`
      UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);

    const values = updateFields.map((field) => (updates as any)[field]);
    values.push(id);

    const result = stmt.run(...values);
    if (result.changes === 0) return null;

    return this.getUserById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const user = await this.getUserById(id);
    if (user?.isSuperAdmin) {
      throw new Error("Cannot delete super admin user");
    }

    const stmt = this.db.prepare("DELETE FROM users WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async listUsers(): Promise<User[]> {
    const stmt = this.db.prepare(
      "SELECT * FROM users ORDER BY created_at DESC"
    );
    const rows = stmt.all() as any[];
    return rows.map((row) => this.mapRowToUser(row));
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      twoFactorEnabled: row.two_factor_enabled === 1,
      twoFactorSecret: row.two_factor_secret,
      isActive: Boolean(row.is_active),
      isSuperAdmin: Boolean(row.is_super_admin),
      changePassword: Boolean(row.change_password),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

import { Database } from "bun:sqlite";
import { BaseDatabaseService } from "./base";
import type { ListUsersOptions, ListUsersResult, User } from "../../types/user";
import { camelToSnake } from "../../lib/utils";
import { AppError } from "../../middlewares/error";

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
      throw new AppError("Username or email already exists", 409);
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
      false,
      userData.isActive !== false,
      userData.changePassword || false
    );

    if (result.changes === 0) {
      throw new AppError("Failed to create user", 500);
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
      throw new AppError("Cannot delete super admin user", 403);
    }

    const stmt = this.db.prepare("DELETE FROM users WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async listUsers(options: ListUsersOptions = {}): Promise<ListUsersResult> {
    const { page = 1, limit = 20, search } = options;
    const offset = (page - 1) * limit;

    let whereClause = "";
    let params: any[] = [];

    if (search) {
      whereClause = "WHERE username LIKE ? OR email LIKE ?";
      const searchTerm = `%${search}%`;
      params = [searchTerm, searchTerm];
    }

    const countStmt = this.db.prepare(
      `SELECT COUNT(*) as total FROM users ${whereClause}`
    );
    const countResult = countStmt.get(...params) as { total: number };
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    const stmt = this.db.prepare(`
    SELECT * FROM users 
    ${whereClause}
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `);

    const rows = stmt.all(...params, limit, offset) as any[];
    const data = rows.map((row) => this.mapRowToUser(row));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
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

import { BaseDatabaseService } from "./base";
import { ServerService } from "./server";
import { UserService } from "./user";
import { SessionService } from "./session";
import { NotificationService } from "./notification";
import { PermissionService } from "./permission";

import { config } from "../../config";
import { logger } from "../../utils/logger";
import { indexes, mantainance, tables } from "../../lib/sql";
import { defaultPermissions } from "../../lib/perm";
import { ResetPasswordService } from "./reset-password";

export class DatabaseService extends BaseDatabaseService {
  public servers: ServerService;
  public users: UserService;
  public sessions: SessionService;
  public notifications: NotificationService;
  public permissions: PermissionService;
  public recovery: ResetPasswordService;

  constructor() {
    super();
    this.initializeDatabase();

    const db = this.db;

    this.servers = new ServerService(db);
    this.users = new UserService(db);
    this.sessions = new SessionService(db);
    this.notifications = new NotificationService(db);
    this.permissions = new PermissionService(db);
    this.recovery = new ResetPasswordService(db);

    this.createTables();
    this.initializeDefaultData();
    this.runMaintenance();

    logger.info("Database service initialized successfully");
  }

  private createTables(): void {
    this.db.transaction(() => {
      tables.forEach((table) => {
        this.db.run(table.sql);
        logger.debug(`Table '${table.name}' ensured`);
      });

      indexes.forEach((index) => {
        this.db.run(index.sql);
        logger.debug(`Index '${index.name}' ensured`);
      });
    })();
  }

  private initializeDefaultData(): void {
    try {
      const permStmt = this.db.prepare(`
        INSERT OR IGNORE INTO permissions (id, name, resource, action, description)
        VALUES (?, ?, ?, ?, ?)
      `);

      const permissionInserts = defaultPermissions.map((perm) =>
        permStmt.run(
          perm.id,
          perm.name,
          perm.resource,
          perm.action,
          perm.description
        )
      );

      logger.debug(`Inserted ${permissionInserts.length} default permissions`);

      const superAdminRoleId = "super";
      const roleStmt = this.db.prepare(`
        INSERT OR IGNORE INTO roles (id, name, description, is_system_role)
        VALUES (?, ?, ?, ?)
      `);

      roleStmt.run(superAdminRoleId, "super_admin", "Full system access", true);

      const rolePermStmt = this.db.prepare(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
        VALUES (?, ?)
      `);

      const rolePermissionInserts = defaultPermissions
        .map((perm) => {
          try {
            return rolePermStmt.run(superAdminRoleId, perm.id);
          } catch (error) {
            logger.warn(
              `Failed to assign permission ${perm.id} to super admin role: ${error}`
            );
            return null;
          }
        })
        .filter(Boolean);

      logger.debug(
        `Assigned ${rolePermissionInserts.length} permissions to super admin role`
      );

      const adminUserStmt = this.db.prepare(`
        INSERT OR IGNORE INTO users (id, username, email, password_hash, is_super_admin, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      import("bcryptjs")
        .then((bcrypt) => {
          const hashedPassword = bcrypt.hashSync(
            "admin123",
            config.BCRYPT_ROUNDS
          );
          const adminResult = adminUserStmt.run(
            crypto.randomUUID(),
            "admin",
            "admin@email.com",
            hashedPassword,
            true,
            true
          );

          if (adminResult.changes > 0) {
            logger.info("Default admin user created");
          } else {
            logger.debug("Default admin user already exists");
          }
        })
        .catch((error) => {
          logger.error("Failed to create default admin user:", error);
        });

      logger.info("Default data initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize default data:", error);
      throw error;
    }
  }

  async runMaintenance(): Promise<void> {
    try {
      let totalChanges = 0;

      for (const task of mantainance) {
        const stmt = this.db.prepare(task.sql);
        const result = stmt.run();

        if (result.changes > 0) {
          logger.info(
            `${task.taskName}: Cleaned up ${result.changes} expired records from ${task.tableName}`
          );
          totalChanges += result.changes;
        } else {
          logger.debug(
            `${task.taskName}: No expired records found in ${task.tableName}`
          );
        }
      }

      this.db.run("VACUUM");

      if (totalChanges > 0) {
        logger.info(
          `Database maintenance completed: ${totalChanges} total records cleaned up`
        );
      } else {
        logger.info("Database maintenance completed: no expired records found");
      }
    } catch (error) {
      logger.error("Database maintenance failed:", error);
    }
  }

  async getDatabaseStats(): Promise<{
    tableCounts: Record<string, number>;
    totalSize: number;
  }> {
    const tableCounts: Record<string, number> = {};

    const tables = [
      "users",
      "servers",
      "notifications",
      "user_sessions",
      "permissions",
      "roles",
    ];

    for (const table of tables) {
      const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
      const result = stmt.get() as { count: number };
      tableCounts[table] = result.count;
    }

    const dbPath = config.DATABASE_URL.replace("file:", "");
    const stats = (await Bun.file(dbPath).exists())
      ? await Bun.file(dbPath).stat()
      : null;

    return {
      tableCounts,
      totalSize: stats?.size || 0,
    };
  }
}

export const databaseService = new DatabaseService();

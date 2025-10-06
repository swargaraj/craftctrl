import { Database } from "bun:sqlite";
import { BaseDatabaseService } from "./base";
import type { ActionType, ResourceType, Role } from "../../types/user";

export class PermissionService extends BaseDatabaseService {
  constructor(db: Database) {
    super();
    this.db = db;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const userStmt = this.db.prepare(`
        SELECT is_super_admin FROM users WHERE id = ?
    `);

    const user = userStmt.get(userId) as
      | { is_super_admin: boolean }
      | undefined;

    if (user?.is_super_admin) {
      const allPermsStmt = this.db.prepare(`SELECT name FROM permissions`);
      const allPermissions = allPermsStmt.all() as { name: string }[];
      return allPermissions.map((p) => p.name);
    }

    const rolePermStmt = this.db.prepare(`
      SELECT p.name 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `);

    const rolePermissions = rolePermStmt.all(userId) as { name: string }[];

    const serverPermStmt = this.db.prepare(`
      SELECT permissions FROM server_permissions WHERE user_id = ?
    `);

    const serverPermissions = serverPermStmt.all(userId) as {
      permissions: string;
    }[];

    const groupPermStmt = this.db.prepare(`
      SELECT permissions FROM group_permissions WHERE user_id = ?
    `);

    const groupPermissions = groupPermStmt.all(userId) as {
      permissions: string;
    }[];

    const permissions = new Set<string>();

    rolePermissions.forEach((p) => permissions.add(p.name));
    serverPermissions.forEach((sp) => {
      const perms = JSON.parse(sp.permissions) as string[];
      perms.forEach((p) => permissions.add(p));
    });
    groupPermissions.forEach((gp) => {
      const perms = JSON.parse(gp.permissions) as string[];
      perms.forEach((p) => permissions.add(p));
    });

    return Array.from(permissions);
  }

  async getUserServerPermissions(
    userId: string,
    serverId: string
  ): Promise<ActionType[]> {
    const stmt = this.db.prepare(`
      SELECT permissions FROM server_permissions 
      WHERE user_id = ? AND server_id = ?
    `);

    const row = stmt.get(userId, serverId) as
      | { permissions: string }
      | undefined;
    if (!row) return [];

    return JSON.parse(row.permissions);
  }

  async getUserGroupPermissions(
    userId: string,
    groupId: string
  ): Promise<ActionType[]> {
    const stmt = this.db.prepare(`
      SELECT permissions FROM group_permissions 
      WHERE user_id = ? AND group_id = ?
    `);

    const row = stmt.get(userId, groupId) as
      | { permissions: string }
      | undefined;
    if (!row) return [];

    return JSON.parse(row.permissions);
  }

  async getUserServerPermissionsMap(
    userId: string
  ): Promise<Map<string, ActionType[]>> {
    const serverStmt = this.db.prepare(`
      SELECT server_id, permissions FROM server_permissions WHERE user_id = ?
    `);
    const serverRows = serverStmt.all(userId) as {
      server_id: string;
      permissions: string;
    }[];

    const serverPermissions = new Map<string, ActionType[]>();
    serverRows.forEach((row) => {
      serverPermissions.set(row.server_id, JSON.parse(row.permissions));
    });

    return serverPermissions;
  }

  async getUserGroupPermissionsMap(
    userId: string
  ): Promise<Map<string, ActionType[]>> {
    const groupStmt = this.db.prepare(`
      SELECT group_id, permissions FROM group_permissions WHERE user_id = ?
    `);
    const groupRows = groupStmt.all(userId) as {
      group_id: string;
      permissions: string;
    }[];

    const groupPermissions = new Map<string, ActionType[]>();
    groupRows.forEach((row) => {
      groupPermissions.set(row.group_id, JSON.parse(row.permissions));
    });

    return groupPermissions;
  }

  async grantServerPermission(
    userId: string,
    serverId: string,
    permissions: ActionType[],
    grantedBy: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO server_permissions (id, user_id, server_id, permissions, granted_by)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      crypto.randomUUID(),
      userId,
      serverId,
      JSON.stringify(permissions),
      grantedBy
    );
  }

  async revokeServerPermission(
    userId: string,
    serverId: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM server_permissions WHERE user_id = ? AND server_id = ?
    `);

    stmt.run(userId, serverId);
  }

  async grantGroupPermission(
    userId: string,
    groupId: string,
    permissions: ActionType[],
    grantedBy: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO group_permissions (id, user_id, group_id, permissions, granted_by)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      crypto.randomUUID(),
      userId,
      groupId,
      JSON.stringify(permissions),
      grantedBy
    );
  }

  async revokeGroupPermission(userId: string, groupId: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM group_permissions WHERE user_id = ? AND group_id = ?
    `);

    stmt.run(userId, groupId);
  }

  async addUserToGroup(
    userId: string,
    groupId: string,
    addedBy: string,
    permissions: ActionType[] = []
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO group_members (id, user_id, group_id, added_by, permissions)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      crypto.randomUUID(),
      userId,
      groupId,
      addedBy,
      JSON.stringify(permissions)
    );
  }

  async removeUserFromGroup(userId: string, groupId: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM group_members WHERE user_id = ? AND group_id = ?
    `);

    stmt.run(userId, groupId);
  }

  async updateUserGroupPermissions(
    userId: string,
    groupId: string,
    permissions: ActionType[]
  ): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE group_members SET permissions = ? 
      WHERE user_id = ? AND group_id = ?
    `);

    stmt.run(JSON.stringify(permissions), userId, groupId);
  }

  async createRole(
    name: string,
    description: string,
    permissionIds: string[]
  ): Promise<Role> {
    const stmt = this.db.prepare(`
      INSERT INTO roles (id, name, description) VALUES (?, ?, ?)
    `);

    const roleId = crypto.randomUUID();
    stmt.run(roleId, name, description);

    const permStmt = this.db.prepare(`
      INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)
    `);

    permissionIds.forEach((permId) => {
      permStmt.run(roleId, permId);
    });

    return this.getRole(roleId) as Promise<Role>;
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO user_roles (id, user_id, role_id, assigned_by) VALUES (?, ?, ?, ?)
    `);

    stmt.run(crypto.randomUUID(), userId, roleId, assignedBy);
  }

  async getRole(roleId: string): Promise<Role | null> {
    const stmt = this.db.prepare("SELECT * FROM roles WHERE id = ?");
    const row = stmt.get(roleId) as any;

    if (!row) return null;

    const permStmt = this.db.prepare(`
      SELECT p.* FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `);

    const permissions = permStmt.all(roleId) as any[];

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isSystemRole: Boolean(row.is_system_role),
      permissions: permissions.map((p) => ({
        id: p.id,
        name: p.name,
        resource: p.resource as ResourceType,
        action: p.action as ActionType,
        description: p.description,
      })),
      createdAt: new Date(row.created_at),
    };
  }
}

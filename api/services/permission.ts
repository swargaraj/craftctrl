import { databaseService } from "./database";
import type { ActionType, Role } from "../types/user";

export class PermissionService {
  async checkPermission(
    userId: string,
    permission: string,
    resourceId?: string
  ): Promise<boolean> {
    const user = await databaseService.users.getUserById(userId);
    if (!user) return false;

    if (user.isSuperAdmin) return true;

    const userPermissions =
      await databaseService.permissions.getUserPermissions(userId);

    if (userPermissions.includes(permission)) {
      return true;
    }

    if (resourceId) {
      if (permission.startsWith("server:")) {
        const serverPermissions =
          await databaseService.permissions.getUserServerPermissions(
            userId,
            resourceId
          );
        const action = permission.split(":")[1] as ActionType;
        return serverPermissions.includes(action);
      }

      if (permission.startsWith("group:")) {
        const groupPermissions =
          await databaseService.permissions.getUserGroupPermissions(
            userId,
            resourceId
          );
        const action = permission.split(":")[1] as ActionType;
        return groupPermissions.includes(action);
      }
    }

    return false;
  }

  async grantServerPermission(
    userId: string,
    serverId: string,
    permissions: ActionType[],
    grantedBy: string
  ): Promise<void> {
    await databaseService.permissions.grantServerPermission(
      userId,
      serverId,
      permissions,
      grantedBy
    );
  }

  async revokeServerPermission(
    userId: string,
    serverId: string
  ): Promise<void> {
    await databaseService.permissions.revokeServerPermission(userId, serverId);
  }

  async grantGroupPermission(
    userId: string,
    groupId: string,
    permissions: ActionType[],
    grantedBy: string
  ): Promise<void> {
    await databaseService.permissions.grantGroupPermission(
      userId,
      groupId,
      permissions,
      grantedBy
    );
  }

  async revokeGroupPermission(userId: string, groupId: string): Promise<void> {
    await databaseService.permissions.revokeGroupPermission(userId, groupId);
  }

  async getUserEffectivePermissions(userId: string): Promise<{
    global: string[];
    servers: Map<string, ActionType[]>;
    groups: Map<string, ActionType[]>;
  }> {
    const globalPermissions =
      await databaseService.permissions.getUserPermissions(userId);

    const serverPermissions =
      await databaseService.permissions.getUserServerPermissionsMap(userId);
    const groupPermissions =
      await databaseService.permissions.getUserGroupPermissionsMap(userId);

    return {
      global: globalPermissions,
      servers: serverPermissions,
      groups: groupPermissions,
    };
  }

  async canUserAccessServer(
    userId: string,
    serverId: string,
    action: ActionType
  ): Promise<boolean> {
    const user = await databaseService.users.getUserById(userId);
    if (!user) return false;

    if (user.isSuperAdmin) return true;

    const globalPermission = `server:${action}`;
    const userPermissions =
      await databaseService.permissions.getUserPermissions(userId);
    if (userPermissions.includes(globalPermission)) {
      return true;
    }

    const serverPermissions =
      await databaseService.permissions.getUserServerPermissions(
        userId,
        serverId
      );
    return serverPermissions.includes(action);
  }

  async canUserAccessGroup(
    userId: string,
    groupId: string,
    action: ActionType
  ): Promise<boolean> {
    const user = await databaseService.users.getUserById(userId);
    if (!user) return false;

    if (user.isSuperAdmin) return true;

    const globalPermission = `group:${action}`;
    const userPermissions =
      await databaseService.permissions.getUserPermissions(userId);
    if (userPermissions.includes(globalPermission)) {
      return true;
    }

    const groupPermissions =
      await databaseService.permissions.getUserGroupPermissions(
        userId,
        groupId
      );
    return groupPermissions.includes(action);
  }

  async createRole(
    name: string,
    description: string,
    permissionIds: string[]
  ): Promise<Role> {
    return await databaseService.permissions.createRole(
      name,
      description,
      permissionIds
    );
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string
  ): Promise<void> {
    await databaseService.permissions.assignRoleToUser(
      userId,
      roleId,
      assignedBy
    );
  }

  async getRole(roleId: string): Promise<Role | null> {
    return await databaseService.permissions.getRole(roleId);
  }

  async addUserToGroup(
    userId: string,
    groupId: string,
    addedBy: string,
    permissions?: ActionType[]
  ): Promise<void> {
    await databaseService.permissions.addUserToGroup(
      userId,
      groupId,
      addedBy,
      permissions
    );
  }

  async removeUserFromGroup(userId: string, groupId: string): Promise<void> {
    await databaseService.permissions.removeUserFromGroup(userId, groupId);
  }

  async updateUserGroupPermissions(
    userId: string,
    groupId: string,
    permissions: ActionType[]
  ): Promise<void> {
    await databaseService.permissions.updateUserGroupPermissions(
      userId,
      groupId,
      permissions
    );
  }
}

export const permissionService = new PermissionService();

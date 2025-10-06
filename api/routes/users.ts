import type { FastifyPluginAsync } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";

import { requireAuth, requirePermission } from "../middlewares/auth";
import { AppError, errorSchema, schemaHeaders } from "../middlewares/error";
import { sanitizeUser } from "../lib/utils";

import { databaseService } from "../services/database";
import { permissionService } from "../services/permission";

const userRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get(
    "/",
    {
      preHandler: requirePermission("user:read"),
      schema: {
        tags: ["User Management"],
        summary: "List Users",
        description: `Retrieve a paginated list of all users in the system.

> Requires \`user:read\` permission`,
        headers: schemaHeaders,
        querystring: Type.Object({
          page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
          limit: Type.Optional(
            Type.Number({ minimum: 1, maximum: 100, default: 20 })
          ),
          search: Type.Optional(Type.String({ minLength: 1 })),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Array(
              Type.Object({
                id: Type.String({ format: "uuid" }),
                username: Type.String(),
                email: Type.String({ format: "email" }),
                isActive: Type.Boolean(),
                isSuperAdmin: Type.Boolean(),
                changePassword: Type.Boolean(),
                twoFactorEnabled: Type.Boolean(),
                createdAt: Type.String({ format: "date-time" }),
              })
            ),
            pagination: Type.Object({
              page: Type.Number(),
              limit: Type.Number(),
              total: Type.Number(),
              totalPages: Type.Number(),
              hasNext: Type.Boolean(),
              hasPrev: Type.Boolean(),
            }),
          }),
          ...errorSchema,
          403: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "Insufficient permissions",
            }
          ),
        },
      },
    },
    async (request) => {
      const { page = 1, limit = 20, search } = request.query;

      const result = await databaseService.users.listUsers({
        page,
        limit,
        search,
      });

      const sanitizedUsers = await Promise.all(
        result.data.map((user) => sanitizeUser(user))
      );

      return {
        success: true,
        data: sanitizedUsers,
        pagination: result.pagination,
      };
    }
  );

  server.post(
    "/",
    {
      preHandler: requirePermission("user:create"),
      schema: {
        tags: ["User Management"],
        summary: "Create User",
        description: `Create a new user account in the system.

> Requires \`user:create\` permission`,
        headers: schemaHeaders,
        body: Type.Object({
          username: Type.String({ minLength: 3, pattern: "^[a-zA-Z0-9]+$" }),
          email: Type.String({ format: "email" }),
          password: Type.String({ minLength: 6 }),
          changePassword: Type.Optional(Type.Boolean()),
        }),
        response: {
          201: Type.Object(
            {
              success: Type.Boolean(),
              data: Type.Object({
                id: Type.String({ format: "uuid" }),
                username: Type.String(),
                email: Type.String({ format: "email" }),
                isActive: Type.Boolean(),
                isSuperAdmin: Type.Boolean(),
                createdAt: Type.String({ format: "date-time" }),
              }),
            },
            {
              description: "User created successfully",
            }
          ),
          ...errorSchema,
          400: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "Invalid request body",
            }
          ),
          403: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "Insufficient permissions",
            }
          ),
          409: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "Username or email already exists",
            }
          ),
        },
      },
    },
    async (request, reply) => {
      const bcrypt = require("bcryptjs");
      const passwordHash = await bcrypt.hash(request.body.password, 12);

      const user = await databaseService.users.createUser({
        username: request.body.username!,
        email: request.body.email!,
        passwordHash,
        twoFactorEnabled: false,
        changePassword: request.body.changePassword || false,
        isSuperAdmin: false,
        isActive: true,
      });

      reply.code(201);
      return {
        success: true,
        data: sanitizeUser(user),
      };
    }
  );

  server.put(
    "/:id",
    {
      preHandler: requirePermission("user:update"),
      schema: {
        tags: ["User Management"],
        summary: "Update User",
        description: `Update an existing user's information.

> Requires \`user:update\` permission`,
        headers: schemaHeaders,
        params: Type.Object({
          id: Type.String({ format: "uuid", description: "User ID" }),
        }),
        body: Type.Object({
          username: Type.Optional(Type.String({ minLength: 3 })),
          email: Type.Optional(Type.String({ format: "email" })),
          isActive: Type.Optional(Type.Boolean()),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              id: Type.String({ format: "uuid" }),
              username: Type.String(),
              email: Type.String({ format: "email" }),
              isActive: Type.Boolean(),
              isSuperAdmin: Type.Boolean(),
              changePassword: Type.Boolean(),
              twoFactorEnabled: Type.Boolean(),
              createdAt: Type.String({ format: "date-time" }),
            }),
          }),
          ...errorSchema,
          403: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "Insufficient permissions",
            }
          ),
          404: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "User not found",
            }
          ),
        },
      },
    },
    async (request) => {
      const { id } = request.params;

      const targetUser = await databaseService.users.getUserById(id!);
      if (!targetUser) {
        throw new AppError("User not found", 404);
      }

      if (targetUser.isSuperAdmin && !request.user!.isSuperAdmin) {
        throw new AppError("Cannot modify super admin user", 403);
      }

      const updatedUser = await databaseService.users.updateUser(
        id!,
        request.body
      );
      if (!updatedUser) {
        throw new AppError("Failed to update user", 500);
      }

      return {
        success: true,
        data: sanitizeUser(updatedUser),
      };
    }
  );

  server.delete(
    "/:id",
    {
      preHandler: requirePermission("user:delete"),
      schema: {
        tags: ["User Management"],
        summary: "Delete User",
        description: `Permanently delete a user account from the system.

> Requires \`user:delete\` permission`,
        headers: schemaHeaders,
        params: Type.Object({
          id: Type.String({ format: "uuid", description: "User ID" }),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          ...errorSchema,
          400: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "Cannot delete your own account",
            }
          ),
          403: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
          404: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
        },
      },
    },
    async (request) => {
      const { id } = request.params;

      if (id === request.user!.userId) {
        throw new AppError("Cannot delete your own account", 400);
      }

      const targetUser = await databaseService.users.getUserById(id!);
      if (!targetUser) {
        throw new AppError("User not found", 404);
      }

      if (targetUser.isSuperAdmin && !request.user!.isSuperAdmin) {
        throw new AppError("Cannot delete super admin user", 403);
      }

      await databaseService.users.deleteUser(id!);

      return {
        success: true,
        message: "User deleted successfully",
      };
    }
  );

  server.post(
    "/:id/password-reset",
    {
      preHandler: requirePermission("user:update"),
      schema: {
        tags: ["User Status Management"],
        summary: "Request Password Reset",
        description: `Force a password reset for a user account.

> Requires \`user:update\` permission`,
        headers: schemaHeaders,
        params: Type.Object({
          id: Type.String({ format: "uuid", description: "User ID" }),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
            data: Type.Object({
              id: Type.String({ format: "uuid" }),
              username: Type.String(),
              email: Type.String({ format: "email" }),
              isActive: Type.Boolean(),
              isSuperAdmin: Type.Boolean(),
              changePassword: Type.Boolean(),
              twoFactorEnabled: Type.Boolean(),
              createdAt: Type.String({ format: "date-time" }),
            }),
          }),
          ...errorSchema,
          403: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "Insufficient permissions",
            }
          ),
          404: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "User not found",
            }
          ),
        },
      },
    },
    async (request) => {
      const { id } = request.params;

      const updatedUser = await databaseService.users.updateUser(id!, {
        changePassword: true,
      });

      if (!updatedUser) {
        throw new AppError("Failed to request password reset", 500);
      }

      await databaseService.sessions.deleteAllUserSessions(id!);

      return {
        success: true,
        message: "Password reset requested successfully",
        data: sanitizeUser(updatedUser),
      };
    }
  );

  server.post(
    "/:id/activate",
    {
      preHandler: requirePermission("user:update"),
      schema: {
        tags: ["User Status Management"],
        summary: "Activate User",
        description: `Activate a deactivated user account.

> Requires \`user:update\` permission`,
        headers: schemaHeaders,
        params: Type.Object({
          id: Type.String({ format: "uuid", description: "User ID" }),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
            data: Type.Object({
              id: Type.String({ format: "uuid" }),
              username: Type.String(),
              email: Type.String({ format: "email" }),
              isActive: Type.Boolean(),
              isSuperAdmin: Type.Boolean(),
              changePassword: Type.Boolean(),
              twoFactorEnabled: Type.Boolean(),
              createdAt: Type.String({ format: "date-time" }),
            }),
          }),
          ...errorSchema,
          403: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description:
                "Insufficient permissions or Cannot activate/deactivate super admin user",
            }
          ),
          404: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "User not found",
            }
          ),
        },
      },
    },
    async (request) => {
      const { id } = request.params;

      const targetUser = await databaseService.users.getUserById(id!);
      if (!targetUser) {
        throw new AppError("User not found", 404);
      }

      if (targetUser.isSuperAdmin) {
        throw new AppError("Cannot activate/deactivate super admin user", 403);
      }

      const updatedUser = await databaseService.users.updateUser(id!, {
        isActive: true,
      });

      if (!updatedUser) {
        throw new AppError("Failed to activate user", 500);
      }

      return {
        success: true,
        message: "User activated successfully",
        data: sanitizeUser(updatedUser),
      };
    }
  );

  server.post(
    "/:id/deactivate",
    {
      preHandler: requirePermission("user:update"),
      schema: {
        tags: ["User Status Management"],
        summary: "Deactivate User",
        description: `Deactivate an active user account.

> Requires \`user:update\` permission`,
        headers: schemaHeaders,
        params: Type.Object({
          id: Type.String({ format: "uuid", description: "User ID" }),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
            data: Type.Object({
              id: Type.String({ format: "uuid" }),
              username: Type.String(),
              email: Type.String({ format: "email" }),
              isActive: Type.Boolean(),
              isSuperAdmin: Type.Boolean(),
              changePassword: Type.Boolean(),
              twoFactorEnabled: Type.Boolean(),
              createdAt: Type.String({ format: "date-time" }),
            }),
          }),
          ...errorSchema,
          403: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description:
                "Insufficient permissions or Cannot activate/deactivate super admin user",
            }
          ),
          404: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "User not found",
            }
          ),
        },
      },
    },
    async (request) => {
      const { id } = request.params;

      const targetUser = await databaseService.users.getUserById(id!);
      if (!targetUser) {
        throw new AppError("User not found", 404);
      }

      if (targetUser.isSuperAdmin) {
        throw new AppError("Cannot activate/deactivate super admin user", 403);
      }

      const updatedUser = await databaseService.users.updateUser(id!, {
        isActive: false,
      });

      if (!updatedUser) {
        throw new AppError("Failed to deactivate user", 500);
      }

      await databaseService.sessions.deleteAllUserSessions(id!);

      return {
        success: true,
        message: "User deactivated successfully",
        data: sanitizeUser(updatedUser),
      };
    }
  );

  server.post(
    "/:id/server-permissions/:serverId",
    {
      preHandler: [requireAuth(), requirePermission("server:update")],
      schema: {
        tags: ["Server Permissions Management"],
        summary: "Grant Server Permissions",
        description: `Grant specific server permissions to a user.

> Requires \`server:update\` permission`,
        headers: schemaHeaders,
        params: Type.Object({
          id: Type.String({ format: "uuid", description: "User ID" }),
          serverId: Type.String({ format: "uuid", description: "Server ID" }),
        }),
        body: Type.Object({
          permissions: Type.Array(
            Type.Union([
              Type.Literal("start"),
              Type.Literal("stop"),
              Type.Literal("restart"),
              Type.Literal("console"),
              Type.Literal("logs"),
              Type.Literal("read"),
              Type.Literal("update"),
            ])
          ),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          ...errorSchema,
          403: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "Cannot grant permissions you don't have yourself",
            }
          ),
          404: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "User or server not found",
            }
          ),
        },
      },
    },
    async (request) => {
      const { id: userId, serverId } = request.params;

      await permissionService.grantServerPermission(
        userId!,
        serverId!,
        request.body.permissions!,
        request.user!.userId
      );

      return {
        success: true,
        message: "Permissions granted successfully",
      };
    }
  );

  server.delete(
    "/:id/server-permissions/:serverId",
    {
      preHandler: [requireAuth(), requirePermission("server:update")],
      schema: {
        tags: ["Server Permissions Management"],
        summary: "Revoke Server Permissions",
        description: `Revoke all server permissions from a user.

> Requires \`server:update\` permission`,
        headers: schemaHeaders,
        params: Type.Object({
          id: Type.String({ format: "uuid", description: "User ID" }),
          serverId: Type.String({ format: "uuid", description: "Server ID" }),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          ...errorSchema,
          403: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "Cannot revoke permissions you don't have yourself",
            }
          ),
          404: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            {
              description: "User or server not found",
            }
          ),
        },
      },
    },
    async (request) => {
      const { id: userId, serverId } = request.params;

      await permissionService.revokeServerPermission(userId!, serverId!);

      return {
        success: true,
        message: "Permissions revoked successfully",
      };
    }
  );
};

export default userRoutes;

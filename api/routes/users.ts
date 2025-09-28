import type { FastifyPluginAsync } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";

import { requireAuth, requirePermission } from "../middlewares/auth";
import { AppError } from "../middlewares/error";
import { sanitizeUser } from "../lib/utils";

import { databaseService } from "../services/database";
import { permissionService } from "../services/permission";

const userRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get(
    "/users",
    {
      preHandler: requirePermission("user:read"),
      schema: {
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Array(
              Type.Object({
                id: Type.String(),
                username: Type.String(),
                email: Type.String({ format: "email" }),
                isActive: Type.Boolean(),
                isSuperAdmin: Type.Boolean(),
                changePassword: Type.Boolean(),
                twoFactorEnabled: Type.Boolean(),
                createdAt: Type.String(),
              })
            ),
          }),
        },
      },
    },
    async () => {
      const users = await databaseService.users.listUsers();
      const sanitizedUsers = await Promise.all(
        users.map((user) => sanitizeUser(user))
      );

      return {
        success: true,
        data: sanitizedUsers,
      };
    }
  );

  server.post(
    "/users",
    {
      preHandler: requirePermission("user:create"),
      schema: {
        body: Type.Object({
          username: Type.String({ minLength: 3 }),
          email: Type.String({ format: "email" }),
          password: Type.String({ minLength: 6 }),
          isSuperAdmin: Type.Optional(Type.Boolean()),
        }),
        response: {
          201: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              id: Type.String(),
              username: Type.String(),
              email: Type.String(),
              isActive: Type.Boolean(),
              isSuperAdmin: Type.Boolean(),
              createdAt: Type.String(),
            }),
          }),
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
        changePassword: true,
        twoFactorEnabled: false,
        isSuperAdmin: request.body.isSuperAdmin || false,
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
    "/users/:id",
    {
      preHandler: requirePermission("user:update"),
      schema: {
        params: Type.Object({
          id: Type.String(),
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
              id: Type.String(),
              username: Type.String(),
              email: Type.String(),
              isActive: Type.Boolean(),
              isSuperAdmin: Type.Boolean(),
              changePassword: Type.Boolean(),
              twoFactorEnabled: Type.Boolean(),
              createdAt: Type.String(),
            }),
          }),
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
    "/users/:id",
    {
      preHandler: requirePermission("user:delete"),
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
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
    "/users/:id/server-permissions/:serverId",
    {
      preHandler: [requireAuth(), requirePermission("server:update")],
      schema: {
        params: Type.Object({
          id: Type.String(),
          serverId: Type.String(),
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
        },
      },
    },
    async (request, reply) => {
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
    "/users/:id/server-permissions/:serverId",
    {
      preHandler: [requireAuth(), requirePermission("server:update")],
      schema: {
        params: Type.Object({
          id: Type.String(),
          serverId: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
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

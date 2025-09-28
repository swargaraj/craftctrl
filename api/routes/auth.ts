import type { FastifyPluginAsync } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";

import { requireAuth } from "../middlewares/auth";
import type {
  AuthResponse,
  LoginRequest,
  Verify2FARequest,
} from "../types/user";

import { authService } from "../services/auth";
import { databaseService } from "../services/database";
import { twoFactorService } from "../services/twoFactorService";
import { sanitizeUser } from "../lib/utils";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.post(
    "/auth/login",
    {
      schema: {
        body: Type.Object({
          username: Type.String(),
          password: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              requires2FA: Type.Optional(Type.Boolean()),
              requiresPasswordChange: Type.Optional(Type.Boolean()),
              sessionToken: Type.Optional(Type.String()),
              accessToken: Type.Optional(Type.String()),
              refreshToken: Type.Optional(Type.String()),
              user: Type.Optional(
                Type.Object({
                  id: Type.String(),
                  username: Type.String(),
                  email: Type.String(),
                  twoFactorEnabled: Type.Boolean(),
                  isActive: Type.Boolean(),
                  isSuperAdmin: Type.Boolean(),
                  createdAt: Type.String(),
                  updatedAt: Type.String(),
                })
              ),
              permissions: Type.Optional(Type.Array(Type.String())),
            }),
          }),
          401: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
        },
      },
    },
    async (request) => {
      const userAgent = request.headers["user-agent"];
      const ipAddress = request.ip;

      const result = await authService.login(
        request.body as LoginRequest,
        userAgent,
        ipAddress
      );

      if ("requires2FA" in result || "requiresPasswordChange" in result) {
        return {
          success: true,
          data: {
            requires2FA: result.requires2FA,
            requiresPasswordChange: result.requiresPasswordChange,
            sessionToken: result.sessionToken,
          },
        };
      } else {
        const authResult = result as AuthResponse;

        return {
          success: true,
          data: authResult,
        };
      }
    }
  );

  server.post(
    "/auth/forgot-password",
    {
      schema: {
        body: Type.Object({
          username: Type.String(),
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
      await authService.requestPasswordReset(request.body.username!);

      return {
        success: true,
        message: "If the user exists, a password reset link has been sent",
      };
    }
  );

  server.post(
    "/auth/reset-password",
    {
      schema: {
        body: Type.Object({
          token: Type.String(),
          newPassword: Type.String({ minLength: 6 }),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          400: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
        },
      },
    },
    async (request) => {
      await authService.resetPassword(
        request.body.token!,
        request.body.newPassword!
      );

      return {
        success: true,
        message: "Password reset successfully",
      };
    }
  );

  server.post(
    "/auth/2fa/verify",
    {
      schema: {
        body: Type.Object({
          totpCode: Type.String(),
          sessionToken: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              accessToken: Type.String(),
              refreshToken: Type.String(),
              user: Type.Object({
                id: Type.String(),
                username: Type.String(),
                email: Type.String(),
                twoFactorEnabled: Type.Boolean(),
                isActive: Type.Boolean(),
                isSuperAdmin: Type.Boolean(),
                createdAt: Type.String(),
                updatedAt: Type.String(),
              }),
              permissions: Type.Array(Type.String()),
            }),
          }),
          401: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
        },
      },
    },
    async (request) => {
      const userAgent = request.headers["user-agent"];
      const ipAddress = request.ip;

      const authData = await authService.verify2FA(
        request.body as Verify2FARequest,
        userAgent,
        ipAddress
      );

      return {
        success: true,
        data: authData,
      };
    }
  );

  server.post(
    "/auth/2fa/setup",
    {
      preHandler: requireAuth(),
      schema: {
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              secret: Type.String(),
            }),
          }),
        },
      },
    },
    async (request) => {
      const result = await twoFactorService.setup2FA(request.user!.userId);
      return {
        success: true,
        data: result,
      };
    }
  );

  server.post(
    "/auth/2fa/enable",
    {
      preHandler: requireAuth(),
      schema: {
        body: Type.Object({
          code: Type.String(),
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
      await twoFactorService.enable2FA(
        request.user!.userId,
        request.body.code!
      );
      return {
        success: true,
        message: "2FA enabled successfully",
      };
    }
  );

  server.post(
    "/auth/2fa/disable",
    {
      preHandler: requireAuth(),
      schema: {
        body: Type.Object({
          code: Type.String(),
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
      await twoFactorService.disable2FA(
        request.user!.userId,
        request.body.code!
      );
      return {
        success: true,
        message: "2FA disabled successfully",
      };
    }
  );

  server.post(
    "/auth/2fa/standalone-verify",
    {
      preHandler: requireAuth(),
      schema: {
        body: Type.Object({
          code: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            valid: Type.Boolean(),
          }),
        },
      },
    },
    async (request) => {
      const isValid = await twoFactorService.verify2FA(
        request.user!.userId,
        request.body.code!
      );
      return {
        success: true,
        valid: isValid,
      };
    }
  );

  server.delete(
    "/auth/2fa/remove",
    {
      preHandler: requireAuth(),
      schema: {
        body: Type.Object({
          code: Type.String(),
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
      await twoFactorService.remove2FA(
        request.user!.userId,
        request.body.code!
      );
      return {
        success: true,
        message: "2FA removed successfully",
      };
    }
  );

  server.post(
    "/auth/refresh",
    {
      schema: {
        body: Type.Object({
          refreshToken: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              accessToken: Type.String(),
              refreshToken: Type.String(),
            }),
          }),
          401: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
        },
      },
    },
    async (request) => {
      const tokens = await authService.refreshToken(request.body.refreshToken!);

      return {
        success: true,
        data: tokens,
      };
    }
  );

  server.post(
    "/auth/logout",
    {
      preHandler: requireAuth(),
      schema: {
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request) => {
      const sessionId = request.user!.sessionId;
      await authService.logout(sessionId);

      return {
        success: true,
        message: "Logged out successfully",
      };
    }
  );

  server.post(
    "/auth/logout-all",
    {
      preHandler: requireAuth(),
      schema: {
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
      },
    },
    async (request) => {
      await authService.logoutAllSessions(
        request.user!.userId,
        request.user!.sessionId
      );

      return {
        success: true,
        message: "All other sessions logged out successfully",
      };
    }
  );

  server.get(
    "/auth/sessions",
    {
      preHandler: requireAuth(),
      schema: {
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Array(
              Type.Object({
                id: Type.String(),
                userAgent: Type.Optional(Type.String()),
                ipAddress: Type.Optional(Type.String()),
                createdAt: Type.String(),
                lastActiveAt: Type.String(),
                isActive: Type.Boolean(),
                isCurrent: Type.Boolean(),
              })
            ),
          }),
        },
      },
    },
    async (request) => {
      const sessions = await authService.getUserSessions(request.user!.userId);

      const sessionData = sessions.map((session) => ({
        id: session.id,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt.toISOString(),
        lastActiveAt: session.lastActiveAt.toISOString(),
        isActive: session.isActive,
        isCurrent: session.id === request.user!.sessionId,
      }));

      return {
        success: true,
        data: sessionData,
      };
    }
  );

  server.delete(
    "/auth/sessions/:sessionId",
    {
      preHandler: requireAuth(),
      schema: {
        params: Type.Object({
          sessionId: Type.String(),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          404: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
          400: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { sessionId } = request.params;

      if (sessionId === request.user!.sessionId) {
        reply.code(400).send({
          success: false,
          error: "Cannot revoke current session",
        });
      }

      const revoked = await authService.revokeSession(
        sessionId!,
        request.user!.userId
      );
      if (!revoked) {
        return reply
          .code(404)
          .send({ success: false, error: "Session not found" });
      }

      return {
        success: true,
        message: "Session revoked successfully",
      };
    }
  );

  server.get(
    "/auth/me",
    {
      preHandler: requireAuth(),
      schema: {
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              user: Type.Object({
                id: Type.String(),
                username: Type.String(),
                email: Type.String(),
                isActive: Type.Boolean(),
                isSuperAdmin: Type.Boolean(),
                createdAt: Type.String(),
                updatedAt: Type.String(),
              }),
              permissions: Type.Array(Type.String()),
            }),
          }),
          404: Type.Object({
            success: Type.Boolean(),
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const user = await databaseService.users.getUserById(
        request.user!.userId
      );

      if (!user)
        return reply
          .code(404)
          .send({ success: false, error: "User not found" });

      const permissions = await databaseService.permissions.getUserPermissions(
        request.user!.userId
      );

      return {
        success: true,
        data: {
          user: sanitizeUser(user),
          permissions,
        },
      };
    }
  );
};

export default authRoutes;

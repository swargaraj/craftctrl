import type { FastifyPluginAsync } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";

import { requireAuth } from "../middlewares/auth";
import type { LoginRequest, Verify2FARequest } from "../types/user";

import { authService } from "../services/auth";
import { databaseService } from "../services/database";
import { twoFactorService } from "../services/twoFactorService";
import { AppError, errorSchema, schemaHeaders } from "../middlewares/error";
import { sanitizeUser } from "../lib/utils";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.post(
    "/login",
    {
      schema: {
        tags: ["Session Management"],
        summary: "User Login",
        description: `Authenticate a user with username and password.

### Flow
1. **Basic Authentication** - Validate username/password
2. **2FA Check** - If 2FA is enabled, returns \`requires2FA: true\` with \`sessionToken: XXX\`
3. **Password Change** - If password change is required, returns \`requiresPasswordChange: true\`
4. **Success** - Returns access tokens and user data

### Validation Rules
- \`username\`: Minimum 3 characters, alphanumeric only
- \`Password\`: Minimum 6 characters
`,
        body: Type.Object({
          username: Type.String({ minLength: 3, pattern: "^[a-zA-Z0-9]+$" }),
          password: Type.String({ minLength: 6 }),
        }),
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              requires2FA: Type.Optional(Type.Boolean()),
              requiresPasswordChange: Type.Optional(Type.Boolean()),
              sessionToken: Type.Optional(Type.String()),
              accessToken: Type.Optional(Type.String()),
              refreshToken: Type.Optional(Type.String()),
              user: Type.Optional(
                Type.Object(
                  {
                    id: Type.String({ format: "uuid" }),
                    username: Type.String(),
                    email: Type.String({ format: "email" }),
                    twoFactorEnabled: Type.Boolean(),
                    isActive: Type.Boolean(),
                    isSuperAdmin: Type.Boolean(),
                    createdAt: Type.String({ format: "date-time" }),
                    updatedAt: Type.String({ format: "date-time" }),
                  },
                  {
                    description:
                      "Success (with tokens or 2FA/password change requirement)",
                  }
                )
              ),
              permissions: Type.Optional(Type.Array(Type.String())),
            }),
          }),
          400: Type.Object(
            {
              success: Type.Boolean(),
              message: Type.String(),
            },
            {
              description: "Invalid input or missing headers",
            }
          ),
          401: Type.Object(
            {
              success: Type.Boolean(),
              message: Type.String(),
            },
            {
              description: "Invalid credentials or User not found/inactive",
            }
          ),
        },
      },
    },
    async (request) => {
      const userAgent = request.headers["user-agent"];
      const ipAddress = request.ip;

      if (!userAgent || !ipAddress) {
        throw new AppError("User agent and IP address are required", 400);
      }

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
        return {
          success: true,
          data: result,
        };
      }
    }
  );

  server.post(
    "/forgot-password",
    {
      schema: {
        tags: ["Password Management"],
        summary: "Request Password Reset",
        description: `Initiate a password reset process for a user. A reset link will be sent to the user's email address.

          
          `,
        body: Type.Object({
          username: Type.String({ minLength: 3 }),
          frontend: Type.String({
            description: "Frontend application identifier for reset URL",
          }),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          ...errorSchema,
        },
      },
    },
    async (request) => {
      const userAgent = request.headers["user-agent"];
      const ipAddress = request.ip;

      if (!userAgent || !ipAddress) {
        throw new AppError("User agent and IP address are required", 400);
      }

      await authService.requestPasswordReset(
        request.body.username!,
        request.body.frontend!,
        userAgent,
        ipAddress
      );

      return {
        success: true,
        message: "If the user exists, a password reset link has been sent",
      };
    }
  );

  server.post(
    "/reset-password",
    {
      schema: {
        tags: ["Password Management"],
        summary: "Reset Password",
        description:
          "Complete the password reset process using a valid reset token.",
        body: Type.Object({
          token: Type.String({
            description: "Password reset token from email",
          }),
          newPassword: Type.String({
            minLength: 6,
            description: "New password meeting security requirements",
          }),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          ...errorSchema,
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
    "/2fa/verify",
    {
      schema: {
        tags: ["Two-Factor Authentication"],
        summary: "Verify 2FA Code",
        description:
          "Complete the login process by verifying a 2FA code after initial authentication.",
        body: Type.Object({
          totpCode: Type.String({
            pattern: "^[0-9]{6}$",
            description: "6-digit TOTP code from authenticator app",
          }),
          sessionToken: Type.String({
            description: "Session token from initial login response",
          }),
        }),
        response: {
          ...errorSchema,
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
        headers: schemaHeaders,
      },
    },
    async (request) => {
      const userAgent = request.headers["user-agent"];
      const ipAddress = request.ip;

      if (!userAgent || !ipAddress) {
        throw new AppError("User agent and IP address are required", 400);
      }

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
    "/2fa/setup",
    {
      preHandler: requireAuth(),
      schema: {
        tags: ["Two-Factor Authentication"],
        summary: "Setup 2FA",
        description:
          "Generate a new 2FA secret for the authenticated user and enable 2FA.",
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              secret: Type.String({
                description:
                  "Base32 encoded secret for manual authenticator setup",
              }),
            }),
          }),
        },
        headers: schemaHeaders,
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
    "/2fa/enable",
    {
      preHandler: requireAuth(),
      schema: {
        tags: ["Two-Factor Authentication"],
        summary: "Enable 2FA",
        description: "Verify and activate 2FA for the user account.",
        body: Type.Object({
          code: Type.String({
            pattern: "^[0-9]{6}$",
            description: "6-digit TOTP code from authenticator app",
          }),
        }),
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
        headers: schemaHeaders,
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
    "/2fa/disable",
    {
      preHandler: requireAuth(),
      schema: {
        tags: ["Two-Factor Authentication"],
        summary: "Disable 2FA",
        description: "Turn off 2FA protection for the user account.",
        body: Type.Object({
          code: Type.String({
            pattern: "^[0-9]{6}$",
            description: "Current 6-digit TOTP code for verification",
          }),
        }),
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
        headers: schemaHeaders,
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
    "/2fa/standalone-verify",
    {
      preHandler: requireAuth(),
      schema: {
        tags: ["Two-Factor Authentication"],
        summary: "Verify 2FA Code (Standalone)",
        description: "Verify a 2FA code for the user account.",
        body: Type.Object({
          code: Type.String({
            pattern: "^[0-9]{6}$",
            description: "6-digit TOTP code to verify",
          }),
        }),
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            valid: Type.Boolean(),
          }),
        },
        headers: schemaHeaders,
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
    "/2fa/remove",
    {
      preHandler: requireAuth(),
      schema: {
        tags: ["Two-Factor Authentication"],
        summary: "Remove 2FA",
        description: "Completely remove 2FA configuration from user account.",
        body: Type.Object({
          code: Type.String({
            pattern: "^[0-9]{6}$",
            description: "Current 6-digit TOTP code for verification",
          }),
        }),
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
        headers: schemaHeaders,
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
    "/refresh",
    {
      schema: {
        tags: ["Session Management"],
        summary: "Refresh Access Token",
        description: "Obtain new access token using a valid refresh token.",
        body: Type.Object({
          refreshToken: Type.String({
            description: "Valid refresh token obtained during login",
          }),
        }),
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              accessToken: Type.String(),
              refreshToken: Type.String(),
            }),
          }),
        },
        headers: schemaHeaders,
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
    "/logout",
    {
      preHandler: requireAuth(),
      schema: {
        tags: ["Session Management"],
        summary: "Logout Current Session",
        description: "Delete the current user session.",
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
        },
        headers: schemaHeaders,
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

  server.get(
    "/sessions",
    {
      preHandler: requireAuth(),
      schema: {
        tags: ["Session Management"],
        summary: "Get User Sessions",
        description:
          "Retrieve list of all active sessions for the current user.",
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Array(
              Type.Object({
                id: Type.String({ description: "Session ID" }),
                userAgent: Type.Optional(
                  Type.String({ description: "Browser/device user agent" })
                ),
                ipAddress: Type.Optional(
                  Type.String({ description: "IP address of session" })
                ),
                createdAt: Type.String({
                  format: "date-time",
                  description: "Session creation timestamp",
                }),
                lastActiveAt: Type.String({
                  format: "date-time",
                  description: "Last activity timestamp",
                }),
                isActive: Type.Boolean({
                  description: "Whether session is currently active",
                }),
                isCurrent: Type.Boolean({
                  description: "Whether this is the current session",
                }),
              })
            ),
          }),
        },
        headers: schemaHeaders,
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
    "/sessions/:sessionId",
    {
      preHandler: requireAuth(),
      schema: {
        tags: ["Session Management"],
        summary: "Revoke Session",
        description: "Terminate a specific user session by ID.",
        params: Type.Object({
          sessionId: Type.String({
            description: "ID of the session to revoke",
          }),
        }),
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
          }),
          404: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            { description: "Session not found" }
          ),
        },
        headers: schemaHeaders,
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
    "/me",
    {
      preHandler: requireAuth(),
      schema: {
        tags: ["Session Management"],
        summary: "Get Current User Profile",
        description:
          "Retrieve profile information and permissions for the authenticated user.",
        response: {
          ...errorSchema,
          200: Type.Object({
            success: Type.Boolean(),
            data: Type.Object({
              user: Type.Object({
                id: Type.String({ format: "uuid", description: "User UUID" }),
                username: Type.String({ description: "Username" }),
                email: Type.String({
                  format: "email",
                  description: "Email address",
                }),
                isActive: Type.Boolean({
                  description: "Account active status",
                }),
                isSuperAdmin: Type.Boolean({ description: "Super admin flag" }),
                createdAt: Type.String({
                  format: "date-time",
                  description: "Account creation date",
                }),
                updatedAt: Type.String({
                  format: "date-time",
                  description: "Last profile update",
                }),
              }),
              permissions: Type.Array(
                Type.String({ description: "User permissions/roles" })
              ),
            }),
          }),
          404: Type.Object(
            {
              success: Type.Boolean(),
              error: Type.String(),
            },
            { description: "User not found" }
          ),
        },
        headers: schemaHeaders,
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

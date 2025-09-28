import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import { databaseService } from "../services/database";
import { config } from "../config";
import type { AccessTokenPayload } from "../types/user";
import { permissionService } from "../services/permission";
import { AppError } from "./error";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      userId: string;
      username: string;
      permissions: string[];
      isSuperAdmin: boolean;
      sessionId: string;
    };
  }
}

export const authenticate: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorateRequest("user", undefined);

  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      const token = authHeader?.split(" ")[1];

      if (!token) {
        return;
      }

      try {
        const decoded = jwt.verify(
          token,
          config.JWT_SECRET
        ) as AccessTokenPayload;

        const session = await databaseService.sessions.getSession(
          decoded.sessionId
        );
        if (!session || new Date(session.expires_at) < new Date()) {
          reply.code(401).send({
            success: false,
            error: "Invalid or expired session",
          });
          return;
        }

        await databaseService.sessions.updateSessionActivity(decoded.sessionId);

        request.user = {
          userId: decoded.userId,
          username: decoded.username,
          permissions: decoded.permissions,
          isSuperAdmin: decoded.isSuperAdmin,
          sessionId: decoded.sessionId,
        };
      } catch (error) {
        reply.code(401).send({
          success: false,
          error: "Invalid or expired token",
        });
      }
    }
  );
});

export function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new AppError("Authentication required", 401);
    }
  };
}

export function requirePermission(permission: string) {
  return async (request: FastifyRequest) => {
    if (!request.user) {
      throw new AppError("Authentication required", 401);
    }

    if (request.user.isSuperAdmin) {
      return;
    }

    const hasPermission = await permissionService.checkPermission(
      request.user.userId,
      permission,
      (request.params as any).serverId || (request.params as any).id
    );

    if (!hasPermission) {
      throw new AppError("Insufficient permissions", 403);
    }
  };
}

export function requireSuperAdmin() {
  return async (request: FastifyRequest) => {
    if (!request.user?.isSuperAdmin) {
      throw new AppError("Super admin access required", 403);
    }
  };
}

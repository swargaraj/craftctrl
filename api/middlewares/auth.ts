import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";

import { databaseService } from "../services/database";
import type { AccessTokenPayload } from "../types/user";
import { permissionService } from "../services/permission";
import { config } from "../config";
import { AppError } from "./error";

declare module "fastify" {
  interface FastifyRequest {
    user?: Omit<AccessTokenPayload, "iat" | "exp">;
  }
}

export const authenticate: FastifyPluginAsync = fp(async (fastify) => {
  fastify.decorateRequest("user", undefined);

  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    const userAgent = request.headers["user-agent"];
    const ipAddress = request.ip;

    if (!userAgent || !ipAddress) {
      throw new AppError("User agent and IP address are required", 400);
    }

    const isWebSocket = !!(
      request.raw.headers.upgrade?.toLowerCase() === "websocket"
    );

    let token: string | undefined;

    if (isWebSocket) {
      token = (request.query as { token?: string })?.token;
    } else {
      const authHeader = request.headers.authorization;
      token = authHeader?.split(" ")[1];
    }

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
        throw new AppError("Invalid or expired token", 401);
      }

      await databaseService.sessions.updateSessionActivity(
        decoded.sessionId,
        userAgent,
        ipAddress
      );

      request.user = {
        userId: decoded.userId,
        username: decoded.username,
        permissions: decoded.permissions,
        isSuperAdmin: decoded.isSuperAdmin,
        sessionId: decoded.sessionId,
      };
    } catch (error) {
      throw new AppError("Invalid or expired token", 401);
    }
  });
});

export function requireAuth() {
  return async (request: FastifyRequest) => {
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

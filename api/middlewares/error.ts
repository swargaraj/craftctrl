import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../lib/logger";
import { config } from "../config";
import { Type } from "@fastify/type-provider-typebox";

export const errorSchema = {
  401: Type.Object(
    {
      success: Type.Boolean({ default: false }),
      message: Type.String({ default: "Unauthorized" }),
    },
    {
      description: "Missing or Invalid Token",
      examples: [{ success: false, message: "Invalid or expired token" }],
    }
  ),
  429: Type.Object(
    {
      success: Type.Boolean({ default: false }),
      message: Type.String({ default: "Too many requests" }),
    },
    {
      description: "Rate limit exceeded",
      examples: [{ success: false, message: "Too many requests" }],
    }
  ),
  500: Type.Object(
    {
      success: Type.Boolean({ default: false }),
      message: Type.String({ default: "Server error" }),
    },
    {
      description: "Internal server error",
      examples: [{ success: false, message: "Server error" }],
    }
  ),
};

export const schemaHeaders = Type.Object({
  Authorization: Type.String({
    description: "Bearer `<token>`",
    examples: ["Bearer TOKEN"],
  }),
});

export class AppError extends Error {
  public originalError?: Error;

  constructor(
    message: string,
    public statusCode: number = 500,
    error?: unknown
  ) {
    super(message);
    if (error instanceof Error) {
      this.originalError = error;
      this.stack = error.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const isWs = !!(request.raw as any).send;
  const statusCode =
    error instanceof AppError ? error.statusCode : error.statusCode || 500;
  const message = error.message;

  if (statusCode >= 500) {
    logger.error("Server error", {
      error: message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      ip: request.ip,
    });
  }

  const res = {
    success: false,
    error: message,
    ...(config.NODE_ENV === "development" && { stack: error.stack }),
  };

  if (isWs) {
    (request.raw as any).send(JSON.stringify(res));
  } else {
    reply.status(statusCode).send(res);
  }
}

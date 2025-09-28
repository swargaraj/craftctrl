import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../utils/logger";
import { config } from "../config";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  let statusCode = error.statusCode || 500;
  let message = error.message;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }

  if (statusCode >= 500) {
    logger.error("Server error", {
      error: message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      ip: request.ip,
    });
  } else {
    logger.warn("Client error", {
      error: message,
      url: request.url,
      method: request.method,
      ip: request.ip,
    });
  }

  reply.status(statusCode).send({
    success: false,
    error: message,
    ...(config.NODE_ENV === "development" && { stack: error.stack }),
  });
}

import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";

import { config } from "./config";
import { logger, requestLogger } from "./utils/logger";
import { databaseService } from "./services/database";

import { authenticate } from "./middlewares/auth";
import { errorHandler } from "./middlewares/error";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import notificationRoutes from "./routes/notifications";
// import serverRoutes from "./routes/servers";

export async function buildServer(
  opts: FastifyServerOptions = {}
): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,
    disableRequestLogging: true,
    routerOptions: {
      caseSensitive: false,
      ignoreTrailingSlash: true,
      ignoreDuplicateSlashes: true,
    },
    ...opts,
  });

  if (config.NODE_ENV === "production") {
    fastify.addHook("onRequest", async (request, reply) => {
      requestLogger.info({
        ip: request.ip,
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
      });
    });
  }

  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  const origins = (() => {
    const v = (config.CORS_ORIGIN ?? "").trim();
    if (!v) return [];
    if (v === "*") return true;
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  })();

  await fastify.register(fastifyCors, {
    origin: origins,
    credentials: true,
  });

  await fastify.register(fastifyRateLimit, {
    max: config.RATE_LIMIT_MAX || 100,
    timeWindow: config.RATE_LIMIT_TIME_WINDOW || "1 minute",
  });

  fastify.setErrorHandler(errorHandler);

  fastify.register(authenticate);

  fastify.register(authRoutes, { prefix: config.API_PREFIX });
  fastify.register(userRoutes, { prefix: config.API_PREFIX });
  fastify.register(notificationRoutes, { prefix: config.API_PREFIX });
//   fastify.register(serverRoutes, { prefix: config.API_PREFIX });

  return fastify;
}

export async function startServer() {
  const server = await buildServer();

  await server.listen({
    port: config.PORT,
    host: config.HOST,
  });

  logger.info(`Server started on ${config.HOST}:${config.PORT}`);

  const signals = ["SIGINT", "SIGTERM"];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      await server.close();
      databaseService.close();
      process.exit(0);
    });
  });

  return server;
}

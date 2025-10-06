import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";

import { config } from "./config";

import { authenticate } from "./middlewares/auth";
import { errorHandler } from "./middlewares/error";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import notificationRoutes from "./routes/notifications";

import swagger from "@fastify/swagger";
import { openapiConfig } from "./lib/openapi";

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

  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    xPoweredBy: false,
    xFrameOptions: { action: "sameorigin" },
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
    credentials: !(config.CORS_ORIGIN === "*"),
  });

  await fastify.register(fastifyRateLimit, {
    max: config.RATE_LIMIT_MAX || 100,
    timeWindow: config.RATE_LIMIT_TIME_WINDOW || "1 minute",
    logLevel: "silent",
    global: true,
  });

  fastify.setErrorHandler(errorHandler);

  await fastify.register(swagger, {
    openapi: openapiConfig,
  });

  fastify.register(authenticate);

  fastify.register(authRoutes, { prefix: config.API_PREFIX + "/auth" });
    fastify.register(userRoutes, { prefix: config.API_PREFIX + "/users" });
    fastify.register(notificationRoutes, {
      prefix: config.API_PREFIX + "/notifications",
    });

  fastify.get("/openapi", {
    schema: {
      hide: true,
    },
    handler: async () => fastify.swagger(),
  });
  
  return fastify;
}

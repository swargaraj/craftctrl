import { config } from "./config";
import { buildServer } from "./server";
import { logger } from "./lib/logger";

const server = await buildServer();

try {
  await server.listen({
    port: config.PORT,
    host: config.HOST,
  });

  logger.info(`Server started on ${config.HOST}:${config.PORT}`);
} catch (error) {
  logger.error("Failed to start server", { error });
}

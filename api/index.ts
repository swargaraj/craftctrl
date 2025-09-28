import { startServer } from "./server";
import { logger } from "./utils/logger";

(async () => {
  try {
    await startServer();
  } catch (error) {
    logger.error("Failed to start server:", error);
    logger.end();
    await new Promise((resolve) => logger.on("finish", resolve));
    process.exit(1);
  }
})();

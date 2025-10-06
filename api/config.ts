import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.string().transform(Number).default(5575),
  HOST: z.string().default("0.0.0.0"),
  API_PREFIX: z.string().default(""),

  DOCKER_SOCKET_PATH: z.string().default("/var/run/docker.sock"),
  DOCKER_NETWORK: z.string().default("minecraft-network"),

  DATABASE_URL: z.string().default("./data/servers.db"),

  API_URL: z.string().default("http://localhost:5575"),

  SENDER_EMAIL: z.email().default(""),
  MAILERSEND_API_KEY: z.string().default(""),

  JWT_SECRET: z
    .string()
    .min(32)
    .default("your-super-secure-jwt-secret-change-in-production"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  RATE_LIMIT_MAX: z.string().transform(Number).default(100),
  RATE_LIMIT_TIME_WINDOW: z.string().default("1 minute"),
});

export type Config = z.infer<typeof configSchema>;

export const config = configSchema.parse(process.env);

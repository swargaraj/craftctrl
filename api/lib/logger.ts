import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { config } from "../config";

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const serviceTransport = new DailyRotateFile({
  dirname: "logs/service",
  filename: "%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: false,
  maxSize: "10m",
  maxFiles: "14d",
  level: "silly",
});

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return stack
      ? `${timestamp} ${level}: ${message}\n${stack}`
      : `${timestamp} ${level}: ${message}`;
  })
);

export const logger = winston.createLogger({
  format: logFormat,
  level: config.NODE_ENV === "development" ? "debug" : "info",
  defaultMeta: { service: "craftctrl" },
  transports: [
    serviceTransport,
    new winston.transports.Console({ format: consoleFormat }),
  ],
});

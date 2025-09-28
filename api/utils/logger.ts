import winston from "winston";

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const serviceTransport = new winston.transports.File({
  filename: "logs/service.log",
  maxsize: 10 * 1024 * 1024,
  level: "silly",
  maxFiles: 5,
  tailable: true,
});

const errorTransport = new winston.transports.File({
  filename: "logs/error.log",
  maxsize: 10 * 1024 * 1024,
  level: "error",
  maxFiles: 5,
  tailable: true,
});

export const logger = winston.createLogger({
  format: logFormat,
  level: "silly",
  defaultMeta: { service: "craftctrl" },
  transports: [serviceTransport, errorTransport],
});

logger.add(
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  })
);

const requestTransport = new winston.transports.File({
  filename: "logs/requests.log",
  maxsize: 10 * 1024 * 1024,
  maxFiles: 5,
  tailable: true,
});

export const requestLogger = winston.createLogger({
  level: "info",
  format: logFormat,
  defaultMeta: { service: "craftctrl" },
  transports: [requestTransport],
});

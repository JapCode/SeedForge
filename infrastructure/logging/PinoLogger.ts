import pino from "pino";
import { Logger } from "../../application/ports/Logger";

const pinoInstance = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss" },
        }
      : undefined,
});

/**
 * Structured logging via Pino. Context is passed as the first argument
 * (Pino's convention) so it ends up as real JSON fields in production
 * instead of an interpolated string — needed for log aggregation/search.
 */
export class PinoLogger implements Logger {
  info(message: string, context?: Record<string, unknown>): void {
    pinoInstance.info(context ?? {}, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    pinoInstance.warn(context ?? {}, message);
  }

  error(message: string, context?: Record<string, unknown>): void {
    pinoInstance.error(context ?? {}, message);
  }
}

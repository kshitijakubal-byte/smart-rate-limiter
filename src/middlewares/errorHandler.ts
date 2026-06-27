import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError, isAppError } from "../utils/AppError";
import { logger } from "../utils/logger";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.flatten(),
    });
    return;
  }

  if (isAppError(err)) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  logger.error("Unhandled error", err);
  res.status(500).json({ error: "Internal server error" });
}

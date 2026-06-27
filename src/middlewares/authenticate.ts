import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

export interface AuthUser {
  id: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
}

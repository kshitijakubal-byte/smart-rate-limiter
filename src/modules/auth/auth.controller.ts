import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { loginSchema, registerSchema } from "./auth.schema";
import * as authService from "./auth.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const user = await authService.registerUser(input);

  res.status(201).json({
    message: "User registered successfully",
    user,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.loginUser(input);

  res.json({
    message: "Login successful",
    ...result,
  });
});

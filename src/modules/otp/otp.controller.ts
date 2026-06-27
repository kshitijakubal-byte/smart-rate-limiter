import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  cancelOtpParamsSchema,
  otpStatusParamsSchema,
  resendOtpSchema,
  sendOtpSchema,
} from "./otp.schema";
import * as otpService from "./otp.service";

export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const input = sendOtpSchema.parse(req.body);
  const otpRequest = await otpService.sendOtp(input);

  res.status(201).json({
    message: "OTP request created",
    otpRequest,
  });
});

export const getOtpStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = otpStatusParamsSchema.parse(req.params);
  const otpRequest = await otpService.getOtpStatus(id);

  res.json({ otpRequest });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const input = resendOtpSchema.parse(req.body);
  const otpRequest = await otpService.resendOtp(input);

  res.json({
    message: "OTP resent",
    otpRequest,
  });
});

export const cancelOtp = asyncHandler(async (req: Request, res: Response) => {
  const { id } = cancelOtpParamsSchema.parse(req.params);
  const otpRequest = await otpService.cancelOtp(id);

  res.json({
    message: "OTP request cancelled",
    otpRequest,
  });
});

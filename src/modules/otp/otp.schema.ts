import { z } from "zod";

export const sendOtpSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number is too long"),
});

export const otpStatusParamsSchema = z.object({
  id: z.coerce.number().int().positive("Invalid OTP request id"),
});

export const resendOtpSchema = z
  .object({
    phoneNumber: z.string().min(10).max(20).optional(),
    otpRequestId: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => data.phoneNumber || data.otpRequestId, {
    message: "Either phoneNumber or otpRequestId is required",
  });

export const cancelOtpParamsSchema = z.object({
  id: z.coerce.number().int().positive("Invalid OTP request id"),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

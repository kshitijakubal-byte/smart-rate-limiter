import { pool } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";
import { ResendOtpInput, SendOtpInput } from "./otp.schema";

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 6;

export type OtpStatus = "pending" | "verified" | "cancelled" | "expired";

export interface OtpRequest {
  id: number;
  phone_number: string;
  code: string;
  status: OtpStatus;
  attempt_count: number;
  created_at: Date;
  expires_at: Date;
}

function generateOtpCode(): string {
  const max = 10 ** OTP_LENGTH;
  const code = Math.floor(Math.random() * max)
    .toString()
    .padStart(OTP_LENGTH, "0");
  return code;
}

function getExpiryTimestamp(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

function toPublicOtpRequest(row: OtpRequest) {
  return {
    id: row.id,
    phoneNumber: row.phone_number,
    status: row.status,
    attemptCount: row.attempt_count,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function sendOtp(input: SendOtpInput) {
  const code = generateOtpCode();
  const expiresAt = getExpiryTimestamp();

  const result = await pool.query<OtpRequest>(
    `INSERT INTO otp_requests (phone_number, code, status, expires_at)
     VALUES ($1, $2, 'pending', $3)
     RETURNING *`,
    [input.phoneNumber, code, expiresAt]
  );

  const otpRequest = result.rows[0];

  logger.info("OTP generated (not sent via SMS)", {
    phoneNumber: input.phoneNumber,
    otpRequestId: otpRequest.id,
    code,
    expiresAt,
  });

  return toPublicOtpRequest(otpRequest);
}

export async function getOtpStatus(id: number) {
  const result = await pool.query<OtpRequest>(
    `SELECT *
     FROM otp_requests
     WHERE id = $1`,
    [id]
  );

  const otpRequest = result.rows[0];

  if (!otpRequest) {
    throw new AppError(404, "OTP request not found");
  }

  return toPublicOtpRequest(otpRequest);
}

export async function resendOtp(input: ResendOtpInput) {
  let otpRequest: OtpRequest | undefined;

  if (input.otpRequestId) {
    const result = await pool.query<OtpRequest>(
      `SELECT *
       FROM otp_requests
       WHERE id = $1`,
      [input.otpRequestId]
    );
    otpRequest = result.rows[0];
  } else if (input.phoneNumber) {
    const result = await pool.query<OtpRequest>(
      `SELECT *
       FROM otp_requests
       WHERE phone_number = $1 AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [input.phoneNumber]
    );
    otpRequest = result.rows[0];
  }

  if (!otpRequest) {
    throw new AppError(404, "Pending OTP request not found");
  }

  if (otpRequest.status !== "pending") {
    throw new AppError(400, "Only pending OTP requests can be resent");
  }

  const code = generateOtpCode();
  const expiresAt = getExpiryTimestamp();

  const result = await pool.query<OtpRequest>(
    `UPDATE otp_requests
     SET code = $1,
         expires_at = $2,
         attempt_count = 0
     WHERE id = $3
     RETURNING *`,
    [code, expiresAt, otpRequest.id]
  );

  const updated = result.rows[0];

  logger.info("OTP regenerated (not sent via SMS)", {
    phoneNumber: updated.phone_number,
    otpRequestId: updated.id,
    code,
    expiresAt,
  });

  return toPublicOtpRequest(updated);
}

export async function cancelOtp(id: number) {
  const result = await pool.query<OtpRequest>(
    `SELECT *
     FROM otp_requests
     WHERE id = $1`,
    [id]
  );

  const otpRequest = result.rows[0];

  if (!otpRequest) {
    throw new AppError(404, "OTP request not found");
  }

  // TODO: Verify the OTP request belongs to the requesting user/context before cancelling.

  if (otpRequest.status === "cancelled") {
    return toPublicOtpRequest(otpRequest);
  }

  if (otpRequest.status !== "pending") {
    throw new AppError(400, "Only pending OTP requests can be cancelled");
  }

  const updatedResult = await pool.query<OtpRequest>(
    `UPDATE otp_requests
     SET status = 'cancelled'
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  return toPublicOtpRequest(updatedResult.rows[0]);
}

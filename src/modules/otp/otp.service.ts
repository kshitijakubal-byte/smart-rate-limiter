import { PoolClient } from "pg";
import { pool } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";
import { ResendOtpInput, SendOtpInput } from "./otp.schema";

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 6;

export type OtpStatus =
  | "pending"
  | "verified"
  | "expired"
  | "cancelled"
  | "superseded";

export interface OtpRequest {
  id: number;
  phone_number: string;
  code: string;
  status: OtpStatus;
  attempt_count: number;
  created_at: Date;
  expires_at: Date;
}

// TODO: Add a cron job or stored procedure to formally mark rows as 'expired'
// once expires_at passes. Until then, treat pending rows with expires_at <= now()
// as inactive at query time.

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

async function findActivePendingByPhone(
  phoneNumber: string,
  client: PoolClient | typeof pool = pool
): Promise<OtpRequest | undefined> {
  const result = await client.query<OtpRequest>(
    `SELECT *
     FROM otp_requests
     WHERE phone_number = $1
       AND status = 'pending'
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [phoneNumber]
  );

  return result.rows[0];
}

export async function sendOtp(input: SendOtpInput) {
  const existingActive = await findActivePendingByPhone(input.phoneNumber);

  if (existingActive) {
    throw new AppError(
      409,
      "An OTP was already sent. Please wait for it to expire or use resend."
    );
  }

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

//GET OTP STATUS
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

//RESEND OTP
export async function resendOtp(input: ResendOtpInput) {
  let phoneNumber: string | undefined = input.phoneNumber;

  if (input.otpRequestId) {
    const result = await pool.query<OtpRequest>(
      `SELECT *
       FROM otp_requests
       WHERE id = $1`,
      [input.otpRequestId]
    );
    const byId = result.rows[0];

    if (input.phoneNumber) {
      if (!byId) {
        throw new AppError(404, "OTP request not found");
      }
      if (byId.phone_number !== input.phoneNumber) {
        throw new AppError(400, "Phone number does not match the OTP request");
      }
      phoneNumber = input.phoneNumber;
    } else if (byId) {
      phoneNumber = byId.phone_number;
    } else {
      throw new AppError(404, "OTP request not found");
    }
  }

  if (!phoneNumber) {
    throw new AppError(404, "No active OTP request to resend.");
  }

  const activeOtp = await findActivePendingByPhone(phoneNumber);

  if (!activeOtp) {
    throw new AppError(404, "No active OTP request to resend.");
  }

  if (input.otpRequestId && activeOtp.id !== input.otpRequestId) {
    throw new AppError(404, "No active OTP request to resend.");
  }

  const code = generateOtpCode();
  const expiresAt = getExpiryTimestamp();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE otp_requests
       SET status = 'superseded'
       WHERE id = $1`,
      [activeOtp.id]
    );

    const insertResult = await client.query<OtpRequest>(
      `INSERT INTO otp_requests (phone_number, code, status, expires_at)
       VALUES ($1, $2, 'pending', $3)
       RETURNING *`,
      [phoneNumber, code, expiresAt]
    );

    await client.query("COMMIT");

    const newOtpRequest = insertResult.rows[0];

    logger.info("OTP regenerated (not sent via SMS)", {
      phoneNumber,
      otpRequestId: newOtpRequest.id,
      supersededOtpRequestId: activeOtp.id,
      code,
      expiresAt,
    });

    return toPublicOtpRequest(newOtpRequest);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

//CANCEL OTP
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

  const isActivePending =
    otpRequest.status === "pending" && otpRequest.expires_at > new Date();

  if (!isActivePending) {
    throw new AppError(
      400,
      "OTP request is not active and cannot be cancelled."
    );
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

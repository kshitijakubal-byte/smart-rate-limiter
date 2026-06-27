import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { LoginInput, RegisterInput } from "./auth.schema";

const SALT_ROUNDS = 10;

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

export async function registerUser(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  try {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [input.name, input.email, passwordHash]
    );

    return result.rows[0];
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "23505"
    ) {
      throw new AppError(409, "Email already registered");
    }
    throw err;
  }
}

export async function loginUser(input: LoginInput) {
  const result = await pool.query<UserRow>(
    `SELECT id, name, email, password_hash, created_at
     FROM users
     WHERE email = $1`,
    [input.email]
  );

  const user = result.rows[0];

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const valid = await bcrypt.compare(input.password, user.password_hash);

  if (!valid) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  host: env.PGHOST,
  port: env.PGPORT,
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error", err);
});

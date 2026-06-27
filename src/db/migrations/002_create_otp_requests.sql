CREATE TABLE IF NOT EXISTS otp_requests (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otp_requests_phone_number ON otp_requests (phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_requests_status ON otp_requests (status);

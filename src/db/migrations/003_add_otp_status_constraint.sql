ALTER TABLE otp_requests
ADD CONSTRAINT otp_requests_status_check
CHECK (status IN ('pending', 'verified', 'expired', 'cancelled', 'superseded'));

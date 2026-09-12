import crypto from 'crypto';

/**
 * Generate a cryptographically secure 6-digit OTP
 */
export function generateOtp(): string {
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0);
  // Modulo 900000 gives 0-899999, add 100000 → 100000-999999
  return String(100000 + (num % 900000));
}

/**
 * Generate a numeric OTP of specified length
 */
export function generateNumericOtp(length = 6): string {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += crypto.randomInt(0, 10).toString();
  }
  return otp;
}

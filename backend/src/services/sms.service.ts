import twilio from 'twilio';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let twilioClient: twilio.Twilio | null = null;

/**
 * Normalize a 10-digit Indian mobile number to E.164 format (+91XXXXXXXXXX).
 * Handles inputs like "9876543210" or "+919876543210" — always returns "+91XXXXXXXXXX".
 */
export function normalizeIndianMobile(mobile: string): string {
  // Strip all non-digits
  const digits = mobile.replace(/\D/g, '');
  // If it already has the country code (12 digits starting with 91)
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  // Standard 10-digit Indian mobile
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  // Fallback — let Twilio validate
  return `+${digits}`;
}

function getClient(): twilio.Twilio {
  if (!twilioClient) {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * Send an OTP SMS.
 * - If Twilio credentials are configured → send real SMS regardless of NODE_ENV.
 * - If credentials are missing → log to console (dev fallback only).
 * Returns true on success, throws on Twilio error (so caller can surface it to user).
 */
export async function sendSmsOtp(mobile: string, otp: string): Promise<boolean> {
  const message = `Your Car Deal Safety OTP is: ${otp}. Valid for 10 minutes. Do not share this with anyone.`;

  // No Twilio credentials — fall back to dev console logging
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    logger.info(`[DEV-FALLBACK] OTP for ${mobile}: ${otp}`);
    return true;
  }

  // Real Twilio delivery — works in both development and production
  const toNumber = normalizeIndianMobile(mobile);
  try {
    const result = await getClient().messages.create({
      body: message,
      from: env.TWILIO_FROM_NUMBER,
      to: toNumber,
    });
    logger.info('OTP SMS sent via Twilio', { sid: result.sid, to: toNumber });
    return true;
  } catch (err: any) {
    // Log full Twilio error server-side; throw a safe message to the caller
    logger.error('Twilio SMS send failed', {
      code: err.code,
      message: err.message,
      to: toNumber,
    });
    throw new Error('Unable to send OTP. Please try again.');
  }
}

/**
 * General SMS send (notifications etc.)
 * Same credential-check logic as sendSmsOtp.
 */
export async function sendSms(mobile: string, message: string): Promise<boolean> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    logger.info(`[DEV-FALLBACK] SMS to ${mobile}: ${message}`);
    return true;
  }

  const toNumber = normalizeIndianMobile(mobile);
  try {
    const result = await getClient().messages.create({
      body: message,
      from: env.TWILIO_FROM_NUMBER,
      to: toNumber,
    });
    logger.info('SMS sent via Twilio', { sid: result.sid, to: toNumber });
    return true;
  } catch (err: any) {
    logger.error('Twilio SMS send failed', { code: err.code, message: err.message, to: toNumber });
    return false;
  }
}

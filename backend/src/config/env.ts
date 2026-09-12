import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '5000'), 10),
  API_PREFIX: optional('API_PREFIX', '/api/v1'),

  DATABASE_URL: required('DATABASE_URL'),

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optional('JWT_REFRESH_EXPIRES_IN', '7d'),

  AWS_REGION: optional('AWS_REGION', 'ap-south-1'),
  AWS_ACCESS_KEY_ID: optional('AWS_ACCESS_KEY_ID', ''),
  AWS_SECRET_ACCESS_KEY: optional('AWS_SECRET_ACCESS_KEY', ''),
  AWS_S3_BUCKET: optional('AWS_S3_BUCKET', 'cardeal-documents-private'),
  AWS_S3_PRESIGNED_URL_TTL: parseInt(optional('AWS_S3_PRESIGNED_URL_TTL', '900'), 10),

  TWILIO_ACCOUNT_SID: optional('TWILIO_ACCOUNT_SID', ''),
  TWILIO_AUTH_TOKEN: optional('TWILIO_AUTH_TOKEN', ''),
  TWILIO_FROM_NUMBER: optional('TWILIO_FROM_NUMBER', ''),
  OTP_EXPIRY_SECONDS: parseInt(optional('OTP_EXPIRY_SECONDS', '600'), 10),
  OTP_MAX_ATTEMPTS: parseInt(optional('OTP_MAX_ATTEMPTS', '3'), 10),

  META_WHATSAPP_TOKEN: optional('META_WHATSAPP_TOKEN', ''),
  META_WHATSAPP_PHONE_ID: optional('META_WHATSAPP_PHONE_ID', ''),
  META_WHATSAPP_API_VERSION: optional('META_WHATSAPP_API_VERSION', 'v18.0'),

  EXOTEL_API_KEY: optional('EXOTEL_API_KEY', ''),
  EXOTEL_API_TOKEN: optional('EXOTEL_API_TOKEN', ''),
  EXOTEL_SUBDOMAIN: optional('EXOTEL_SUBDOMAIN', 'api.exotel.com'),
  EXOTEL_SID: optional('EXOTEL_SID', ''),
  EXOTEL_VIRTUAL_NUMBER: optional('EXOTEL_VIRTUAL_NUMBER', ''),

  SENDGRID_API_KEY: optional('SENDGRID_API_KEY', ''),
  EMAIL_FROM: optional('EMAIL_FROM', 'noreply@cardeal.com'),
  EMAIL_FROM_NAME: optional('EMAIL_FROM_NAME', 'Car Deal Safety'),

  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:3000'),
  ALLOWED_ORIGINS: optional('ALLOWED_ORIGINS', 'http://localhost:3000').split(','),

  RATE_LIMIT_WINDOW_MS: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX: parseInt(optional('RATE_LIMIT_MAX', '100'), 10),
  OTP_RATE_LIMIT_MAX: parseInt(optional('OTP_RATE_LIMIT_MAX', '5'), 10),

  APP_NAME: optional('APP_NAME', 'Car Deal Smart Safety Tag'),
  TAG_ID_PREFIX: optional('TAG_ID_PREFIX', 'CD'),
  TAG_ID_START: parseInt(optional('TAG_ID_START', '1001'), 10),
  BASE_URL: optional('BASE_URL', 'http://localhost:3000'),
  DOCUMENT_PIN_MAX_ATTEMPTS: parseInt(optional('DOCUMENT_PIN_MAX_ATTEMPTS', '5'), 10),
  DOCUMENT_PIN_LOCKOUT_MINUTES: parseInt(optional('DOCUMENT_PIN_LOCKOUT_MINUTES', '30'), 10),

  isDevelopment(): boolean {
    return this.NODE_ENV === 'development';
  },
  isProduction(): boolean {
    return this.NODE_ENV === 'production';
  },
};

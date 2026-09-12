import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

export async function comparePin(pin: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(pin, hashed);
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10); // Faster for OTP (shorter-lived)
}

export async function compareOtp(otp: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(otp, hashed);
}

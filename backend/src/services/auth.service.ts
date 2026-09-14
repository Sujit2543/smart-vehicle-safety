import { prisma } from '../config/database';
import { generateOtp } from '../utils/otp';
import { hashOtp, compareOtp, hashPassword, comparePassword } from '../utils/hash';
import { generateTokenPair } from '../utils/jwt';
import { AppError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { env } from '../config/env';
import { UserRole } from '@prisma/client';
import { logger } from '../utils/logger';
import { addSeconds } from '../utils/dateUtils';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    role: string;
    mobile?: string | null;
    email?: string | null;
    isNewUser: boolean;
    customerId?: string | null;
  };
}

// ─── OTP Flow ────────────────────────────────────────────────

export async function sendOtp(mobile: string): Promise<{ expiresIn: number; otp: string }> {
  // Clean up old unverified OTPs for this number
  await prisma.oTPVerification.deleteMany({
    where: { mobile, isVerified: false },
  });

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = addSeconds(new Date(), env.OTP_EXPIRY_SECONDS);

  await prisma.oTPVerification.create({
    data: { mobile, otpHash, expiresAt },
  });

  // OTP is always returned in the response — displayed on screen by the frontend.
  // No SMS is sent. This is the permanent design for this application.
  logger.info(`OTP generated for ${mobile}: ${otp}`);

  return { expiresIn: env.OTP_EXPIRY_SECONDS, otp };
}

export async function verifyOtp(mobile: string, otp: string): Promise<AuthResult> {
  const record = await prisma.oTPVerification.findFirst({
    where: {
      mobile,
      isVerified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw new AppError('OTP expired or not found. Please request a new OTP.', 400);
  }

  if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw new AppError('Maximum OTP attempts exceeded. Please request a new OTP.', 429);
  }

  const isValid = await compareOtp(otp, record.otpHash);
  if (!isValid) {
    await prisma.oTPVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = env.OTP_MAX_ATTEMPTS - (record.attempts + 1);
    throw new AppError(
      `Invalid OTP. ${remaining > 0 ? `${remaining} attempts remaining.` : 'No attempts remaining. Request a new OTP.'}`,
      400
    );
  }

  // Mark OTP as verified
  await prisma.oTPVerification.update({
    where: { id: record.id },
    data: { isVerified: true },
  });

  // Get or create user — always ensure the account is active
  let user = await prisma.user.findUnique({ where: { mobile } });
  const isNewUser = !user;

  if (!user) {
    user = await prisma.user.create({
      data: { mobile, role: UserRole.CUSTOMER, isActive: true },
    });
  } else {
    // Re-enable previously disabled accounts on successful OTP login
    // and always refresh lastLoginAt
    user = await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true, lastLoginAt: new Date() },
    });
  }

  // Check if customer profile exists — also re-enable if it was disabled
  let customer = await prisma.customer.findUnique({ where: { userId: user.id } });
  if (customer && !customer.isActive) {
    customer = await prisma.customer.update({
      where: { userId: user.id },
      data: { isActive: true },
    });
  }

  const tokens = generateTokenPair({
    userId: user.id,
    role: user.role,
    mobile,
  });

  // Store refresh token
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      expiresAt: addSeconds(new Date(), 7 * 24 * 60 * 60),
    },
  });

  return {
    ...tokens,
    user: {
      id: user.id,
      role: user.role,
      mobile: user.mobile,
      email: user.email,
      isNewUser,
      customerId: customer?.id ?? null,
    },
  };
}

// ─── Admin Login ──────────────────────────────────────────────

export async function adminLogin(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    throw new UnauthorizedError('Access denied');
  }

  if (!user.isActive) {
    throw new AppError('Account is disabled', 403);
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = generateTokenPair({
    userId: user.id,
    role: user.role,
    email,
  });

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      expiresAt: addSeconds(new Date(), 7 * 24 * 60 * 60),
    },
  });

  return {
    ...tokens,
    user: {
      id: user.id,
      role: user.role,
      mobile: user.mobile,
      email: user.email,
      isNewUser: false,
      customerId: null,
    },
  };
}

// ─── Refresh Token ────────────────────────────────────────────

export async function refreshTokens(refreshToken: string): Promise<{ accessToken: string }> {
  const { verifyRefreshToken } = await import('../utils/jwt');

  const payload = verifyRefreshToken(refreshToken);

  const session = await prisma.session.findUnique({ where: { refreshToken } });
  if (!session || session.isRevoked || session.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found or inactive');
  }

  const { signAccessToken } = await import('../utils/jwt');
  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    mobile: user.mobile ?? undefined,
    email: user.email ?? undefined,
  });

  return { accessToken };
}

// ─── Logout ───────────────────────────────────────────────────

export async function logout(refreshToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { refreshToken },
    data: { isRevoked: true },
  });
}

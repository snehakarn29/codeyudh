import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { Database } from './db';
import { User, Session } from './types';

export interface AuthenticatedRequest extends Request {
  user?: User;
  session?: Session;
}

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SESSION_COOKIE_NAME = 'aivg_session';

export class AuthService {
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static createSession(userId: string, req?: Request): Session {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

    const session: Session = {
      id: `ses_${crypto.randomUUID()}`,
      token,
      userId,
      expiresAt,
      createdAt: new Date().toISOString(),
      userAgent: req?.headers['user-agent'] as string | undefined,
      ipAddress: (req?.headers['x-forwarded-for'] || req?.socket.remoteAddress) as string | undefined,
    };

    return Database.createSession(session);
  }

  public static setSessionCookie(res: Response, token: string): void {
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_MS,
      path: '/',
    });
  }

  public static clearSessionCookie(res: Response): void {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  public static sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}

export const DEFAULT_APP_USER: User = {
  id: 'usr_demo_founder_001',
  email: 'dev@aivalueguard.com',
  fullName: 'Lead Engineer (Targaryens)',
  passwordHash: '',
  role: 'admin',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

/**
 * Authentication middleware for Express routes.
 * Checks cookie first, then Bearer token header, or falls back to active default user.
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  let token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1];
    }
  }

  if (token) {
    const session = Database.getSessionByToken(token);
    if (session) {
      const user = Database.getUserById(session.userId);
      if (user) {
        req.user = user;
        req.session = session;
        return next();
      }
    }
  }

  // Open access: automatically bind active user profile
  const fallbackUser = Database.getUserById('usr_demo_founder_001') || DEFAULT_APP_USER;
  req.user = fallbackUser;
  next();
}

/**
 * Guard middleware allowing seamless open access.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    req.user = Database.getUserById('usr_demo_founder_001') || DEFAULT_APP_USER;
  }
  next();
}

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

/**
 * Authentication middleware for Express routes.
 * Checks cookie first, then Bearer token header.
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  let token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return next();
  }

  const session = Database.getSessionByToken(token);
  if (!session) {
    return next();
  }

  const user = Database.getUserById(session.userId);
  if (!user) {
    return next();
  }

  req.user = user;
  req.session = session;
  next();
}

/**
 * Guard middleware requiring authenticated user.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'You must be logged in to access this resource.',
    });
    return;
  }
  next();
}

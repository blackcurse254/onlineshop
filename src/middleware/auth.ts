import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { adminAuth } from '../lib/firebase-admin.ts';
import { SESSION_COOKIE_NAME, verifySessionToken } from '../lib/security.ts';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  postalCode: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

const ADMIN_OWNER_EMAILS = new Set(['shayan.usefi6@gmail.com', 'admin@veraboutique.ir']);

async function syncFirebaseUser(uid: string, email: string, name?: string): Promise<AuthenticatedUser> {
  const defaultRole = ADMIN_OWNER_EMAILS.has(email.toLowerCase()) ? 'admin' : 'customer';
  const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);

  if (existing.length > 0) {
    const user = existing[0];
    return {
      id: user.id,
      uid: user.uid,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      address: user.address,
      postalCode: user.postalCode,
      role: user.role,
    };
  }

  const inserted = await db
    .insert(users)
    .values({
      uid,
      email: email.toLowerCase(),
      fullName: name || email.split('@')[0] || 'کاربر ورا',
      role: defaultRole,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        uid,
      },
    })
    .returning();

  const row = inserted[0];
  return {
    id: row.id,
    uid: row.uid,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    address: row.address,
    postalCode: row.postalCode,
    role: row.role,
  };
}

export async function resolveAuthUser(req: Request): Promise<AuthenticatedUser | undefined> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7).trim();
    if (idToken) {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        const email = decoded.email || `${decoded.uid}@firebase.local`;
        return await syncFirebaseUser(decoded.uid, email, decoded.name);
      } catch {
        return undefined;
      }
    }
  }

  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  const session = verifySessionToken(cookieToken);
  if (!session) return undefined;

  const found = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (found.length === 0) return undefined;
  const u = found[0];
  return {
    id: u.id,
    uid: u.uid,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    address: u.address,
    postalCode: u.postalCode,
    role: u.role,
  };
}

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    req.user = await resolveAuthUser(req);
  } catch (err) {
    console.error('Optional auth resolution failed:', err);
  }
  next();
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'برای انجام این عملیات باید وارد حساب کاربری شوید.' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    return res.status(401).json({ error: 'نشست کاربری نامعتبر است.' });
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'احراز هویت مدیر الزامی است.' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'شما مجوز دسترسی به پنل مدیریت را ندارید.' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('Admin verification error:', err);
    return res.status(403).json({ error: 'خطا در بررسی دسترسی مدیر.' });
  }
};

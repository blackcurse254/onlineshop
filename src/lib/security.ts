import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { rateLimits } from '../db/schema.ts';

declare global {
  var _veraDevSessionSecret: string | undefined;
}

function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim() || '';
  if (process.env.NODE_ENV === 'production') {
    if (envSecret.length < 32) {
      throw new Error(
        'FATAL SECURITY ERROR: SESSION_SECRET must be configured with at least 32 random characters in production.'
      );
    }
    return envSecret;
  }

  if (envSecret.length >= 16) {
    return envSecret;
  }

  if (!global._veraDevSessionSecret) {
    global._veraDevSessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return global._veraDevSessionSecret;
}

export function validateStartupSecurityConfig(): void {
  getSessionSecret();
}

export const SESSION_COOKIE_NAME = 'vera_session';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export interface SessionPayload {
  userId: number;
  uid: string;
  role: string;
  exp: number;
}

export function signSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const secret = getSessionSecret();
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed || typeof parsed.userId !== 'number' || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function sanitizeString(value: string): string {
  return value.replace(/[<>]/g, '').trim();
}

const memoryRateFallback = new Map<string, { hits: number; resetAt: number }>();

export async function consumeRateLimit(
  key: string,
  windowMs: number,
  max: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);

  try {
    const result = await db.execute<{ hits: number }>(sql`
      INSERT INTO rate_limits (key, hits, reset_at)
      VALUES (${key}, 1, ${nextReset})
      ON CONFLICT (key) DO UPDATE SET
        hits = CASE
          WHEN rate_limits.reset_at <= ${now} THEN 1
          ELSE rate_limits.hits + 1
        END,
        reset_at = CASE
          WHEN rate_limits.reset_at <= ${now} THEN ${nextReset}
          ELSE rate_limits.reset_at
        END
      RETURNING hits
    `);
    const hits = Number(result.rows[0]?.hits ?? 1);
    return { allowed: hits <= max, remaining: Math.max(0, max - hits) };
  } catch {
    const cur = memoryRateFallback.get(key);
    const nowMs = Date.now();
    if (!cur || cur.resetAt <= nowMs) {
      memoryRateFallback.set(key, { hits: 1, resetAt: nowMs + windowMs });
      return { allowed: true, remaining: max - 1 };
    }
    cur.hits += 1;
    return { allowed: cur.hits <= max, remaining: Math.max(0, max - cur.hits) };
  }
}

export function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    const { allowed } = await consumeRateLimit(key, options.windowMs, options.max);

    if (!allowed) {
      return res.status(429).json({
        error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند دقیقه دیگر تلاش کنید.',
      });
    }
    next();
  };
}

export function verifyCsrfOrigin(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      const allowedAppUrl = process.env.APP_URL ? new URL(process.env.APP_URL).host : null;
      if (originHost !== host && originHost !== allowedAppUrl) {
        return res.status(403).json({ error: 'درخواست نامعتبر (CSRF Origin mismatch).' });
      }
    } catch {
      return res.status(403).json({ error: 'هدر Origin نامعتبر است.' });
    }
  }
  next();
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (!origin) return next();

  const host = req.headers.host;
  const allowedHosts = new Set<string>();
  if (host) allowedHosts.add(host);
  if (process.env.APP_URL) {
    try {
      allowedHosts.add(new URL(process.env.APP_URL).host);
    } catch {
      // Ignore malformed APP_URL
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    allowedHosts.add('localhost:3000');
    allowedHosts.add('127.0.0.1:3000');
  }

  try {
    const originHost = new URL(origin).host;
    if (allowedHosts.has(originHost)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Vary', 'Origin');
    } else if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'دسترسی CORS برای این دامنه مجاز نیست.' });
    }
  } catch {
    return res.status(403).json({ error: 'هدر Origin نامعتبر است.' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

export function validateAndSaveImageBuffer(
  base64Data: string,
  uploadDir: string
): { publicPath: string; mimeType: string; sizeBytes: number } {
  const stripped = base64Data.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
  const buffer = Buffer.from(stripped, 'base64');

  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('حجم تصویر باید بین ۱ بایت تا ۲ مگابایت باشد.');
  }

  let ext = '';
  let mimeType = '';

  // Magic-byte verification (never trust filename or client MIME type alone)
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    ext = '.jpg';
    mimeType = 'image/jpeg';
  } else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    ext = '.png';
    mimeType = 'image/png';
  } else if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    ext = '.webp';
    mimeType = 'image/webp';
  } else {
    throw new Error('فرمت فایل نامعتبر است. فقط تصاویر JPG، PNG و WEBP مجاز هستند.');
  }

  fs.mkdirSync(uploadDir, { recursive: true });
  const safeName = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(uploadDir, safeName);
  fs.writeFileSync(fullPath, buffer);

  return {
    publicPath: `/uploads/${safeName}`,
    mimeType,
    sizeBytes: buffer.length,
  };
}

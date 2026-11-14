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

function isValidHostHeader(host: string | undefined): host is string {
  return Boolean(host && /^[a-zA-Z0-9.-]+(:\d{1,5})?$/.test(host));
}

function parseOriginUrl(raw: string | undefined): URL | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'MY_APP_URL' || trimmed === 'null') return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getAllowedOrigins(req?: Request): Set<string> {
  const allowed = new Set<string>();

  const appUrl = parseOriginUrl(process.env.APP_URL);
  if (appUrl) {
    allowed.add(appUrl.origin);
  }

  const extraOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
  for (const raw of extraOrigins) {
    const parsed = parseOriginUrl(raw);
    if (parsed) {
      allowed.add(parsed.origin);
    }
  }

  if (req) {
    const proto =
      req.headers['x-forwarded-proto'] === 'https' || req.secure ? 'https' : 'http';
    const candidateHosts = [
      req.headers.host,
      typeof req.headers['x-forwarded-host'] === 'string'
        ? req.headers['x-forwarded-host'].split(',')[0]?.trim()
        : undefined,
    ];
    for (const host of candidateHosts) {
      if (isValidHostHeader(host)) {
        allowed.add(`${proto}://${host}`);
        if (process.env.NODE_ENV !== 'production') {
          allowed.add(`http://${host}`);
        }
      }
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
  }

  return allowed;
}

export function validateStartupSecurityConfig(): void {
  getSessionSecret();

  const rawAppUrl = process.env.APP_URL?.trim();
  if (rawAppUrl && rawAppUrl !== 'MY_APP_URL' && !parseOriginUrl(rawAppUrl)) {
    throw new Error('FATAL SECURITY ERROR: APP_URL must be a valid http:// or https:// URL.');
  }

  const rawAllowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const item of rawAllowed) {
    if (!parseOriginUrl(item)) {
      throw new Error(`FATAL SECURITY ERROR: Invalid entry in ALLOWED_ORIGINS: ${item}`);
    }
  }
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

export function hashOpaqueToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
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

export function isSafeUrlOrPath(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  // Allow relative app paths (never protocol-relative //)
  if (trimmed.startsWith('/')) {
    return !trimmed.startsWith('//') && !/[\r\n]/.test(trimmed);
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export type RateLimitFailBehavior = 'fail-closed' | 'degraded-strict';

const degradedMemoryLimits = new Map<string, { hits: number; resetAt: number }>();

export async function consumeRateLimit(
  key: string,
  windowMs: number,
  max: number,
  failBehavior: RateLimitFailBehavior = 'fail-closed'
): Promise<{ allowed: boolean; remaining: number; dbUnavailable?: boolean }> {
  const now = new Date();
  const nextReset = new Date(now.getTime() + windowMs);

  try {
    // Opportunistically prune stale rows older than 24h to keep rate_limits compact
    if (Math.random() < 0.02) {
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      await db.execute(sql`DELETE FROM rate_limits WHERE reset_at < ${cutoff}`).catch(() => {});
    }

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
  } catch (err) {
    console.error('Rate-limit store failure:', err instanceof Error ? err.message : 'unknown');
    if (failBehavior === 'fail-closed') {
      return { allowed: false, remaining: 0, dbUnavailable: true };
    }
    const strictCap = Math.max(1, Math.min(3, Math.floor(max / 3)));
    const cur = degradedMemoryLimits.get(key);
    const nowMs = Date.now();
    if (!cur || cur.resetAt <= nowMs) {
      degradedMemoryLimits.set(key, { hits: 1, resetAt: nowMs + windowMs });
      return { allowed: true, remaining: strictCap - 1 };
    }
    cur.hits += 1;
    return { allowed: cur.hits <= strictCap, remaining: Math.max(0, strictCap - cur.hits) };
  }
}

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  failBehavior?: RateLimitFailBehavior;
}) {
  const failBehavior = options.failBehavior ?? 'fail-closed';
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${options.keyPrefix}:${ip}`;
    const result = await consumeRateLimit(key, options.windowMs, options.max, failBehavior);

    if (result.dbUnavailable) {
      return res.status(503).json({
        error: 'سرویس کنترل امنیت موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.',
      });
    }

    if (!result.allowed) {
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

  const secFetchSite = typeof req.headers['sec-fetch-site'] === 'string' ? req.headers['sec-fetch-site'] : '';
  if (secFetchSite === 'cross-site') {
    return res.status(403).json({ error: 'درخواست بین‌دامنه‌ای مجاز نیست (CSRF Blocked).' });
  }

  const allowedOrigins = getAllowedOrigins(req);
  const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
  const refererHeader = typeof req.headers.referer === 'string' ? req.headers.referer.trim() : '';

  if (originHeader) {
    const parsedOrigin = parseOriginUrl(originHeader);
    if (!parsedOrigin || !allowedOrigins.has(parsedOrigin.origin)) {
      return res.status(403).json({ error: 'درخواست نامعتبر (CSRF Origin mismatch).' });
    }
    return next();
  }

  if (refererHeader) {
    const parsedReferer = parseOriginUrl(refererHeader);
    if (!parsedReferer || !allowedOrigins.has(parsedReferer.origin)) {
      return res.status(403).json({ error: 'درخواست نامعتبر (CSRF Referer mismatch).' });
    }
    return next();
  }

  // Both Origin and Referer are missing: reject any cookie-authenticated mutation unless explicit Bearer token is presented
  const hasSessionCookie = Boolean(req.cookies?.[SESSION_COOKIE_NAME]);
  const hasBearerAuth =
    typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ');

  if (hasSessionCookie && !hasBearerAuth) {
    return res.status(403).json({
      error: 'درخواست مبتنی بر نشست بدون هدر معتبر Origin یا Referer مسدود شد.',
    });
  }

  next();
}

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
  if (!origin) return next();

  const parsedOrigin = parseOriginUrl(origin);
  const allowedOrigins = getAllowedOrigins(req);

  if (!parsedOrigin || !allowedOrigins.has(parsedOrigin.origin)) {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'دسترسی CORS برای این دامنه مجاز نیست.' });
    }
    return next();
  }

  res.setHeader('Access-Control-Allow-Origin', parsedOrigin.origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Protection');
  res.setHeader('Vary', 'Origin');

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

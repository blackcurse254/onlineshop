import nodemailer from 'nodemailer';

export type EmailProviderKind = 'none' | 'resend' | 'smtp';

export interface EmailServiceConfig {
  configured: boolean;
  provider: EmailProviderKind;
  from: string;
  resendApiKey?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
}

const EMAIL_PLACEHOLDERS = new Set([
  '',
  'MY_SMTP_HOST',
  'MY_SMTP_USER',
  'MY_SMTP_PASS',
  'MY_RESEND_API_KEY',
  'MY_EMAIL_FROM',
  'CHANGE_ME',
]);

function cleanEnvValue(raw: string | undefined): string {
  const val = (raw ?? '').trim();
  if (!val || EMAIL_PLACEHOLDERS.has(val)) {
    return '';
  }
  return val;
}

function isValidEmailFrom(fromValue: string): boolean {
  if (!fromValue) return false;
  const match = fromValue.match(/<([^>]+)>/);
  const address = (match ? match[1] : fromValue).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
}

export function getEmailServiceConfig(
  env: Record<string, string | undefined> = process.env
): EmailServiceConfig {
  const from = cleanEnvValue(env.EMAIL_FROM);
  if (!isValidEmailFrom(from)) {
    return { configured: false, provider: 'none', from: '' };
  }

  const resendApiKey = cleanEnvValue(env.RESEND_API_KEY);
  if (resendApiKey) {
    return {
      configured: true,
      provider: 'resend',
      from,
      resendApiKey,
    };
  }

  const host = cleanEnvValue(env.SMTP_HOST);
  const user = cleanEnvValue(env.SMTP_USER);
  const pass = cleanEnvValue(env.SMTP_PASS);
  const portRaw = cleanEnvValue(env.SMTP_PORT) || '587';
  const port = Number(portRaw);
  const secureRaw = cleanEnvValue(env.SMTP_SECURE).toLowerCase();
  const secure = secureRaw === 'true' || secureRaw === '1' || port === 465;

  if (host && user && pass && Number.isInteger(port) && port > 0 && port <= 65535) {
    return {
      configured: true,
      provider: 'smtp',
      from,
      smtp: { host, port, secure, user, pass },
    };
  }

  return { configured: false, provider: 'none', from: '' };
}

export function isEmailServiceConfigured(
  env: Record<string, string | undefined> = process.env
): boolean {
  return getEmailServiceConfig(env).configured;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildPasswordResetUrl(appUrl: string, rawToken: string): string {
  const trimmedBase = appUrl.trim().replace(/\/+$/, '') || 'http://localhost:3000';
  return `${trimmedBase}/account?tab=reset&token=${encodeURIComponent(rawToken)}`;
}

export function buildPasswordResetEmailContent(params: {
  storeName: string;
  recipientName: string;
  resetUrl: string;
  rawToken: string;
  expiresMinutes: number;
}): { subject: string; html: string; text: string } {
  const safeStore = escapeHtml(params.storeName || 'ADONIS');
  const safeName = escapeHtml(params.recipientName || 'کاربر گرامی');
  const safeUrl = escapeHtml(params.resetUrl);
  const safeToken = escapeHtml(params.rawToken);

  const subject = `بازیابی رمز عبور حساب کاربری ${params.storeName || 'ADONIS'}`;

  const text = [
    `${params.recipientName || 'کاربر گرامی'} سلام،`,
    `درخواست بازیابی رمز عبور برای حساب شما در فروشگاه ${params.storeName || 'ADONIS'} ثبت شده است.`,
    `این لینک یک‌بارمصرف است و تا ${params.expiresMinutes} دقیقه اعتبار دارد:`,
    params.resetUrl,
    `کد بازیابی یک‌بارمصرف: ${params.rawToken}`,
    'اگر شما این درخواست را ارسال نکرده‌اید، این ایمیل را نادیده بگیرید.',
  ].join('\n\n');

  const html = `<!doctype html>
<html lang="fa" dir="rtl">
<body style="margin:0;padding:24px;background:#EFEEEA;font-family:Tahoma,Arial,sans-serif;color:#16141A;">
  <div style="max-width:540px;margin:0 auto;background:#FFFFFF;border:1px solid #DAD8D3;border-radius:2px;padding:28px;">
    <div style="font-size:20px;font-weight:700;letter-spacing:2px;margin-bottom:16px;color:#16141A;">${safeStore}</div>
    <p style="font-size:14px;line-height:1.8;margin:0 0 12px;">${safeName} سلام،</p>
    <p style="font-size:14px;line-height:1.8;margin:0 0 20px;color:#4B4752;">
      درخواست بازیابی رمز عبور برای حساب کاربری شما ثبت شده است. لینک زیر فقط یک بار قابل استفاده است و پس از ${params.expiresMinutes} دقیقه منقضی می‌شود:
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${safeUrl}" style="display:inline-block;background:#C21E3C;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:2px;font-size:14px;font-weight:600;">
        تنظیم رمز عبور جدید
      </a>
    </div>
    <p style="font-size:12px;color:#6A6670;line-height:1.7;margin:0 0 8px;">
      در صورت نیاز می‌توانید کد یک‌بارمصرف زیر را در صفحه بازیابی وارد کنید:
    </p>
    <div dir="ltr" style="background:#EFEEEA;border:1px solid #CFCDC8;border-radius:2px;padding:10px 12px;font-family:monospace;font-size:12px;word-break:break-all;text-align:center;color:#16141A;">
      ${safeToken}
    </div>
    <p style="font-size:12px;color:#6A6670;line-height:1.7;margin:20px 0 0;">
      اگر این درخواست از طرف شما نبوده است، این پیام را نادیده بگیرید؛ رمز عبور فعلی شما تغییری نکرده است.
    </p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

export async function sendPasswordResetEmail(
  params: {
    to: string;
    recipientName: string;
    storeName: string;
    resetUrl: string;
    rawToken: string;
    expiresMinutes?: number;
  },
  env: Record<string, string | undefined> = process.env
): Promise<{ provider: Exclude<EmailProviderKind, 'none'>; messageId?: string }> {
  const cfg = getEmailServiceConfig(env);
  if (!cfg.configured || cfg.provider === 'none') {
    throw new Error('سرویس ارسال ایمیل روی سرور پیکربندی نشده است.');
  }

  const content = buildPasswordResetEmailContent({
    storeName: params.storeName,
    recipientName: params.recipientName,
    resetUrl: params.resetUrl,
    rawToken: params.rawToken,
    expiresMinutes: params.expiresMinutes ?? 15,
  });

  if (cfg.provider === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cfg.from,
        to: [params.to],
        subject: content.subject,
        html: content.html,
        text: content.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`ارسال ایمیل از طریق Resend ناموفق بود (${response.status}): ${errorText}`);
    }
    const payload = (await response.json().catch(() => ({}))) as { id?: string };
    return { provider: 'resend', messageId: payload.id };
  }

  const transporter = nodemailer.createTransport({
    host: cfg.smtp!.host,
    port: cfg.smtp!.port,
    secure: cfg.smtp!.secure,
    auth: {
      user: cfg.smtp!.user,
      pass: cfg.smtp!.pass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });

  const info = await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  return { provider: 'smtp', messageId: info.messageId };
}

import assert from 'node:assert/strict';
import net from 'node:net';
import test from 'node:test';
import {
  buildPasswordResetEmailContent,
  buildPasswordResetUrl,
  getEmailServiceConfig,
  isEmailServiceConfigured,
  sendPasswordResetEmail,
} from './mailer.ts';

test('isEmailServiceConfigured returns false when env is missing or placeholders are used', () => {
  assert.equal(isEmailServiceConfigured({}), false);
  assert.equal(
    isEmailServiceConfigured({
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'user',
      SMTP_PASS: 'pass',
      EMAIL_FROM: 'MY_EMAIL_FROM',
    }),
    false
  );
  assert.equal(
    isEmailServiceConfigured({
      SMTP_HOST: 'smtp.example.com',
      EMAIL_FROM: 'no-reply@adonis.ir',
    }),
    false
  );
  assert.equal(
    isEmailServiceConfigured({
      RESEND_API_KEY: 're_test_123',
      EMAIL_FROM: 'invalid-email',
    }),
    false
  );
});

test('getEmailServiceConfig detects valid SMTP and Resend configs cleanly', () => {
  const smtpCfg = getEmailServiceConfig({
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '2525',
    SMTP_SECURE: 'false',
    SMTP_USER: 'adonis_mailer',
    SMTP_PASS: 'secret-pass',
    EMAIL_FROM: 'ADONIS <no-reply@adonis.ir>',
  });
  assert.equal(smtpCfg.configured, true);
  assert.equal(smtpCfg.provider, 'smtp');
  assert.equal(smtpCfg.smtp?.port, 2525);

  const resendCfg = getEmailServiceConfig({
    RESEND_API_KEY: 're_live_example_key',
    EMAIL_FROM: 'no-reply@adonis.ir',
  });
  assert.equal(resendCfg.configured, true);
  assert.equal(resendCfg.provider, 'resend');
});

test('buildPasswordResetUrl and email template include one-time link & escape HTML', () => {
  const url = buildPasswordResetUrl('https://shop.adonis.ir/', 'abc123token');
  assert.equal(url, 'https://shop.adonis.ir/account?tab=reset&token=abc123token');

  const email = buildPasswordResetEmailContent({
    storeName: 'ADONIS <Shoes>',
    recipientName: 'مشتری <تست>',
    resetUrl: url,
    rawToken: 'abc123token',
    expiresMinutes: 15,
  });

  assert.match(email.subject, /ADONIS/);
  assert.ok(email.html.includes('ADONIS &lt;Shoes&gt;'));
  assert.ok(email.html.includes('https://shop.adonis.ir/account?tab=reset&amp;token=abc123token') || email.html.includes(url));
  assert.ok(email.text.includes(url));
  assert.ok(email.text.includes('abc123token'));
});

test('sendPasswordResetEmail fails fast when email service is unconfigured', async () => {
  await assert.rejects(
    () =>
      sendPasswordResetEmail(
        {
          to: 'user@example.com',
          recipientName: 'Test User',
          storeName: 'ADONIS',
          resetUrl: 'http://localhost:3000/account?tab=reset&token=xyz',
          rawToken: 'xyz',
        },
        {}
      ),
    /پیکربندی نشده/
  );
});

test('sendPasswordResetEmail delivers real SMTP message over socket', async () => {
  let capturedData = '';
  let inData = false;

  const server = net.createServer((socket) => {
    socket.write('220 localhost ESMTP Test\r\n');
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      while (buffer.includes('\r\n')) {
        const idx = buffer.indexOf('\r\n');
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        if (inData) {
          if (line === '.') {
            inData = false;
            socket.write('250 2.0.0 OK queued\r\n');
          } else {
            capturedData += line + '\n';
          }
          continue;
        }

        const upper = line.toUpperCase();
        if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
          socket.write('250-localhost\r\n250 AUTH PLAIN LOGIN\r\n');
        } else if (upper.startsWith('AUTH PLAIN')) {
          socket.write('235 2.7.0 Authentication successful\r\n');
        } else if (upper.startsWith('AUTH LOGIN')) {
          socket.write('334 VXNlcm5hbWU6\r\n');
        } else if (upper === 'DGVZDADVY' || upper.startsWith('DGVZ') || upper === 'DGVZDA==') {
          socket.write('235 2.7.0 OK\r\n');
        } else if (upper.startsWith('MAIL FROM:')) {
          socket.write('250 2.1.0 OK\r\n');
        } else if (upper.startsWith('RCPT TO:')) {
          socket.write('250 2.1.5 OK\r\n');
        } else if (upper === 'DATA') {
          inData = true;
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (upper === 'QUIT') {
          socket.write('221 2.0.0 Bye\r\n');
          socket.end();
        } else {
          socket.write('250 OK\r\n');
        }
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  try {
    const rawToken = '9f'.repeat(32);
    const resetUrl = buildPasswordResetUrl('http://localhost:3000', rawToken);
    const result = await sendPasswordResetEmail(
      {
        to: 'customer@adonis.ir',
        recipientName: 'آرش کریمی',
        storeName: 'ADONIS',
        resetUrl,
        rawToken,
      },
      {
        SMTP_HOST: '127.0.0.1',
        SMTP_PORT: String(address.port),
        SMTP_SECURE: 'false',
        SMTP_USER: 'test',
        SMTP_PASS: 'test',
        EMAIL_FROM: 'ADONIS <no-reply@adonis.ir>',
      }
    );

    assert.equal(result.provider, 'smtp');
    const normalizedPayload = capturedData
      .replace(/=\r?\n/g, '')
      .replaceAll('=3D', '=');
    assert.ok(normalizedPayload.includes('customer@adonis.ir'));
    assert.ok(normalizedPayload.includes(rawToken));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

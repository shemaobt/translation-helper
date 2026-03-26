import { Resend } from 'resend';
import { config } from '../config';

const resend = config.email.resendApiKey ? new Resend(config.email.resendApiKey) : null;

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string,
  firstName: string | null
): Promise<void> {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured — password reset email not sent to', toEmail);
    return;
  }

  const resetUrl = `${config.app.url}/reset-password?token=${resetToken}`;
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';

  await resend.emails.send({
    from: `${config.email.fromName} <${config.email.fromAddress}>`,
    to: toEmail,
    subject: 'Reset your password — Translation Helper',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1a1a1a; margin: 0;">Translation Helper</h2>
        </div>
        <p style="color: #333; font-size: 16px; line-height: 1.5;">${greeting}</p>
        <p style="color: #333; font-size: 16px; line-height: 1.5;">
          We received a request to reset your password. Click the button below to choose a new password:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #c2410c; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.5;">
          Or copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" style="color: #c2410c; word-break: break-all;">${resetUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px; line-height: 1.5;">
          This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">
          Translation Helper by Shema YWAM
        </p>
      </div>
    `,
  });
}

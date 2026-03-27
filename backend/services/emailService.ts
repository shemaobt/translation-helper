import { config } from '../config';

const { azureTenantId, azureClientId, azureClientSecret } = config.email;
const isConfigured = azureTenantId && azureClientId && azureClientSecret;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: azureClientId,
        client_secret: azureClientSecret,
        scope: 'https://graph.microsoft.com/.default',
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get Azure token: ${res.status} ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string,
  firstName: string | null
): Promise<void> {
  if (!isConfigured) {
    console.warn('Azure Graph API not configured — password reset email not sent to', toEmail);
    return;
  }

  const resetUrl = `${config.app.url}/reset-password?token=${resetToken}`;
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';

  const token = await getAccessToken();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${config.email.fromAddress}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: 'Reset your password — Translation Helper',
          body: {
            contentType: 'HTML',
            content: `
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
          },
          toRecipients: [{ emailAddress: { address: toEmail } }],
        },
        saveToSentItems: false,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API sendMail failed: ${res.status} ${text}`);
  }
}

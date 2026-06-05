import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.EMAIL_FROM ?? "UrApex <noreply@urapex.com>"

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await resend.emails.send({
    from:    FROM,
    to,
    subject: "Reset your UrApex password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#e4e4e7;">
        <h2 style="color:#fff;margin-bottom:8px;">Reset your password</h2>
        <p style="color:#a1a1aa;margin-bottom:24px;">
          Click the button below to set a new password. This link expires in 1 hour.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#06b6d4;color:#09090b;font-weight:700;
                  padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">
          Reset password
        </a>
        <p style="color:#71717a;font-size:12px;margin-top:24px;">
          If you didn't request this, you can safely ignore this email.
          This link will expire in 1 hour.
        </p>
        <p style="color:#71717a;font-size:12px;">
          Or copy this URL: ${resetUrl}
        </p>
      </div>
    `,
  })
}

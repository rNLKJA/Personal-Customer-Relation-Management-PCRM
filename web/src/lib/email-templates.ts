/**
 * E-mail bodies for the in-app "Demo inbox". The verification e-mail reproduces
 * the team's original `config/emailStyle.js` design (Dracula colours, gradient
 * "4399 CRM" heading, 5-minute warning). Nothing is actually sent: messages are
 * written to the `email_outbox` table instead of Gmail SMTP.
 */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function frame(content: string): string {
  return `
<div class='container' style='font-family: system-ui;background: #383A59;color:#f8f8f2;padding:0;margin:0;width:100%;min-height:100%'>
  <div class='heading' style="background-color: #282942;width: 100%;height: 80px;">
    <h1 style="text-align: left;padding: 20px;margin:0;"><span style="background:linear-gradient(120deg,#8be9fd,#ff79c6);-webkit-background-clip:text;background-clip: text;color: transparent;">4399 CRM</span></h1>
  </div>
  <div class='content' style="padding: 20px;">
    ${content}
    <br />
    <p style="color:white">Hope you have an wonderful day!</p>
    <p style="color:white">Best Regards.</p>
  </div>
  <div>
    <hr style='color:green' />
    <p style="text-align:right; padding:20px;color:#6272a4;margin:0;">COMP30022 IT Project Team 4399</p>
    <div class='color-bar' style="width: 100%;height: 10px;background-image: linear-gradient(120deg, #40b3ff, #d97aff);"></div>
  </div>
</div>`;
}

/** Port of `emailStyle(authCode)`. */
export function verificationEmailHtml(authCode: string): string {
  const code = escapeHtml(authCode);
  return frame(`
    <p style="color:white">Hey friend, How you doing?</p>
    <p style='user-select:none;color:white'>Here is your verification code, please enter your authentication code in <strong style="color:#ff5555;">5 minutes</strong>.</p>
    <h3 id='authCode' style='padding-left:20px;display:inline;color: #ff79c6;letter-spacing:4px;font-size:28px;' >${code}</h3>
    <p style='user-select:none;color:white'>If you didn't request this code, please go to your Personal Information page and change your password right away.</p>`);
}

export function fastRegisterEmailHtml(opts: {
  inviterName: string;
  inviteeName: string;
  link: string;
}): string {
  return frame(`
    <p style="color:white">Hi ${escapeHtml(opts.inviteeName)},</p>
    <p style="color:white">${escapeHtml(opts.inviterName)} added you as a contact in 4399 CRM and invited you to join.</p>
    <p style="color:white">Complete your register by access the link within <strong style="color:#ff5555;">15 minutes</strong>:</p>
    <p><a href="${escapeHtml(opts.link)}" style="color:#8be9fd;word-break:break-all;">${escapeHtml(opts.link)}</a></p>`);
}

export const EMAIL_SUBJECTS = {
  verification: "Vertify Your Email with Code",
  "password-reset": "Reset Your Password",
  "change-password": "Confirm your password change",
  "fast-register": "Complete your register by access the Link",
} as const;

export type EmailKind = keyof typeof EMAIL_SUBJECTS;

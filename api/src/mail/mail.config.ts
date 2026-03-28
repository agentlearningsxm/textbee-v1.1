const mailPort = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : 587

export const mailTransportConfig = {
  host: process.env.MAIL_HOST || 'localhost',
  port: mailPort,
  // secure=true for port 465 (SSL), false for 587/other (STARTTLS or no TLS)
  secure: mailPort === 465,
  // Only include auth if both user and pass are provided (MailHog needs no auth)
  ...(process.env.MAIL_USER && process.env.MAIL_PASS
    ? { auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } }
    : {}),
  // Disable TLS verification for local dev (MailHog)
  ...(mailPort === 1025 ? { tls: { rejectUnauthorized: false } } : {}),
}

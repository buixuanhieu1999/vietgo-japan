/**
 * Client-side EmailProvider interface documentation.
 * Actual sending happens in Edge Functions (Resend).
 * Swap provider server-side without changing call sites.
 */
export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ ok: boolean; id?: string; error?: string }>
}

/** Placeholder for future SES / SendGrid / SMTP adapters (server only). */
export type EmailProviderName = 'resend' | 'ses' | 'sendgrid' | 'smtp' | 'console'

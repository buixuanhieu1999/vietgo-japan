export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ id?: string; ok: boolean; error?: string }>
}

export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<{ id?: string; ok: boolean; error?: string }> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      // Do not log full body if it may contain PII in some providers
      return { ok: false, error: `resend_http_${res.status}` }
    }

    const data = (await res.json()) as { id?: string }
    return { ok: true, id: data.id }
  }
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<{ id?: string; ok: boolean; error?: string }> {
    console.log('[email:console]', {
      to: message.to,
      subject: message.subject,
      // Avoid logging full HTML with potential PII in production paths
      textPreview: (message.text ?? message.html).slice(0, 120),
    })
    return { ok: true, id: `console-${crypto.randomUUID()}` }
  }
}

export function getEmailProvider(): EmailProvider {
  const key = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')
  if (key && from) {
    return new ResendEmailProvider(key, from)
  }
  return new ConsoleEmailProvider()
}

export function bookingConfirmationEmail(params: {
  bookingCode: string
  contactName: string
  pickupDate: string
  pickupAddress: string
  dropoffAddress: string
  appUrl: string
}): EmailMessage {
  const subject = `[VietGo Japan] Xác nhận yêu cầu đặt xe ${params.bookingCode}`
  const text = [
    `Xin chào ${params.contactName},`,
    ``,
    `Chúng tôi đã nhận yêu cầu đặt xe của bạn.`,
    `Mã booking: ${params.bookingCode}`,
    `Ngày đón: ${params.pickupDate}`,
    `Đón: ${params.pickupAddress}`,
    `Đến: ${params.dropoffAddress}`,
    ``,
    `Tra cứu: ${params.appUrl}/tra-cuu-booking`,
    ``,
    `Đây là xác nhận đã nhận yêu cầu, chưa phải xác nhận chuyến cuối cùng.`,
  ].join('\n')

  const html = `<p>Xin chào <strong>${escapeHtml(params.contactName)}</strong>,</p>
<p>Chúng tôi đã nhận yêu cầu đặt xe của bạn.</p>
<ul>
<li><strong>Mã booking:</strong> ${escapeHtml(params.bookingCode)}</li>
<li><strong>Ngày đón:</strong> ${escapeHtml(params.pickupDate)}</li>
<li><strong>Đón:</strong> ${escapeHtml(params.pickupAddress)}</li>
<li><strong>Đến:</strong> ${escapeHtml(params.dropoffAddress)}</li>
</ul>
<p>Tra cứu trạng thái: <a href="${escapeHtml(params.appUrl)}/tra-cuu-booking">${escapeHtml(params.appUrl)}/tra-cuu-booking</a></p>
<p><em>Đây là xác nhận đã nhận yêu cầu, chưa phải xác nhận chuyến cuối cùng.</em></p>`

  return { to: '', subject, html, text }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

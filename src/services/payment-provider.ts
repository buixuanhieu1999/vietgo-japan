/**
 * Payment abstraction for future Stripe (or similar) integration.
 * MVP: cash / bank transfer / office — admin updates status only.
 * Never store card numbers in this application.
 */
export type PaymentProviderName = 'manual' | 'stripe'

export interface PaymentIntentInput {
  bookingId: string
  amountJpy: number
  currency?: 'JPY'
  metadata?: Record<string, string>
}

export interface PaymentProvider {
  readonly name: PaymentProviderName
  createIntent?(input: PaymentIntentInput): Promise<{ clientSecret?: string; id: string }>
  /** MVP path: no online charge; admin records payment_records rows. */
  supportsOnlineCharge: boolean
}

export class ManualPaymentProvider implements PaymentProvider {
  readonly name = 'manual' as const
  supportsOnlineCharge = false
}

export const paymentProvider: PaymentProvider = new ManualPaymentProvider()

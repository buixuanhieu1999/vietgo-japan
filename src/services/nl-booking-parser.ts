/**
 * Deterministic NL → booking draft parser (no LLM).
 * AI/LLM may only refine drafts later; never auto-submit.
 */

export interface BookingDraft {
  pickup_address?: string
  dropoff_address?: string
  pickup_date?: string
  pickup_time?: string
  passenger_count?: number
  adults_count?: number
  children_count?: number
  large_luggage?: number
  cabin_luggage?: number
  service_type?:
    | 'airport_transfer'
    | 'shared_ride'
    | 'intercity'
    | 'factory_shuttle'
    | 'private_charter'
    | 'other'
  notes?: string
  confidence: 'low' | 'medium' | 'high'
  warnings: string[]
}

const AIRPORT_HINTS: Record<string, string> = {
  narita: 'Narita Airport (NRT)',
  nrt: 'Narita Airport (NRT)',
  haneda: 'Haneda Airport (HND)',
  hnd: 'Haneda Airport (HND)',
  centrair: 'Chubu Centrair (NGO)',
  chubu: 'Chubu Centrair (NGO)',
  ngo: 'Chubu Centrair (NGO)',
  kansai: 'Kansai Airport (KIX)',
  kix: 'Kansai Airport (KIX)',
  itami: 'Osaka Itami (ITM)',
  fukuoka: 'Fukuoka Airport (FUK)',
  fuk: 'Fukuoka Airport (FUK)',
  chitose: 'New Chitose (CTS)',
  cts: 'New Chitose (CTS)',
  成田: 'Narita Airport (NRT)',
  羽田: 'Haneda Airport (HND)',
  セントレア: 'Chubu Centrair (NGO)',
  中部: 'Chubu Centrair (NGO)',
  関西: 'Kansai Airport (KIX)',
}

function parseDate(text: string): string | undefined {
  // 2026-08-14 or 14/8/2026 or 14/8
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/)
  if (iso) {
    return `${iso[1]}-${iso[2]!.padStart(2, '0')}-${iso[3]!.padStart(2, '0')}`
  }
  const dmy = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](20\d{2}))?\b/)
  if (dmy) {
    const year = dmy[3] ?? String(new Date().getFullYear())
    const day = dmy[1]!.padStart(2, '0')
    const month = dmy[2]!.padStart(2, '0')
    // Prefer JP/EU day-month when day > 12
    if (Number(dmy[1]) > 12) {
      return `${year}-${month}-${day}`
    }
    // ambiguous → treat as D/M
    return `${year}-${month}-${day}`
  }
  const vi = text.match(/ngày\s+(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](20\d{2}))?/i)
  if (vi) {
    const year = vi[3] ?? String(new Date().getFullYear())
    return `${year}-${vi[2]!.padStart(2, '0')}-${vi[1]!.padStart(2, '0')}`
  }
  return undefined
}

function parseTime(text: string): string | undefined {
  const m = text.match(/\b([01]?\d|2[0-3])[:hH]([0-5]\d)\b/)
  if (m) return `${m[1]!.padStart(2, '0')}:${m[2]}`
  const m2 = text.match(/lúc\s+(\d{1,2})\s*giờ(?:\s*(\d{1,2}))?/i)
  if (m2) {
    const h = m2[1]!.padStart(2, '0')
    const min = (m2[2] ?? '00').padStart(2, '0')
    return `${h}:${min}`
  }
  return undefined
}

function parseCount(text: string, patterns: RegExp[]): number | undefined {
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) return Number(m[1])
  }
  return undefined
}

function findAirport(text: string): string | undefined {
  const lower = text.toLowerCase()
  for (const [k, v] of Object.entries(AIRPORT_HINTS)) {
    if (lower.includes(k) || text.includes(k)) return v
  }
  return undefined
}

/**
 * Parse free text into a booking draft. Always requires human confirm.
 */
export function parseBookingNaturalLanguage(input: string): BookingDraft {
  const text = input.trim()
  const warnings: string[] = []
  if (!text) {
    return { confidence: 'low', warnings: ['empty_input'] }
  }

  const draft: BookingDraft = { confidence: 'low', warnings }

  const airport = findAirport(text)
  const passengers = parseCount(text, [
    /(\d+)\s*người/i,
    /(\d+)\s*people/i,
    /(\d+)\s*pax/i,
    /(\d+)\s*名/,
  ])
  const luggage = parseCount(text, [
    /(\d+)\s*vali/i,
    /(\d+)\s*kiện/i,
    /(\d+)\s*luggage/i,
    /(\d+)\s*bags?/i,
    /(\d+)\s*個/,
  ])

  // "đi X" / "to X" / "về X"
  const dest =
    text.match(/(?:đi|về|to|đến)\s+([A-Za-zÀ-ỹ\s]{2,40}?)(?:[,\.]|$|lúc|ngày|với)/i)?.[1]?.trim() ??
    text.match(/(?:名古屋|東京|大阪|岐阜|三重)/)?.[0]

  // "đón ... ở A" 
  const pickupPhrase =
    text.match(/(?:đón|pickup|from)\s+(?:tôi\s+)?(?:ở\s+|tại\s+)?([^,\.]+?)(?:\s+ngày|\s+lúc|,|$)/i)?.[1]
      ?.trim()

  draft.pickup_date = parseDate(text)
  draft.pickup_time = parseTime(text)
  if (passengers) {
    draft.passenger_count = passengers
    draft.adults_count = passengers
    draft.children_count = 0
  }
  if (luggage != null) draft.large_luggage = luggage

  if (airport) {
    draft.pickup_address = airport
    draft.service_type = 'airport_transfer'
  } else if (pickupPhrase && pickupPhrase.length > 2) {
    draft.pickup_address = pickupPhrase
  }

  if (dest) {
    draft.dropoff_address = dest
    if (!draft.service_type) draft.service_type = 'intercity'
  }

  if (airport && dest) draft.confidence = 'high'
  else if (draft.pickup_date && (draft.pickup_address || draft.dropoff_address)) {
    draft.confidence = 'medium'
  } else {
    draft.confidence = 'low'
    warnings.push('missing_fields')
  }

  if (!draft.pickup_date) warnings.push('date_not_parsed')
  if (!draft.pickup_address) warnings.push('pickup_not_parsed')
  if (!draft.dropoff_address) warnings.push('dropoff_not_parsed')

  draft.notes = `NL draft (heuristic): ${text.slice(0, 300)}`
  return draft
}

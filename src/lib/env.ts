function read(key: keyof ImportMetaEnv, fallback = ''): string {
  const value = import.meta.env[key]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

export const env = {
  appName: read('VITE_APP_NAME', 'VietGo Japan'),
  appUrl: read('VITE_APP_URL', typeof window !== 'undefined' ? window.location.origin : ''),
  supabaseUrl: read('VITE_SUPABASE_URL'),
  supabaseAnonKey: read('VITE_SUPABASE_ANON_KEY'),
  turnstileSiteKey: read('VITE_TURNSTILE_SITE_KEY'),
  contactPhone: read('VITE_CONTACT_PHONE'),
  contactEmail: read('VITE_CONTACT_EMAIL'),
  contactLineId: read('VITE_CONTACT_LINE_ID'),
  contactAddress: read('VITE_CONTACT_ADDRESS'),
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const

export function hasSupabaseConfig(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey)
}

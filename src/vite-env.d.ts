/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_APP_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_TURNSTILE_SITE_KEY: string
  readonly VITE_MAP_STYLE_URL: string
  readonly VITE_CONTACT_PHONE: string
  readonly VITE_CONTACT_EMAIL: string
  readonly VITE_CONTACT_LINE_ID: string
  readonly VITE_CONTACT_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

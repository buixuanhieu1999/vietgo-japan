import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, hasSupabaseConfig } from '@/lib/env'

/** Loosely typed client — schema enforced via migrations + Zod; avoid brittle generated types drift. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppDb = any

let client: SupabaseClient<AppDb> | null = null

export function getSupabase(): SupabaseClient<AppDb> {
  if (!hasSupabaseConfig()) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  if (!client) {
    client = createClient<AppDb>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

export function tryGetSupabase(): SupabaseClient<AppDb> | null {
  try {
    if (!hasSupabaseConfig()) return null
    return getSupabase()
  } catch {
    return null
  }
}

export async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const supabase = getSupabase()
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    throw new Error(error.message || 'function_invoke_failed')
  }
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: unknown }).error) {
    throw new Error(String((data as { error: string }).error))
  }
  return data as T
}

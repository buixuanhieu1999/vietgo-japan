import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

/**
 * Resolve the authenticated user from Authorization Bearer JWT.
 * Never trust client-supplied user_id.
 */
export async function getAuthUser(req: Request): Promise<User | null> {
  const header = req.headers.get('Authorization') ?? req.headers.get('authorization')
  if (!header?.toLowerCase().startsWith('bearer ')) {
    return null
  }
  const token = header.slice(7).trim()
  if (!token || token.length < 20) return null

  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) return null

  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { tryGetSupabase } from '@/lib/supabase'
import type { AppRole, Profile } from '@/types/database'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  roles: AppRole[]
  loading: boolean
  isAdmin: boolean
  isStaff: boolean
  isDriver: boolean
  hasRole: (role: AppRole) => boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: {
    email: string
    password: string
    full_name: string
    phone?: string
  }) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<AppRole[]>([])
  const [loading, setLoading] = useState(true)

  const loadUserData = useCallback(async (userId: string) => {
    const supabase = tryGetSupabase()
    if (!supabase) {
      setProfile(null)
      setRoles([])
      return
    }
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role, revoked_at').eq('user_id', userId),
    ])
    setProfile((profileRes.data as Profile | null) ?? null)
    const active = (rolesRes.data ?? [])
      .filter((r) => !r.revoked_at)
      .map((r) => r.role as AppRole)
    setRoles(active)
  }, [])

  useEffect(() => {
    const supabase = tryGetSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        void loadUserData(data.session.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next?.user) {
        void loadUserData(next.user.id)
      } else {
        setProfile(null)
        setRoles([])
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadUserData])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = tryGetSupabase()
    if (!supabase) throw new Error('not_configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(
    async (input: { email: string; password: string; full_name: string; phone?: string }) => {
      const supabase = tryGetSupabase()
      if (!supabase) throw new Error('not_configured')
      const { error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { full_name: input.full_name, phone: input.phone ?? '' },
        },
      })
      if (error) throw error
    },
    [],
  )

  const signOut = useCallback(async () => {
    const supabase = tryGetSupabase()
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadUserData(session.user.id)
  }, [loadUserData, session?.user])

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles])

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      roles,
      loading,
      isAdmin: roles.includes('admin') || roles.includes('super_admin'),
      isStaff:
        roles.includes('support_agent') ||
        roles.includes('dispatcher') ||
        roles.includes('admin') ||
        roles.includes('super_admin'),
      isDriver: roles.includes('driver'),
      hasRole,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [session, profile, roles, loading, hasRole, signIn, signUp, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

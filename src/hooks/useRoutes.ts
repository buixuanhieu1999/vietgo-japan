import { useQuery } from '@tanstack/react-query'
import { tryGetSupabase } from '@/lib/supabase'
import type { Route } from '@/types/database'

export function useRoutes() {
  return useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return [] as Route[]
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as Route[]
    },
  })
}

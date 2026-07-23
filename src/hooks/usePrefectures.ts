import { useQuery } from '@tanstack/react-query'
import { tryGetSupabase } from '@/lib/supabase'
import type { Prefecture } from '@/types/database'

const FALLBACK_PREFECTURES: Pick<Prefecture, 'id' | 'code' | 'name_vi' | 'name_ja' | 'sort_order'>[] =
  [
    { id: 'local-23', code: '23', name_vi: 'Aichi', name_ja: '愛知県', sort_order: 23 },
    { id: 'local-13', code: '13', name_vi: 'Tokyo', name_ja: '東京都', sort_order: 13 },
    { id: 'local-27', code: '27', name_vi: 'Osaka', name_ja: '大阪府', sort_order: 27 },
  ]

export function usePrefectures() {
  return useQuery({
    queryKey: ['prefectures'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return FALLBACK_PREFECTURES as Prefecture[]
      const { data, error } = await supabase
        .from('prefectures')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as Prefecture[]
    },
  })
}

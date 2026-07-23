import { useQuery } from '@tanstack/react-query'
import { tryGetSupabase } from '@/lib/supabase'
import type { Faq } from '@/types/database'

export function useFaqs() {
  return useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return [] as Faq[]
      const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_published', true)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as Faq[]
    },
  })
}

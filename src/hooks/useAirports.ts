import { useQuery } from '@tanstack/react-query'
import { tryGetSupabase } from '@/lib/supabase'
import type { Airport } from '@/types/database'

const FALLBACK: Airport[] = [
  {
    id: 'local-ngo',
    iata_code: 'NGO',
    name_vi: 'Sân bay quốc tế Chubu Centrair',
    name_ja: '中部国際空港',
    name_en: 'Chubu Centrair',
    prefecture_id: null,
    is_priority: true,
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'local-nrt',
    iata_code: 'NRT',
    name_vi: 'Sân bay quốc tế Narita',
    name_ja: '成田国際空港',
    name_en: 'Narita',
    prefecture_id: null,
    is_priority: true,
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'local-hnd',
    iata_code: 'HND',
    name_vi: 'Sân bay Haneda',
    name_ja: '羽田空港',
    name_en: 'Haneda',
    prefecture_id: null,
    is_priority: true,
    is_active: true,
    sort_order: 3,
  },
  {
    id: 'local-kix',
    iata_code: 'KIX',
    name_vi: 'Sân bay Kansai',
    name_ja: '関西国際空港',
    name_en: 'Kansai',
    prefecture_id: null,
    is_priority: true,
    is_active: true,
    sort_order: 4,
  },
  {
    id: 'local-itm',
    iata_code: 'ITM',
    name_vi: 'Sân bay Osaka Itami',
    name_ja: '伊丹空港',
    name_en: 'Itami',
    prefecture_id: null,
    is_priority: true,
    is_active: true,
    sort_order: 5,
  },
  {
    id: 'local-fuk',
    iata_code: 'FUK',
    name_vi: 'Sân bay Fukuoka',
    name_ja: '福岡空港',
    name_en: 'Fukuoka',
    prefecture_id: null,
    is_priority: true,
    is_active: true,
    sort_order: 6,
  },
  {
    id: 'local-cts',
    iata_code: 'CTS',
    name_vi: 'Sân bay New Chitose',
    name_ja: '新千歳空港',
    name_en: 'New Chitose',
    prefecture_id: null,
    is_priority: true,
    is_active: true,
    sort_order: 7,
  },
]

export function useAirports() {
  return useQuery({
    queryKey: ['airports'],
    queryFn: async () => {
      const supabase = tryGetSupabase()
      if (!supabase) return FALLBACK
      const { data, error } = await supabase
        .from('airports')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return ((data ?? []) as Airport[]).length > 0 ? (data as Airport[]) : FALLBACK
    },
  })
}

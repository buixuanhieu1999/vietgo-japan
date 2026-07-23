import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { tryGetSupabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Link } from 'react-router-dom'

interface ChunkHit {
  id: string
  source_type: string
  title: string | null
  body: string
  rank: number
}

/**
 * FAQ assistant — approved content only (search_content_chunks).
 * No legal advice, no price promises, no license claims.
 */
export function FaqAssistant() {
  const { i18n } = useTranslation()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<ChunkHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const locale = i18n.language?.startsWith('ja') ? 'ja' : 'vi'

  const search = async () => {
    setError(null)
    setHits([])
    const query = q.trim()
    if (query.length < 2) return
    const supabase = tryGetSupabase()
    if (!supabase) {
      setError('Backend chưa cấu hình')
      return
    }
    setLoading(true)
    try {
      const { data, error: err } = await supabase.rpc('search_content_chunks', {
        p_query: query,
        p_locale: locale,
        p_limit: 5,
      })
      if (err) throw err
      setHits((data ?? []) as ChunkHit[])
      if (!data?.length) {
        setError(null)
      }
    } catch {
      setError('Không tìm được câu trả lời từ tài liệu đã duyệt.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trợ lý FAQ (chỉ tài liệu đã duyệt)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert variant="info">
          Không tư vấn pháp lý · Không hứa giá · Không xác nhận giấy phép. Khi không chắc, tạo ticket hỗ
          trợ.
        </Alert>
        <Textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            locale === 'ja'
              ? '例：キャンセルはどうすればいいですか？'
              : 'Ví dụ: Hủy chuyến như thế nào? Có phải xe biển trắng không?'
          }
          rows={3}
        />
        <Button type="button" onClick={() => void search()} disabled={loading}>
          {loading ? <Spinner /> : null}
          Tìm trong tài liệu
        </Button>
        {error ? <Alert variant="warning">{error}</Alert> : null}
        {!loading && hits.length === 0 && q.trim().length >= 2 ? (
          <p className="text-sm text-navy-600">
            Không có kết quả đủ tin cậy.{' '}
            <Link to="/ho-tro-ho-so" className="text-brand-700 underline">
              Gửi ticket hỗ trợ
            </Link>
          </p>
        ) : null}
        <ul className="space-y-3">
          {hits.map((h) => (
            <li key={h.id} className="rounded-lg border border-navy-100 bg-navy-50/50 p-3 text-sm">
              <p className="font-semibold text-navy-900">{h.title ?? h.source_type}</p>
              <p className="mt-1 whitespace-pre-wrap text-navy-700">{h.body}</p>
              <p className="mt-2 text-xs text-navy-500">Nguồn: {h.source_type} (đã phê duyệt)</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

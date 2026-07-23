import { useState } from 'react'
import { parseBookingNaturalLanguage, type BookingDraft } from '@/services/nl-booking-parser'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface NlBookingDraftProps {
  onApply: (draft: BookingDraft) => void
}

/**
 * Natural language → draft only. User must review and submit the real form.
 */
export function NlBookingDraft({ onApply }: NlBookingDraftProps) {
  const [text, setText] = useState('')
  const [draft, setDraft] = useState<BookingDraft | null>(null)

  const run = () => {
    const d = parseBookingNaturalLanguage(text)
    setDraft(d)
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Nhập bằng ngôn ngữ tự nhiên (bản nháp)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert variant="warning">
          AI/heuristic chỉ tạo bản nháp. Không tự gửi booking, không tự đặt giá, không tự gán xe.
        </Alert>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Đón tôi ở Narita ngày 14/8 lúc 18:00, ba người, bốn vali, đi Nagoya."
        />
        <Button type="button" variant="secondary" onClick={run}>
          Phân tích bản nháp
        </Button>
        {draft ? (
          <div className="space-y-2 rounded-lg bg-navy-50 p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Độ tin cậy:</span>
              <Badge
                variant={
                  draft.confidence === 'high'
                    ? 'success'
                    : draft.confidence === 'medium'
                      ? 'warning'
                      : 'muted'
                }
              >
                {draft.confidence}
              </Badge>
            </div>
            <ul className="list-inside list-disc text-navy-800">
              {draft.pickup_address ? <li>Đón: {draft.pickup_address}</li> : null}
              {draft.dropoff_address ? <li>Đến: {draft.dropoff_address}</li> : null}
              {draft.pickup_date ? <li>Ngày: {draft.pickup_date}</li> : null}
              {draft.pickup_time ? <li>Giờ: {draft.pickup_time}</li> : null}
              {draft.passenger_count != null ? <li>Hành khách: {draft.passenger_count}</li> : null}
              {draft.large_luggage != null ? <li>Vali lớn: {draft.large_luggage}</li> : null}
              {draft.service_type ? <li>Loại: {draft.service_type}</li> : null}
            </ul>
            {draft.warnings.length > 0 ? (
              <p className="text-xs text-amber-800">Cảnh báo: {draft.warnings.join(', ')}</p>
            ) : null}
            <Button type="button" size="sm" onClick={() => onApply(draft)}>
              Điền vào form (vẫn phải kiểm tra & gửi)
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

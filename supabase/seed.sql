-- ============================================================
-- VietGo Japan — Seed data (development / demo)
-- Does NOT invent real company licenses or production passwords
-- ============================================================

-- 47 prefectures of Japan
INSERT INTO public.prefectures (code, name_ja, name_vi, name_en, region, sort_order) VALUES
  ('01', '北海道', 'Hokkaido', 'Hokkaido', 'Hokkaido', 1),
  ('02', '青森県', 'Aomori', 'Aomori', 'Tohoku', 2),
  ('03', '岩手県', 'Iwate', 'Iwate', 'Tohoku', 3),
  ('04', '宮城県', 'Miyagi', 'Miyagi', 'Tohoku', 4),
  ('05', '秋田県', 'Akita', 'Akita', 'Tohoku', 5),
  ('06', '山形県', 'Yamagata', 'Yamagata', 'Tohoku', 6),
  ('07', '福島県', 'Fukushima', 'Fukushima', 'Tohoku', 7),
  ('08', '茨城県', 'Ibaraki', 'Ibaraki', 'Kanto', 8),
  ('09', '栃木県', 'Tochigi', 'Tochigi', 'Kanto', 9),
  ('10', '群馬県', 'Gunma', 'Gunma', 'Kanto', 10),
  ('11', '埼玉県', 'Saitama', 'Saitama', 'Kanto', 11),
  ('12', '千葉県', 'Chiba', 'Chiba', 'Kanto', 12),
  ('13', '東京都', 'Tokyo', 'Tokyo', 'Kanto', 13),
  ('14', '神奈川県', 'Kanagawa', 'Kanagawa', 'Kanto', 14),
  ('15', '新潟県', 'Niigata', 'Niigata', 'Chubu', 15),
  ('16', '富山県', 'Toyama', 'Toyama', 'Chubu', 16),
  ('17', '石川県', 'Ishikawa', 'Ishikawa', 'Chubu', 17),
  ('18', '福井県', 'Fukui', 'Fukui', 'Chubu', 18),
  ('19', '山梨県', 'Yamanashi', 'Yamanashi', 'Chubu', 19),
  ('20', '長野県', 'Nagano', 'Nagano', 'Chubu', 20),
  ('21', '岐阜県', 'Gifu', 'Gifu', 'Chubu', 21),
  ('22', '静岡県', 'Shizuoka', 'Shizuoka', 'Chubu', 22),
  ('23', '愛知県', 'Aichi', 'Aichi', 'Chubu', 23),
  ('24', '三重県', 'Mie', 'Mie', 'Kansai', 24),
  ('25', '滋賀県', 'Shiga', 'Shiga', 'Kansai', 25),
  ('26', '京都府', 'Kyoto', 'Kyoto', 'Kansai', 26),
  ('27', '大阪府', 'Osaka', 'Osaka', 'Kansai', 27),
  ('28', '兵庫県', 'Hyogo', 'Hyogo', 'Kansai', 28),
  ('29', '奈良県', 'Nara', 'Nara', 'Kansai', 29),
  ('30', '和歌山県', 'Wakayama', 'Wakayama', 'Kansai', 30),
  ('31', '鳥取県', 'Tottori', 'Tottori', 'Chugoku', 31),
  ('32', '島根県', 'Shimane', 'Shimane', 'Chugoku', 32),
  ('33', '岡山県', 'Okayama', 'Okayama', 'Chugoku', 33),
  ('34', '広島県', 'Hiroshima', 'Hiroshima', 'Chugoku', 34),
  ('35', '山口県', 'Yamaguchi', 'Yamaguchi', 'Chugoku', 35),
  ('36', '徳島県', 'Tokushima', 'Tokushima', 'Shikoku', 36),
  ('37', '香川県', 'Kagawa', 'Kagawa', 'Shikoku', 37),
  ('38', '愛媛県', 'Ehime', 'Ehime', 'Shikoku', 38),
  ('39', '高知県', 'Kochi', 'Kochi', 'Shikoku', 39),
  ('40', '福岡県', 'Fukuoka', 'Fukuoka', 'Kyushu', 40),
  ('41', '佐賀県', 'Saga', 'Saga', 'Kyushu', 41),
  ('42', '長崎県', 'Nagasaki', 'Nagasaki', 'Kyushu', 42),
  ('43', '熊本県', 'Kumamoto', 'Kumamoto', 'Kyushu', 43),
  ('44', '大分県', 'Oita', 'Oita', 'Kyushu', 44),
  ('45', '宮崎県', 'Miyazaki', 'Miyazaki', 'Kyushu', 45),
  ('46', '鹿児島県', 'Kagoshima', 'Kagoshima', 'Kyushu', 46),
  ('47', '沖縄県', 'Okinawa', 'Okinawa', 'Okinawa', 47)
ON CONFLICT (code) DO NOTHING;

-- Priority airports
INSERT INTO public.airports (iata_code, name_ja, name_vi, name_en, prefecture_id, is_priority, sort_order)
SELECT v.iata, v.name_ja, v.name_vi, v.name_en, p.id, true, v.sort_order
FROM (VALUES
  ('NGO', '中部国際空港', 'Sân bay quốc tế Chubu Centrair', 'Chubu Centrair International Airport', '23', 1),
  ('NRT', '成田国際空港', 'Sân bay quốc tế Narita', 'Narita International Airport', '12', 2),
  ('HND', '東京国際空港（羽田）', 'Sân bay quốc tế Tokyo Haneda', 'Tokyo International Airport (Haneda)', '13', 3),
  ('KIX', '関西国際空港', 'Sân bay quốc tế Kansai', 'Kansai International Airport', '27', 4),
  ('ITM', '大阪国際空港（伊丹）', 'Sân bay Osaka Itami', 'Osaka International Airport (Itami)', '27', 5),
  ('FUK', '福岡空港', 'Sân bay Fukuoka', 'Fukuoka Airport', '40', 6),
  ('CTS', '新千歳空港', 'Sân bay New Chitose', 'New Chitose Airport', '01', 7)
) AS v(iata, name_ja, name_vi, name_en, pref_code, sort_order)
JOIN public.prefectures p ON p.code = v.pref_code
ON CONFLICT (iata_code) DO NOTHING;

-- Demo routes from Nagoya (reference only — prices are placeholders for UI, not real quotes)
INSERT INTO public.routes (code, name_vi, name_ja, description_vi, origin_prefecture_id, destination_prefecture_id, origin_label, destination_label, estimated_duration_minutes, base_price_jpy, is_active, is_public, sort_order)
SELECT
  r.code, r.name_vi, r.name_ja, r.description_vi,
  op.id, dp.id, r.origin_label, r.destination_label,
  r.duration, r.price, true, true, r.sort_order
FROM (VALUES
  ('NGO-AICHI', 'Centrair → khu vực Aichi', 'セントレア → 愛知県内', 'Đưa đón từ sân bay Chubu tới các khu vực tại Aichi (giá tham khảo).', '23', '23', 'Chubu Centrair (NGO)', 'Aichi', 60, NULL, 1),
  ('NGO-GIFU', 'Centrair → Gifu', 'セントレア → 岐阜', 'Xe ghép / riêng từ Centrair về Gifu (giá tham khảo).', '23', '21', 'Chubu Centrair (NGO)', 'Gifu', 90, NULL, 2),
  ('NGO-MIE', 'Centrair → Mie', 'セントレア → 三重', 'Đưa đón Centrair – Mie (giá tham khảo).', '23', '24', 'Chubu Centrair (NGO)', 'Mie', 100, NULL, 3),
  ('NAGOYA-FACTORY', 'Nagoya → nhà máy (demo)', '名古屋 → 工場（デモ）', 'Tuyến demo đưa công nhân / nhà máy quanh khu vực Tokai.', '23', '23', 'Nagoya / ga tàu', 'Nhà máy (khu vực Aichi)', 45, NULL, 4)
) AS r(code, name_vi, name_ja, description_vi, origin_code, dest_code, origin_label, destination_label, duration, price, sort_order)
JOIN public.prefectures op ON op.code = r.origin_code
JOIN public.prefectures dp ON dp.code = r.dest_code
ON CONFLICT (code) DO NOTHING;

-- Support service types (language / document prep only — not legal practice)
INSERT INTO public.support_service_types (code, name_vi, name_ja, description_vi, disclaimer_vi, sort_order) VALUES
  ('form_fill', 'Hỗ trợ điền biểu mẫu', '書類記入サポート', 'Hỗ trợ ngôn ngữ và hướng dẫn điền các biểu mẫu hành chính cơ bản.', 'Không phải tư vấn pháp lý hay đại diện pháp lý.', 1),
  ('appointment', 'Hỗ trợ đặt lịch', '予約サポート', 'Hỗ trợ đặt lịch làm việc với cơ quan / phòng ban khi được yêu cầu.', 'Không thay mặt bạn quyết định pháp lý.', 2),
  ('basic_translation', 'Hỗ trợ dịch thuật thông tin cơ bản', '基礎情報翻訳', 'Dịch / giải thích thông tin cơ bản trên giấy tờ để bạn tự quyết định.', 'Không phải dịch công chứng trừ khi có giấy phép tương ứng.', 3),
  ('address_reg', 'Hỗ trợ đăng ký địa chỉ', '住所登録サポート', 'Hướng dẫn chuẩn bị giấy tờ và quy trình đăng ký địa chỉ.', 'Bạn tự nộp hồ sơ tại cơ quan có thẩm quyền.', 4),
  ('insurance_proc', 'Hỗ trợ thủ tục bảo hiểm', '保険手続きサポート', 'Hướng dẫn chuẩn bị tài liệu và quy trình bảo hiểm xã hội / y tế cơ bản.', 'Không bán bảo hiểm; không tư vấn sản phẩm tài chính có cấp phép nếu chưa có giấy phép.', 5),
  ('pension_proc', 'Hỗ trợ thủ tục lương hưu', '年金手続きサポート', 'Hướng dẫn thủ tục liên quan lương hưu / nenkin ở mức hỗ trợ ngôn ngữ và hồ sơ.', 'Không phải đại lý nenkin có cấp phép.', 6),
  ('tax_docs', 'Hỗ trợ hồ sơ thuế', '税関連書類サポート', 'Hỗ trợ chuẩn bị và hiểu các giấy tờ thuế cơ bản.', 'Không cung cấp tư vấn thuế chuyên nghiệp nếu chưa có giấy phép.', 7),
  ('work_docs', 'Hỗ trợ giấy tờ đi làm', '就労書類サポート', 'Hỗ trợ chuẩn bị giấy tờ cần thiết khi đi làm / nhà máy.', 'Không thay thế bộ phận nhân sự của công ty.', 8),
  ('factory_onboarding', 'Hỗ trợ hồ sơ vào nhà máy', '工場入場書類サポート', 'Hướng dẫn checklist giấy tờ khi vào làm tại nhà máy.', 'Nội dung phụ thuộc yêu cầu từng nhà máy / công ty.', 9),
  ('bhp_placeholder', 'Hỗ trợ thủ tục BHP (tên chính thức cần xác nhận)', 'BHP手続きサポート（正式名称要確認）', 'Placeholder cho dịch vụ BHP. Tên và phạm vi chính xác sẽ được cập nhật sau khi doanh nghiệp xác nhận.', 'Chưa được mô tả là dịch vụ có cấp phép cho đến khi có giấy phép và tên chính thức.', 10),
  ('custom', 'Dịch vụ hỗ trợ tùy chỉnh', 'カスタムサポート', 'Danh mục do quản trị viên cấu hình thêm.', 'Phạm vi dịch vụ phải tuân thủ pháp luật Nhật Bản.', 99)
ON CONFLICT (code) DO NOTHING;

-- FAQs
INSERT INTO public.faqs (question_vi, question_ja, answer_vi, answer_ja, category, sort_order, is_published) VALUES
  (
    'VietGo Japan có phải nền tảng cho tài xế xe tư nhân không?',
    'VietGo Japanは白ナンバーの個人ドライバー向けですか？',
    'Không. Hệ thống chỉ nhận yêu cầu và điều phối qua đơn vị vận tải / tài xế đã được doanh nghiệp xác minh. Không cho tài xế tự do đăng ký và lập tức nhận chuyến.',
    'いいえ。許可を受けた運送事業者および社内で確認済みのドライバーのみが対応します。個人が自由に登録してすぐに配車を受ける仕組みではありません。',
    'legal',
    1,
    true
  ),
  (
    'Tôi có thể đặt xe từ sân bay Centrair (NGO) không?',
    '中部国際空港（セントレア）からの送迎はできますか？',
    'Có. Centrair (NGO) là sân bay ưu tiên. Bạn gửi yêu cầu trên form đặt xe; bộ phận điều phối sẽ liên hệ xác nhận.',
    'はい。セントレア（NGO）は優先空港です。予約フォームから依頼後、配車担当より確認のご連絡をします。',
    'airport',
    2,
    true
  ),
  (
    'Thanh toán như thế nào?',
    '支払い方法は？',
    'MVP hỗ trợ tiền mặt, chuyển khoản ngân hàng hoặc thanh toán tại văn phòng. Trạng thái thanh toán do quản trị viên cập nhật. Không thu thập số thẻ trên website.',
    '現金、銀行振込、または事務所払いが可能です。支払状況は管理者が更新します。カード番号はサイト上で取得しません。',
    'payment',
    3,
    true
  ),
  (
    'Hỗ trợ hồ sơ có phải tư vấn pháp lý không?',
    '書類サポートは法律相談ですか？',
    'Không. Chúng tôi hỗ trợ ngôn ngữ, chuẩn bị tài liệu và hướng dẫn thủ tục. Không tuyên bố tư vấn pháp lý hay đại diện pháp lý nếu chưa có giấy phép tương ứng.',
    'いいえ。言語サポート、書類準備、手続きの案内に限ります。許可がない限り法律相談・代理行為は行いません。',
    'support',
    4,
    true
  ),
  (
    'Làm sao tra cứu đơn đặt xe?',
    '予約の確認方法は？',
    'Dùng mã booking và email hoặc số điện thoại đã đăng ký trên trang Tra cứu booking.',
    '予約コードと登録したメールまたは電話番号で「予約確認」ページから照会できます。',
    'booking',
    5,
    true
  );

-- Site settings (placeholders — no invented legal entity data)
INSERT INTO public.site_settings (key, value, is_public, description) VALUES
  ('company.legal_name', '{"vi":"[Tên pháp nhân — cập nhật bởi quản trị viên]","ja":"[法人名 — 管理者更新]"}', true, 'Legal entity name placeholder'),
  ('company.address', '{"vi":"[Địa chỉ đầy đủ tại Nagoya, Aichi — cập nhật bởi quản trị viên]","ja":"[名古屋市の住所 — 管理者更新]"}', true, 'Headquarters address placeholder'),
  ('company.phone', '{"value":"[Số điện thoại — cập nhật]"}', true, 'Public phone placeholder'),
  ('company.email', '{"value":"[Email liên hệ — cập nhật]"}', true, 'Public email placeholder'),
  ('company.business_number', '{"value":"[Mã doanh nghiệp — cập nhật]"}', false, 'Business registration number — not public until verified'),
  ('company.transport_license', '{"value":"[Giấy phép vận tải — cập nhật sau xác minh]","verified":false}', false, 'Transport license — never show as licensed until verified'),
  ('company.representative', '{"value":"[Người đại diện — cập nhật]"}', false, 'Legal representative'),
  ('company.data_controller', '{"value":"[Người quản lý dữ liệu — cập nhật]"}', false, 'Data controller contact'),
  ('company.data_retention', '{"vi":"[Chính sách lưu giữ dữ liệu — cập nhật bởi quản trị viên]","ja":"[データ保持方針 — 管理者更新]"}', true, 'Data retention policy text'),
  ('features.public_licensed_claim', '{"enabled":false}', true, 'When false, UI must not claim licensed status publicly'),
  ('app.slogan', '{"vi":"Đồng hành cùng người Việt trên mọi hành trình tại Nhật Bản","ja":"日本でのあらゆる旅路に、ベトナム人と共に"}', true, 'Slogan')
ON CONFLICT (key) DO NOTHING;

-- Content pages (legal)
INSERT INTO public.content_pages (slug, title_vi, title_ja, body_vi, body_ja, meta_description_vi, is_published, published_at) VALUES
  ('terms', 'Điều khoản sử dụng', '利用規約',
   E'## Điều khoản sử dụng\n\nWebsite VietGo Japan cho phép gửi yêu cầu đặt xe và hỗ trợ hồ sơ tới doanh nghiệp vận hành hệ thống.\n\n### Phạm vi dịch vụ\n- Nhận yêu cầu vận chuyển và điều phối qua đơn vị / tài xế đã xác minh.\n- Không phải chợ mở cho tài xế xe tư nhân biển trắng nhận khách có thu tiền.\n\n### Trách nhiệm người dùng\n- Cung cấp thông tin chính xác.\n- Không sử dụng dịch vụ cho mục đích bất hợp pháp.\n\n### Thay đổi\nNội dung có thể được cập nhật. Phiên bản mới sẽ được đăng trên trang này.\n\n*[Placeholder — cần rà soát pháp lý trước khi kinh doanh.]*',
   E'## 利用規約\n\nVietGo Japanは、運送・書類サポートの依頼受付サイトです。\n\n*[法的レビュー前のプレースホルダー]*',
   'Điều khoản sử dụng VietGo Japan', true, now()),
  ('privacy', 'Chính sách quyền riêng tư', 'プライバシーポリシー',
   E'## Chính sách quyền riêng tư\n\nChúng tôi thu thập thông tin cần thiết để xử lý booking và hỗ trợ hồ sơ (họ tên, điện thoại, email, địa chỉ đón/trả, thông tin chuyến bay khi có).\n\n### Mục đích\n- Xử lý yêu cầu đặt xe và hỗ trợ.\n- Liên hệ xác nhận / thay đổi trạng thái.\n- Tuân thủ nghĩa vụ pháp lý.\n\n### Lưu giữ\nChính sách lưu giữ chi tiết: xem cấu hình site (placeholder quản trị viên).\n\n### Quyền của bạn\nBạn có thể yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu theo quy định áp dụng.\n\n*[Placeholder — cần rà soát pháp lý / APPI trước khi production.]*',
   E'## プライバシーポリシー\n\n予約・サポート対応に必要な個人情報を取得します。\n\n*[法的レビュー前のプレースホルダー]*',
   'Chính sách quyền riêng tư VietGo Japan', true, now()),
  ('cancellation', 'Chính sách hủy chuyến', 'キャンセルポリシー',
   E'## Chính sách hủy chuyến\n\n- Hủy bởi khách: theo khung giờ và điều kiện do điều phối xác nhận khi báo giá.\n- Hủy bởi nhà điều hành: sẽ thông báo và hỗ trợ phương án thay thế khi khả thi.\n\nChi tiết phí hủy (nếu có) được nêu rõ trên báo giá trước khi bạn xác nhận.\n\n*[Placeholder — cập nhật điều kiện kinh doanh thực tế.]*',
   E'## キャンセルポリシー\n\n*[プレースホルダー]*',
   'Chính sách hủy chuyến', true, now()),
  ('refund', 'Chính sách hoàn tiền', '返金ポリシー',
   E'## Chính sách hoàn tiền\n\nMVP chưa thu thanh toán thẻ online. Hoàn tiền (nếu áp dụng) thực hiện theo phương thức đã thanh toán và xác nhận của quản trị viên.\n\n*[Placeholder]*',
   E'## 返金ポリシー\n\n*[プレースホルダー]*',
   'Chính sách hoàn tiền', true, now()),
  ('baggage', 'Quy định hành lý', '手荷物規定',
   E'## Quy định hành lý\n\n- Khai báo số vali lớn và hành lý xách tay khi đặt xe.\n- Hành lý quá khổ / đặc biệt cần ghi chú trước.\n- Ghế trẻ em / xe lăn: yêu cầu khi đặt để điều phối chuẩn bị.\n\n*[Placeholder]*',
   E'## 手荷物規定\n\n*[プレースホルダー]*',
   'Quy định hành lý', true, now()),
  ('child-protection', 'Chính sách bảo vệ trẻ em', '児童保護方針',
   E'## Chính sách bảo vệ trẻ em\n\nTrẻ em nên đi cùng người lớn có trách nhiệm. Yêu cầu ghế trẻ em được ghi nhận trên form đặt xe.\n\n*[Placeholder — rà soát nội bộ trước khi công bố chính thức.]*',
   E'## 児童保護方針\n\n*[プレースホルダー]*',
   'Chính sách bảo vệ trẻ em', true, now()),
  ('legal-notice', 'Thông báo pháp lý', '法的通知',
   E'## Thông báo pháp lý\n\n- Tên pháp nhân, địa chỉ Nagoya, mã doanh nghiệp, giấy phép vận tải: **chưa công bố là đã xác minh** cho đến khi quản trị viên nhập và xác minh thông tin thật.\n- Dịch vụ hỗ trợ hồ sơ: hỗ trợ ngôn ngữ / chuẩn bị tài liệu / hướng dẫn thủ tục — không phải tư vấn pháp lý nếu chưa có giấy phép.\n\n*[Không bịa thông tin doanh nghiệp.]*',
   E'## 法的通知\n\n*[プレースホルダー]*',
   'Thông báo pháp lý', true, now()),
  ('complaints', 'Cơ chế khiếu nại', '苦情対応',
   E'## Cơ chế khiếu nại\n\nGửi khiếu nại qua form Liên hệ hoặc email hỗ trợ (sau khi được cấu hình).\nChúng tôi ghi nhận, phân công xử lý và phản hồi trong thời gian hợp lý.\n\n*[Placeholder]*',
   E'## 苦情対応\n\n*[プレースホルダー]*',
   'Cơ chế khiếu nại', true, now()),
  ('anti-illegal-transport', 'Cam kết chống vận tải trái phép', '違法運送防止の取り組み',
   E'## Cam kết chống vận tải trái phép\n\nVietGo Japan:\n1. Không thiết kế để cá nhân dùng xe tư nhân biển trắng nhận khách có thu tiền.\n2. Tài xế và phương tiện phải ở trạng thái xác minh (pending / verified / suspended / rejected).\n3. Mỗi tài xế gắn với đơn vị vận tải có hồ sơ giấy phép.\n4. Không hiển thị công khai “được cấp phép” khi chưa xác minh.\n\nBáo cáo nghi ngờ lạm dụng: dùng form Liên hệ.',
   E'## 違法運送防止の取り組み\n\n白ナンバーによる有償運送を想定した仕組みではありません。ドライバー・車両は確認済みのみ。',
   'Cam kết chống vận tải trái phép', true, now())
ON CONFLICT (slug) DO NOTHING;

-- NOTE: Admin demo user must be created via Auth in local dev only.
-- Do NOT seed production passwords here.
-- After local signup, promote with:
-- INSERT INTO user_roles (user_id, role) SELECT id, 'super_admin' FROM profiles WHERE email = 'admin@localhost.dev';

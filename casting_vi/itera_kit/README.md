# ITERA video system (Remotion + ITERA Video Kit v2)

Dựng 30 video theo lịch bằng code, dùng đúng asset của **ITERA Video Kit v2** (`../brand_kit`).

## Cấu trúc
- `src/brand/index.tsx` — token màu/chữ của kit (#09090C, đỏ #D93F3F chỉ cho trạng thái đang phát/CTA, Be Vietnam Pro + JetBrains Mono) và các khối dùng lại: `BrandBg`, `KitLayer`, `El`, `Mascot` (Nhịp, 0,4–0,8 s), `Caption` (nền phụ đề của kit, SemiBold), `Playhead` (vạch đỏ đang phát), `Label`, `EndCard` (mẫu E + sonic signature), `Sfx` (tick / reveal / signature).
- `src/days/DayNN.tsx` — một file cho mỗi ngày, đặt layout `10-layout-30-ngay/NN-*` làm lớp chính.
- `public/kit/` — asset copy từ kit. `public/dayNN/` — audio của từng ngày.
- `assets/gen.py` — tạo giọng hàng loạt qua ITERA API (preset: annhien, tram, minimax_south, capcut_sainu, capcut_hanu).
- `assets/stt.py` — kiểm tra phát âm + lấy mốc từng chữ cho phụ đề.

## Quy tắc (theo kit)
- Một điểm đỏ ưu tiên mỗi khung. Nội dung trong vùng an toàn x64–920, y240–1480.
- Hook ExtraBold 800, CTA Bold 700, phụ đề SemiBold 600, nhãn JetBrains Mono 500.
- Kết bằng end card "Giọng này làm bằng ITERA." + itera102.space. Không gắn mã giới thiệu/giảm giá khi chưa được duyệt.
- Cân âm lượng từng clip (-16 LUFS), bản xuất cuối -14 LUFS.

## Ngày 01
1. Thu câu: "Sáng nay mình dậy sớm, pha ly cà phê, và quyết định làm một việc mình đã trì hoãn cả năm."
2. `python3 assets/add_self.py ban_thu.m4a` (cần biến môi trường `API_Itera`).
3. `npx remotion render Day01 out/day01.mp4`

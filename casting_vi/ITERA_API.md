# ITERA API: hướng dẫn cho agent

Tài liệu cho agent (Claude Code, Codex, Cursor, …) gọi API giọng nói ITERA. Nội dung dựa trên các lần gọi thật trong tháng 11/2026, không chép từ trang quảng cáo.

- Base URL: `https://api.itera102.space`
- Dịch vụ: chuyển văn bản thành giọng nói (TTS) và chuyển giọng nói thành văn bản (STT), có giao diện tương thích ElevenLabs.
- Script dùng sẵn trong repo: `casting_vi/itera_kit/assets/gen.py` (TTS hàng loạt) và `casting_vi/itera_kit/assets/stt.py` (STT kèm thời gian từng từ).

---

## 1. Xác thực (bắt buộc đọc)

| Yêu cầu | Chi tiết |
|---|---|
| API key | Biến môi trường **`API_Itera`**. Đọc từ env, **không bao giờ** in ra, ghi log, commit hay dán vào chat. |
| Header key | `xi-api-key: <API_Itera>` |
| Header User-Agent | **Bắt buộc**, và không được để User-Agent mặc định của thư viện. ITERA nằm sau Cloudflare: gọi bằng UA mặc định sẽ bị **403 (Cloudflare 1010)**. Dùng ví dụ `User-Agent: tts-client/1.0`. |
| Thiếu key hoặc sai key | `401 {"error":"missing or invalid authentication credentials"}` |

Kiểm tra nhanh kết nối (miễn phí):

```bash
curl -sS https://api.itera102.space/v1/models \
  -H "xi-api-key: $API_Itera" -H "User-Agent: tts-client/1.0" | head -c 300
```

Kết quả đúng là JSON gồm 12 model. Nếu nhận về một trang HTML thì đường dẫn sai: ITERA trả trang web (status 200) cho mọi đường dẫn không tồn tại.

---

## 2. Text-to-Speech (TTS)

Quy trình bất đồng bộ: gửi yêu cầu, nhận `id`, rồi hỏi trạng thái cho tới khi xong, cuối cùng tải file âm thanh.

### 2.1 Gửi yêu cầu

`POST /v1/text-to-speech/{voice_id}`, `Content-Type: application/json`

```json
{
  "text": "Chào mọi người nha!",
  "provider": "elevenlabs",
  "model_id": "eleven_v3",
  "language_code": "vi",
  "voice_settings": {"stability": 0.5, "speed": 1.0},
  "export_transcript": false
}
```

Phản hồi: `{"id": "<uuid>", "status": "pending"}`

- `language_code` là **bắt buộc**. Thiếu thì nhận `400 {"error":"language_code is required"}`.
- `export_transcript: true` thì kết quả có thêm `result.srt_url`.

### 2.2 Hỏi trạng thái và tải kết quả

`GET /v1/history/{id}`

Các trường trả về: `id, status, progress, provider, model_id, voice_id, text, name, metadata, result, credits_deducted, characters_used, error, detail_error, created_at, updated_at`.

- `status` có các giá trị `pending`, `processing`, `completed`, `failed`.
- Khi `completed`, tải `result.audio_url` (MP3 44,1 kHz 192 kbps). Lệnh tải này cũng phải gửi kèm User-Agent.
- `metadata` cho biết các tuỳ chọn ITERA **thực sự áp dụng**. Dùng trường này để kiểm tra xem tuỳ chọn có bị bỏ qua không.

Liệt kê lịch sử: `GET /v1/history?page_size=N` trả về `{"tasks":[...], "has_more": bool}`.

### 2.3 Provider và tham số đã kiểm chứng

| provider | model_id | language_code | voice_settings | Thẻ cảm xúc `[laughs]` |
|---|---|---|---|---|
| `elevenlabs` | `eleven_v3` (khuyên dùng), `eleven_multilingual_v2`, `eleven_v4`, … (xem `/v1/models`) | `"vi"` | `stability` (v3 chỉ nhận 0.0 / 0.5 / 1.0; 0.0 biểu cảm nhất), `speed` (0.7–1.2) | **Có** (v3): `[excited] [laughs] [giggles] [sighs] [curious] [warmly] [softly]` được hiểu và **không bị đọc thành chữ** |
| `minimax` | `speech-2.8-hd` | `"Vietnamese"` | `speed`, `pitch`, `vol` (`emotion` **bị bỏ qua**) | **Không**: bỏ thẻ ra khỏi text |
| `capcut` | `capcut` | `"vi"` | `speed`, `pitch` | Không. Giọng CapCut tiếng Việt cho STT kém, hạn chế dùng |

### 2.4 Giọng đã dùng (tiếng Việt)

| Tên | provider | voice_id | Ghi chú |
|---|---|---|---|
| Ân | elevenlabs | `zIusdI28yOZPwIBus0aI` | Nữ trẻ, tươi, tinh nghịch. Giọng dẫn chính, hợp `stability 0.0` và `speed 1.05–1.15` |
| An Nhiên | elevenlabs | `8PEPqUGgvwN1Fk9KR8jV` | Nữ miền Nam khoảng 25 tuổi, dẫn chuyện |
| Trâm | elevenlabs | `6Xq32rHt6oAu98TBDKfr` | Nữ trưởng thành, ấm. Để `stability 0.0, speed 0.9` thì đọc tình cảm |
| Cẩm Hồng | elevenlabs | `x4KAhuXs2G8TfK9Zr7Q4` | Nữ |
| Dũng Anda | elevenlabs | `1spX5aWUTJxCVTQHaBi1` | Nam trung niên giọng Bắc, ấm, trầm |
| Dũng Trần | elevenlabs | `hNe03uL2BbiU3txTclei` | Nam, dẫn chuyện (chưa tạo thử) |
| Dũng (Poetic) | elevenlabs | `BUPPIXeDaJWBz696iXRS` | Nam, hợp quảng cáo (chưa tạo thử) |
| MiniMax South | minimax | `Vietnamese_Articulate_Assistant_v1` | Nữ miền Nam |
| CapCut Sài Nữ / Hà Nữ | capcut | `7491607853086544400` / `7491607926562361857` | STT nhận dạng kém |

Tìm thêm giọng: `GET /v1/shared-voices?language=vi&search=<tên>` trả về `{voices:[{voice_id,name,gender,age,accent,description,preview_url,…}], has_more}` (tối đa 30 giọng mỗi trang). Trường `preview_url` là file nghe thử miễn phí.

Giọng clone riêng có ID dạng UUID và có thể bị xoá trên tài khoản. Khi đó API báo `400 {"error":"voice is not ready (status: deleted)"}`. API không có endpoint nào cho biết một ID thuộc provider nào: gọi thử TTS và đọc `metadata.voice_name`. Một giọng clone tên "Dung" từng chạy với `minimax`.

---

## 3. Speech-to-Text (STT)

`POST /v1/speech-to-text`, gửi `multipart/form-data` gồm các trường:
- `file` (mp3/wav)
- `language_code=vi`
- `tag_audio_events=false`
- `keyterms=ITERA` (tuỳ chọn, giúp nhận đúng tên riêng)

Phản hồi: `{"task_id": "<uuid>"}`

`GET /v1/speech-to-text/{task_id}` trả về `status`. Khi `completed` thì có `result.text` và `result.words[] = {text, start, end, type}`. Trong mảng `words`, chỉ lấy các phần tử có `type == "word"`.

Cách dùng hiệu quả:
- **Kiểm tra phát âm của TTS.** Cho STT nghe lại từng câu. STT tự đưa từ địa phương về phổ thông ("tui"→"tôi", "hông"→"không"), nên những khác biệt kiểu này không phải lỗi.
- **Thời gian từng từ** dùng để canh phụ đề. STT chạy trên file đã cắt khoảng lặng thì mốc thời gian khớp với file đó.
- Âm thanh **chỉ có nhạc** khiến STT "bịa" ra câu kiểu *"Hãy subscribe cho kênh Ghiền Mì Gõ…"*. Gặp câu này nghĩa là không có lời nói.
- Giọng trẻ con hoặc nhiều tiếng ồn thì mốc thời gian bị dồn cục. Nên cắt thành các đoạn 3–4 giây rồi nhận dạng riêng, và **hỏi người dùng** những câu nghe không rõ, đừng đoán.

---

## 4. Credit và chi phí

- API **không có endpoint xem số dư**: `/v1/user`, `/v1/usage`, `/v1/user/subscription` đều trả về trang HTML. Người dùng xem số dư trên itera102.space.
- Chi phí thực tế khoảng **1 credit cho mỗi ký tự** của text, tính cả thẻ cảm xúc. Ví dụ một câu 46 ký tự tốn 54 credit, 6 câu kịch bản khoảng 30 giây video tốn 330–460 credit. Đọc `credits_deducted` trong history để biết số chính xác.
- **Yêu cầu bị lỗi vẫn có thể bị trừ credit.** Ví dụ gọi sai provider vẫn mất 29 credit.

---

## 5. Lỗi hay gặp và quy tắc an toàn

1. **Không gửi lại yêu cầu đang `processing`.** Máy chủ đôi khi xử lý rất chậm (từng mất khoảng 20 phút) nhưng job vẫn hoàn tất. Gửi lại nghĩa là **trả tiền hai lần**. Lưu `id` ngay khi gửi, rồi hỏi trạng thái với timeout dài (30 phút), chạy nền.
2. Không bọc **POST** trong vòng thử lại (retry) mù quáng. Chỉ thử lại các lệnh GET.
3. Viết text cho TTS theo **cách đọc**, chữ trên màn hình giữ nguyên:
   - "AI" viết thành **"ây ai"**, nếu không TTS sẽ đọc thành chữ "ai".
   - Số viết bằng chữ: "102" viết thành "một không hai", "3 hiệp" viết thành "ba hiệp".
   - Từ tiếng Anh viết theo cách đọc: "pyjama" viết thành "pi gia ma".
   - "ITERA" thì để "Itera" là đọc đúng.
4. Dấu `!` cuối câu đôi khi làm sai thanh (ví dụ "thu âm" bị đọc thành "thu ấm" với MiniMax). Gặp lỗi kiểu này thì đổi sang dấu chấm rồi tạo lại.
5. Trước khi đặt câu lên video, xử lý âm thanh nhẹ nhàng để giọng không bị rè: cắt khoảng lặng hai đầu, lọc tần số thấp 70 Hz, chỉnh âm lượng tuyến tính về −16 LUFS. **Không** nén động mạnh hay dùng bộ limiter gắt trên giọng.

---

## 6. Mẫu code tối thiểu (Python, chỉ thư viện chuẩn)

```python
import json, os, time, urllib.request

B = "https://api.itera102.space"
H = {"xi-api-key": os.environ["API_Itera"], "User-Agent": "tts-client/1.0"}

def call(method, path, body=None):
    req = urllib.request.Request(
        B + path, method=method,
        headers={**H, "Content-Type": "application/json"},
        data=json.dumps(body).encode() if body else None)
    return json.load(urllib.request.urlopen(req, timeout=60))

def tts(text, voice_id="zIusdI28yOZPwIBus0aI", out="out.mp3",
        provider="elevenlabs", model_id="eleven_v3", lang="vi",
        settings={"stability": 0.5, "speed": 1.0}, max_wait=1800):
    job = call("POST", f"/v1/text-to-speech/{voice_id}", {
        "text": text, "provider": provider, "model_id": model_id,
        "language_code": lang, "voice_settings": settings,
        "export_transcript": False})
    jid = job["id"]                      # lưu lại; KHÔNG gửi lại nếu chậm
    t0 = time.time()
    while time.time() - t0 < max_wait:
        h = call("GET", f"/v1/history/{jid}")
        if h["status"] == "completed":
            url = h["result"]["audio_url"]
            data = urllib.request.urlopen(
                urllib.request.Request(url, headers={"User-Agent": H["User-Agent"]}),
                timeout=120).read()
            open(out, "wb").write(data)
            return {"id": jid, "credits": h.get("credits_deducted"), "file": out}
        if h["status"] == "failed":
            raise RuntimeError(f"{jid}: {h.get('error')} {h.get('detail_error')}")
        time.sleep(4)
    raise TimeoutError(f"{jid} vẫn đang xử lý. Hỏi tiếp /v1/history/{jid}, đừng gửi lại")

if __name__ == "__main__":
    print(tts("[excited] Xin chào, đây là giọng Ân của Itera!"))
```

STT: xem `casting_vi/itera_kit/assets/stt.py`. Script đó gửi multipart thuần bằng thư viện chuẩn và ghi kết quả ra `<file>.words.json`.

---

## 7. Danh sách kiểm tra cho agent

- [ ] Có biến `API_Itera`. Nếu thiếu, nhờ người dùng thêm vào biến môi trường hoặc phần network secret của cloud environment. Không xin họ dán key vào chat.
- [ ] Mọi request đều có `User-Agent` tự đặt.
- [ ] Gọi `/v1/models` thấy trả về JSON thì mới gọi tiếp.
- [ ] Báo chi phí dự kiến (khoảng 1 credit/ký tự) trước các đợt tạo lớn.
- [ ] Lưu `id` của mọi job, không gửi lại job chậm.
- [ ] Cho STT nghe lại từng câu TTS và báo người dùng những chỗ nghe khác chữ gốc.
- [ ] Video dùng giọng AI thì ghi rõ "Voice by ITERA" hoặc "giọng đọc AI". Không giới thiệu giọng AI như giọng người thật.

# 🏋️ Exercise Diary

Ứng dụng ghi nhật ký tập thể dục theo **năm dương lịch**: mỗi buổi tập ghi rõ
**tập bài gì · bao nhiêu hiệp · mỗi hiệp bao nhiêu cái** (kèm mức tạ nếu có).

- 📱 **Android**: chạy bằng **Expo Go** (quét mã QR) hoặc build **APK** bằng EAS
- 🌐 **Web**: mở bằng link là dùng ngay, **không cần tải ứng dụng** — giao diện giống hệt bản app
- 🔐 **Đăng nhập bằng email + mã OTP 6 số** gửi qua email (Supabase Auth)
- ☁️ **Dữ liệu lưu trên Supabase** (PostgreSQL + Row Level Security — mỗi người chỉ thấy dữ liệu của mình)
- 💾 **Mã nguồn lưu trên GitHub**: `nguyenvanquynh215/nhat-ky-tap-luyen`

> **Chế độ demo:** nếu chưa điền khóa Supabase vào `.env`, app tự chạy demo —
> mã OTP hiện ngay trong app (giả lập email) và dữ liệu lưu trên máy, kèm sẵn
> dữ liệu mẫu để xem trước lịch năm/thống kê. Điền khóa Supabase vào là app
> tự chuyển sang chế độ thật, không cần sửa code.

---

## Tính năng

| Màn hình | Nội dung |
|---|---|
| 🏠 Trang chủ | Chuỗi ngày tập liên tiếp (streak 🔥), buổi tập hôm nay, biểu đồ 7 ngày, đồng hồ nghỉ giữa hiệp 30s–3 phút |
| 📅 Lịch năm | **Lịch nhiệt cả năm dương lịch** kiểu GitHub (53 tuần × 7 ngày) + chế độ 12 lịch tháng; chạm vào ngày để xem/ghi buổi tập của ngày đó; chuyển năm ‹ › |
| 📖 Nhật ký | Danh sách theo tháng, tìm kiếm, lọc theo năm & bài tập, sửa/xóa từng buổi |
| 📈 Thống kê | Tổng hiệp/cái theo năm, biểu đồ 12 tháng, xếp hạng bài tập, kỷ lục cá nhân (ngày tập nhiều nhất, buổi lớn nhất, thứ hay tập nhất), tổng khối lượng tạ |
| 👤 Cá nhân | Chia sẻ link app & thành tích, xuất CSV/JSON, nhập lại JSON, xóa dữ liệu, đăng xuất |

Ghi buổi tập: 18 bài có sẵn (Hít đất, Squat, Kéo xà, Gập bụng, Deadlift...) +
tự thêm bài mới, mẫu hiệp nhanh (3×10, 4×12, 5×5, kim tự tháp...), mỗi hiệp
chỉnh số cái bằng nút +/− và ô tạ kg, nhân đôi/xóa hiệp.

## Cấu trúc dữ liệu (Supabase)

Bảng `workout_entries`: `workout_date` (date — lịch dương), `exercise_name`,
`category`, `sets` (JSONB: `[{"reps":15,"weight_kg":null}, ...]` — độ dài mảng
= số hiệp, `reps` = số cái của hiệp đó), `notes`. Kèm bảng `profiles`,
`exercises` và view `yearly_stats`. Toàn bộ schema + RLS nằm trong
[`supabase/schema.sql`](supabase/schema.sql).

## 1) Nối Supabase thật (≈5 phút)

1. Vào [supabase.com](https://supabase.com) → **New project** (đặt tên tùy ý).
2. Project → **SQL Editor** → **New query** → dán toàn bộ nội dung
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. **Authentication → Providers → Email**: bật Email và cho phép đăng nhập
   bằng OTP/magic link. (Template email mặc định của Supabase đã chứa mã
   `{{ .Token }}` 6 số — app dùng `verifyOtp` loại `email`.)
4. **Project Settings → API**: copy **Project URL** và **anon public key**.
5. Tạo file `.env` từ mẫu và điền 2 khóa:

```bash
cp .env.example .env
# EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

6. Chạy lại app (`npx expo start -c`) — app tự nhận diện và dùng OTP email thật.
   ⚠️ Quan trọng: mỗi lần sửa file `.env`, phải xóa cache khi chạy/build lại
   (`npx expo start -c` hoặc `npx expo export --clear`), nếu không app vẫn
   dùng giá trị cũ đã lưu trong cache của Metro.
7. Mẫu email OTP — BẮT BUỘC làm bước này thì email mới có MÃ 6 SỐ:
   Template Magic Link mặc định của project mới **chỉ chứa link đăng nhập,
   không có mã OTP** (đã kiểm chứng thực tế 29/10/2026), và project free tạo
   từ 06/2026 bị **khóa sửa template** cho tới khi cấu hình SMTP riêng.
   Vì vậy hãy làm theo thứ tự:
   a) Tạo **App Password** cho Gmail của bạn (cần bật xác minh 2 bước):
      https://myaccount.google.com/apppasswords → tạo, copy mật khẩu 16 ký tự.
   b) Supabase → **Project Settings → Authentication → SMTP Settings** →
      bật Custom SMTP: Host `smtp.gmail.com`, Port `465`, Username = Gmail
      của bạn, Password = App Password vừa tạo, Sender email = Gmail của bạn,
      Sender name = `Exercise Diary`. Bấm Save. (Từ lúc này email cũng gửi
      được cho mọi địa chỉ, không chỉ thành viên project.)
   c) Mở **Authentication → Emails → Magic Link**
      (link trực tiếp: `https://supabase.com/dashboard/project/<ref>/auth/templates`)
      — nay đã sửa được. Đặt Subject: `Exercise Diary sign-in code` và
      thay nội dung bằng mẫu trong file `supabase/email-template-magic-link.html`
      của repo (có sẵn cả mã `{{ .Token }}` lớn rõ ràng và link dự phòng).

## 2) Chạy thử bằng Expo Go (Android)

```bash
npm install
npx expo start
```

Mở app **Expo Go** trên điện thoại Android → **quét mã QR** hiện trên màn hình
máy tính → app mở ngay. (Điện thoại và máy tính nên cùng mạng Wi-Fi; nếu khác
mạng dùng `npx expo start --tunnel`.)

## 3) Build file APK cài trực tiếp (không qua CH Play)

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview   # ra file .apk, có link tải + QR
```

## 4) Deploy bản Web để chia sẻ link

```bash
npx expo export --platform web   # xuất ra thư mục dist/
```

Kéo-thả thư mục `dist/` lên **Netlify Drop** (hoặc deploy lên Vercel / GitHub
Pages) → nhận link dạng `https://....netlify.app`. Gửi link cho bất kỳ ai:
mở link là thấy giao diện web đầy đủ tính năng, không cần cài app.
Điền link đó vào `EXPO_PUBLIC_APP_WEB_URL` trong `.env` để nút
**Chia sẻ ứng dụng** trong app gửi đúng link của bạn.

> Bản web xem thử nhanh tại chỗ: `npx expo start --web`

## 5) Đẩy code lên GitHub

```bash
git init && git add . && git commit -m "Exercise Diary v1.0 — Expo + Supabase OTP"
git branch -M main
git remote add origin https://github.com/nguyenvanquynh215/nhat-ky-tap-luyen.git
git push -u origin main
```

(File `.env` chứa khóa đã được `.gitignore` chặn — chỉ đẩy `.env.example`.)

## Lưu ý về file icon (assets/*.png)

4 file PNG trong thư mục `assets/` là file nhị phân nên **không đẩy qua
được bộ kết nối GitHub của Muse** — bản trên GitHub chỉ gồm mã nguồn.
Khi clone repo về, tạo lại icon bằng 1 lệnh (cần Python + Pillow):

```bash
pip install pillow && python scripts/make_icons.py
```

(Các file PNG gốc cũng có sẵn trong file ZIP mã nguồn Muse đã giao.)

## Công nghệ

Expo SDK 53 · React Native 0.79 · React 19 · TypeScript · Supabase JS v2
(Auth OTP + PostgreSQL + RLS) · AsyncStorage (lưu offline / chế độ demo).

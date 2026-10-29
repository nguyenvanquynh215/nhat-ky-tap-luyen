-- ═══════════════════════════════════════════════════════════════════════════
--  NHẬT KÝ TẬP LUYỆN — Schema Supabase
--  Cách dùng: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file
--  này vào → Run. Chạy 1 lần duy nhất khi tạo project.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── Hồ sơ người dùng (tự tạo khi đăng nhập OTP lần đầu) ────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Bài tập tự tạo của từng người dùng ─────────────────────────────────────
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'Khác',
  icon text not null default '⭐',
  unit text not null default 'cái',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ─── Nhật ký buổi tập ────────────────────────────────────────────────────────
-- workout_date : ngày tập theo LỊCH DƯƠNG (date, không kèm giờ → không lệch múi giờ)
-- sets         : mảng JSON các hiệp, ví dụ:
--                [{"reps": 15, "weight_kg": null}, {"reps": 12, "weight_kg": 20}]
--                → số hiệp = jsonb_array_length(sets); mỗi hiệp bao nhiêu cái = reps
create table if not exists public.workout_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_name text not null,
  category text not null default 'Khác',
  workout_date date not null,
  sets jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_entries_sets_is_array check (jsonb_typeof(sets) = 'array')
);

create index if not exists idx_workout_entries_user_date
  on public.workout_entries (user_id, workout_date desc);
create index if not exists idx_workout_entries_user_exercise
  on public.workout_entries (user_id, exercise_name);
create index if not exists idx_exercises_user
  on public.exercises (user_id);

-- ─── Tự động tạo profile khi có user mới (đăng nhập OTP lần đầu) ────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Row Level Security: mỗi người CHỈ thấy dữ liệu của mình ────────────────
alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_entries enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "exercises_all_own" on public.exercises;
create policy "exercises_all_own" on public.exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workout_entries_all_own" on public.workout_entries;
create policy "workout_entries_all_own" on public.workout_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── View thống kê theo năm dương lịch (tiện tra cứu trong Dashboard) ───────
-- security_invoker = true: view chạy theo quyền của NGƯỜI ĐANG TRUY VẤN nên
-- RLS của bảng gốc được áp dụng — mỗi người chỉ thấy số liệu của chính mình.
-- (Nếu thiếu tùy chọn này, Supabase Security Advisor sẽ cảnh báo CRITICAL
--  "Security Definer View" vì view mặc định chạy theo quyền của người tạo.)
create or replace view public.yearly_stats
  with (security_invoker = true) as
select
  user_id,
  extract(year from workout_date)::int as calendar_year,
  count(*)::int as total_sessions,
  count(distinct workout_date)::int as active_days,
  coalesce(sum(jsonb_array_length(sets)), 0)::int as total_sets,
  coalesce(sum((
    select coalesce(sum((s ->> 'reps')::numeric), 0)
    from jsonb_array_elements(sets) as s
  )), 0)::int as total_reps
from public.workout_entries
group by user_id, extract(year from workout_date);

-- Xong! Tiếp theo trong Dashboard:
-- 1) Authentication → Providers → Email: bật "Email", bật đăng nhập bằng OTP/magic link.
-- 2) Authentication → Email Templates → Magic Link: đảm bảo template chứa {{ .Token }}
--    để email có MÃ 6 SỐ (mặc định của Supabase đã có sẵn {{ .Token }}).
-- 3) Project Settings → API: copy Project URL + anon key vào file .env của app.

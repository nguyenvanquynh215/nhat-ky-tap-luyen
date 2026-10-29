-- ═══════════════════════════════════════════════════════════════════════════
--  BẢN VÁ: Supabase Security Advisor cảnh báo CRITICAL
--  "Security Definer View — public.yearly_stats"
--
--  Nguyên nhân: view tạo ở bản schema đầu tiên chưa đặt security_invoker,
--  nên view chạy theo quyền của người tạo view thay vì người đang truy vấn,
--  khiến RLS có thể bị vượt qua khi xem thống kê gộp.
--
--  Cách dùng: Supabase Dashboard → SQL Editor → New query → dán toàn bộ
--  file này → Run. Chạy xong vào lại mục Advisors, cảnh báo sẽ biến mất.
--  Dữ liệu và các bảng khác không bị ảnh hưởng gì.
-- ═══════════════════════════════════════════════════════════════════════════

drop view if exists public.yearly_stats;

create view public.yearly_stats
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

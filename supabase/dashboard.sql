-- ═══════════════════════════════════════════════════════════════════════════
--  EXERCISE DIARY — Dashboard quản trị: phân quyền + truy vấn người đăng ký
--  Cách dùng: Supabase Dashboard → SQL Editor → New query → dán toàn bộ file
--  này vào → Run. Chạy 1 lần duy nhất (chạy lại cũng an toàn, không mất dữ liệu).
--
--  Thiết kế bảo mật:
--  - KHÔNG dùng service_role key ở phía web. Mọi truy vấn đi qua các hàm
--    (RPC) "security definer" bên dưới; mỗi hàm tự kiểm tra quyền của người
--    đang đăng nhập theo email trước khi trả dữ liệu.
--  - Bảng dashboard_access bật RLS và KHÔNG có policy nào → không ai đọc/ghi
--    trực tiếp được, chỉ các hàm này mới chạm vào được.
--  - Quyền được cấp theo EMAIL: cấp quyền trước cả khi người đó có tài khoản
--    cũng được — khi họ đăng nhập dashboard bằng đúng email đó (mã OTP),
--    quyền tự động có hiệu lực.
--
--  3 cấp quyền:
--  - admin   : toàn quyền — xem danh sách + thống kê, cấp/thu hồi quyền.
--  - manager : xem danh sách người đăng ký + thống kê chi tiết.
--  - viewer  : chỉ xem danh sách cơ bản (email, ngày đăng ký, lần đăng nhập).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Bảng phân quyền truy cập dashboard ─────────────────────────────────────
create table if not exists public.dashboard_access (
  email      text primary key,
  role       text not null check (role in ('admin', 'manager', 'viewer')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_access enable row level security;
revoke all on table public.dashboard_access from public, anon, authenticated;

-- ─── Hàm nội bộ: quyền của người đang đăng nhập (null = không có quyền) ────
create or replace function public.dashboard_role()
returns text
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_email text;
  v_role  text;
begin
  if auth.uid() is null then
    return null;
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return null;
  end if;
  select role into v_role from public.dashboard_access where email = v_email;
  return v_role;
end;
$$;

revoke execute on function public.dashboard_role() from public, anon, authenticated;

-- ─── Người dùng tự kiểm tra quyền của mình sau khi đăng nhập ────────────────
create or replace function public.my_dashboard_role()
returns text
language sql
security definer set search_path = public
stable
as $$
  select public.dashboard_role();
$$;

-- ─── Danh sách người đã đăng ký ứng dụng ────────────────────────────────────
-- Mọi cấp quyền đều gọi được. Thống kê tập luyện chỉ trả số thật cho
-- admin/manager; viewer nhận null ở các cột thống kê.
create or replace function public.admin_list_users(
  p_search text default '',
  p_limit  int  default 50,
  p_offset int  default 0
)
returns table (
  user_id        uuid,
  email          text,
  display_name   text,
  registered_at  timestamptz,
  last_sign_in   timestamptz,
  confirmed      boolean,
  total_sessions bigint,
  active_days    bigint,
  total_sets     bigint,
  total_reps     bigint,
  last_workout   date,
  total_count    bigint
)
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_role text := public.dashboard_role();
begin
  if v_role is null then
    raise exception 'Bạn không có quyền truy cập dashboard';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.display_name,
    u.created_at,
    u.last_sign_in_at,
    (u.email_confirmed_at is not null),
    case when v_role in ('admin', 'manager') then coalesce(w.sessions, 0)     end,
    case when v_role in ('admin', 'manager') then coalesce(w.active_days, 0)  end,
    case when v_role in ('admin', 'manager') then coalesce(w.total_sets, 0)   end,
    case when v_role in ('admin', 'manager') then coalesce(w.total_reps, 0)   end,
    case when v_role in ('admin', 'manager') then w.last_workout              end,
    count(*) over ()
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join (
    select
      we.user_id,
      count(*)::bigint as sessions,
      count(distinct we.workout_date)::bigint as active_days,
      coalesce(sum(jsonb_array_length(we.sets)), 0)::bigint as total_sets,
      coalesce(sum((
        select coalesce(sum((s ->> 'reps')::numeric), 0)
        from jsonb_array_elements(we.sets) as s
      )), 0)::bigint as total_reps,
      max(we.workout_date) as last_workout
    from public.workout_entries we
    group by we.user_id
  ) w on w.user_id = u.id
  where
    coalesce(p_search, '') = ''
    or u.email ilike '%' || p_search || '%'
    or coalesce(p.display_name, '') ilike '%' || p_search || '%'
  order by u.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

-- ─── Số liệu tổng quan (chỉ admin + manager) ────────────────────────────────
create or replace function public.admin_overview()
returns jsonb
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_role text := public.dashboard_role();
begin
  if v_role is null or v_role = 'viewer' then
    raise exception 'Bạn không có quyền xem thống kê tổng quan';
  end if;

  return jsonb_build_object(
    'total_users',   (select count(*) from auth.users),
    'new_users_30d', (select count(*) from auth.users
                      where created_at >= now() - interval '30 days'),
    'active_users',  (select count(distinct user_id) from public.workout_entries),
    'total_sessions',(select count(*) from public.workout_entries),
    'sessions_30d',  (select count(*) from public.workout_entries
                      where workout_date >= (now() - interval '30 days')::date)
  );
end;
$$;

-- ─── Danh sách người có quyền vào dashboard (chỉ admin) ─────────────────────
create or replace function public.admin_list_access()
returns table (
  email      text,
  role       text,
  created_by text,
  created_at timestamptz,
  updated_at timestamptz,
  has_account boolean,
  registered_at timestamptz
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if public.dashboard_role() is distinct from 'admin' then
    raise exception 'Chỉ admin mới xem được danh sách phân quyền';
  end if;

  return query
  select
    a.email,
    a.role,
    a.created_by,
    a.created_at,
    a.updated_at,
    (u.id is not null),
    u.created_at
  from public.dashboard_access a
  left join auth.users u on lower(u.email) = a.email
  order by
    case a.role when 'admin' then 0 when 'manager' then 1 else 2 end,
    a.created_at asc;
end;
$$;

-- ─── Cấp quyền / đổi quyền (chỉ admin) ──────────────────────────────────────
create or replace function public.admin_grant_access(p_email text, p_role text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_caller text;
begin
  if public.dashboard_role() is distinct from 'admin' then
    raise exception 'Chỉ admin mới cấp quyền được';
  end if;
  if p_role not in ('admin', 'manager', 'viewer') then
    raise exception 'Quyền không hợp lệ: %', p_role;
  end if;

  p_email := lower(trim(p_email));
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email không hợp lệ: %', p_email;
  end if;

  select lower(email) into v_caller from auth.users where id = auth.uid();
  if p_email = v_caller and p_role <> 'admin' then
    raise exception 'Không thể tự hạ quyền của chính mình';
  end if;

  insert into public.dashboard_access (email, role, created_by)
  values (p_email, p_role, v_caller)
  on conflict (email) do update
    set role = excluded.role, updated_at = now();
end;
$$;

-- ─── Thu hồi quyền (chỉ admin) ──────────────────────────────────────────────
create or replace function public.admin_revoke_access(p_email text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_caller text;
begin
  if public.dashboard_role() is distinct from 'admin' then
    raise exception 'Chỉ admin mới thu hồi quyền được';
  end if;

  p_email := lower(trim(p_email));
  select lower(email) into v_caller from auth.users where id = auth.uid();
  if p_email = v_caller then
    raise exception 'Không thể tự thu hồi quyền của chính mình';
  end if;

  delete from public.dashboard_access where email = p_email;
end;
$$;

-- ─── Cấp quyền gọi các hàm cho người đã đăng nhập ────────────────────────────
revoke execute on function public.my_dashboard_role() from public, anon;
revoke execute on function public.admin_list_users(text, int, int) from public, anon;
revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.admin_list_access() from public, anon;
revoke execute on function public.admin_grant_access(text, text) from public, anon;
revoke execute on function public.admin_revoke_access(text) from public, anon;

grant execute on function public.my_dashboard_role() to authenticated;
grant execute on function public.admin_list_users(text, int, int) to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_list_access() to authenticated;
grant execute on function public.admin_grant_access(text, text) to authenticated;
grant execute on function public.admin_revoke_access(text) to authenticated;

-- ─── Cấp quyền admin đầu tiên cho chủ ứng dụng ───────────────────────────────
insert into public.dashboard_access (email, role, created_by)
values ('nguyenvanquynh215@gmail.com', 'admin', 'system')
on conflict (email) do update set role = 'admin', updated_at = now();

-- Xong! Mở link Dashboard, đăng nhập bằng email trên (mã OTP gửi qua email)
-- là vào được với quyền Admin.

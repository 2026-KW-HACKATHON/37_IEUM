-- 회원 수정·삭제 중에는 새 연결 기록과 파일 업로드를 막습니다.
alter table public.profiles add column account_management_lock uuid;

create table public.user_management_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  target_id uuid not null,
  action text not null check (action in ('update', 'delete')),
  reason text not null check (length(btrim(reason)) between 1 and 500),
  changed_fields text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.user_management_audit enable row level security;
create policy "admins_read_user_management_audit" on public.user_management_audit
  for select to authenticated using ((select public.is_ieum_admin()));
grant select on public.user_management_audit to authenticated;
grant all on public.user_management_audit to service_role;

create or replace function public.guard_ieum_account_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and (
    new.name is distinct from old.name or new.phone is distinct from old.phone
    or new.account_management_lock is distinct from old.account_management_lock
    or old.account_management_lock is not null
  ) then
    raise exception '회원 기본정보 수정은 운영자 서버 기능을 이용해주세요.';
  end if;
  return new;
end;
$$;
create trigger guard_ieum_account_change before update on public.profiles
  for each row execute function public.guard_ieum_account_change();

create or replace function public.guard_ieum_account_reference()
returns trigger language plpgsql security definer set search_path = '' as $$
declare member_id uuid; member_lock uuid;
begin
  member_id := (to_jsonb(new) ->> case when tg_table_name = 'requests' then 'requester_id' else 'student_id' end)::uuid;
  select account_management_lock into member_lock from public.profiles
    where id = member_id for key share;
  if not found or member_lock is not null then
    raise exception '처리 중이거나 삭제된 회원에게 새 기록을 연결할 수 없습니다.';
  end if;
  return new;
end;
$$;
create trigger guard_request_member before insert or update on public.requests
  for each row execute function public.guard_ieum_account_reference();
create trigger guard_application_member before insert or update on public.applications
  for each row execute function public.guard_ieum_account_reference();
create trigger guard_assignment_member before insert or update on public.assignments
  for each row execute function public.guard_ieum_account_reference();

create or replace function public.ieum_account_available()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and account_management_lock is null);
$$;
-- Restrictive policies also apply when the existing storage policy permits a write.
create policy "active_member_uploads" on storage.objects as restrictive
  for insert to authenticated with check (bucket_id <> 'ieum-private' or public.ieum_account_available());
create policy "active_member_updates_files" on storage.objects as restrictive
  for update to authenticated using (bucket_id <> 'ieum-private' or public.ieum_account_available())
  with check (bucket_id <> 'ieum-private' or public.ieum_account_available());

create or replace function public.begin_ieum_user_management(
  p_actor uuid, p_target uuid, p_action text, p_reason text, p_confirm_name text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare target public.profiles%rowtype; operation_id uuid := gen_random_uuid();
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required'; end if;
  if not exists (select 1 from public.profiles where id = p_actor and role = 'admin') then
    raise exception '운영자 권한이 없습니다.';
  end if;
  select * into target from public.profiles where id = p_target for update;
  if not found or target.role not in ('student', 'requester') then
    raise exception '일반 회원만 수정·삭제할 수 있습니다.';
  end if;
  if target.account_management_lock is not null then raise exception '이미 처리 중인 회원입니다.'; end if;
  if p_action is null or p_action not in ('update', 'delete') or p_reason is null or length(btrim(p_reason)) not between 1 and 500 then
    raise exception '처리 사유를 확인해주세요.';
  end if;
  if p_action = 'delete' then
    if p_confirm_name is distinct from target.name then raise exception '회원 이름을 정확히 입력해주세요.'; end if;
    if exists (select 1 from public.requests where requester_id = p_target)
      or exists (select 1 from public.applications where student_id = p_target)
      or exists (select 1 from public.assignments where student_id = p_target)
      or exists (select 1 from public.profiles where profile_data ->> 'linkedElderId' = p_target::text) then
      raise exception '연결된 의뢰·신청·배정 또는 가족 연결 기록이 있어 삭제할 수 없습니다.';
    end if;
  end if;
  update public.profiles set account_management_lock = operation_id where id = p_target;
  insert into public.user_management_audit (id, actor_id, target_id, action, reason)
    values (operation_id, p_actor, p_target, p_action, btrim(p_reason));
  return operation_id;
end;
$$;

create or replace function public.complete_ieum_user_update(
  p_operation uuid, p_name text, p_phone text
) returns void language plpgsql security definer set search_path = '' as $$
declare operation public.user_management_audit%rowtype;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required'; end if;
  select * into operation from public.user_management_audit where id = p_operation and status = 'pending' and action = 'update' for update;
  if not found then raise exception '유효한 회원 수정 작업이 아닙니다.'; end if;
  if p_name is null or length(btrim(p_name)) not between 1 and 50 or p_phone is null or p_phone !~ '^0[0-9]{9,10}$' then
    raise exception '이름과 전화번호를 확인해주세요.';
  end if;
  if exists (select 1 from public.profiles where id <> operation.target_id and
    regexp_replace(phone, '[^0-9]', '', 'g') in (p_phone, '82' || substr(p_phone, 2))) then
    raise exception '이미 다른 회원이 사용 중인 전화번호입니다.';
  end if;
  update public.user_management_audit set changed_fields = array(
    select field from public.profiles p cross join (values ('name'), ('phone')) f(field)
    where p.id = operation.target_id and
      ((field = 'name' and p.name is distinct from btrim(p_name)) or
       (field = 'phone' and (p.phone is null or regexp_replace(p.phone, '[^0-9]', '', 'g') not in (p_phone, '82' || substr(p_phone, 2)))))
  ) where id = p_operation;
  update public.profiles set name = btrim(p_name), phone = p_phone, account_management_lock = null
    where id = operation.target_id and account_management_lock = p_operation;
  if not found then raise exception '회원 수정 잠금을 확인할 수 없습니다.'; end if;
  update public.user_management_audit set status = 'completed', completed_at = now() where id = p_operation;
end;
$$;

create or replace function public.finish_ieum_user_management(p_operation uuid, p_success boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required'; end if;
  update public.profiles set account_management_lock = null where account_management_lock = p_operation;
  update public.user_management_audit set status = case when p_success then 'completed' else 'failed' end,
    completed_at = now() where id = p_operation and status = 'pending';
end;
$$;
revoke all on function public.begin_ieum_user_management(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.complete_ieum_user_update(uuid, text, text) from public, anon, authenticated;
revoke all on function public.finish_ieum_user_management(uuid, boolean) from public, anon, authenticated;
grant execute on function public.begin_ieum_user_management(uuid, uuid, text, text, text) to service_role;
grant execute on function public.complete_ieum_user_update(uuid, text, text) to service_role;
grant execute on function public.finish_ieum_user_management(uuid, boolean) to service_role;

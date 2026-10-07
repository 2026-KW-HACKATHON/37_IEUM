create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'requester', 'admin')),
  requester_type text check (
    (role = 'requester' and requester_type is not null and requester_type in ('self', 'family'))
    or (role in ('student', 'admin') and requester_type is null)
  ),
  name text not null,
  phone text,
  university text,
  age_group text,
  address text,
  address_zonecode text,
  verification_status text check (verification_status in ('pending', 'approved', 'rejected')),
  verification_submitted_at timestamptz,
  verification_summary text,
  verification_document_name text,
  address_verification_status text check (address_verification_status in ('pending', 'approved', 'rejected')),
  address_submitted_at timestamptz,
  joined_at date not null default current_date,
  profile_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.requests (
  id text primary key,
  requester_id uuid not null references public.profiles (id) on delete restrict,
  status text not null check (status in ('요청 접수', '운영자 검토', '승인', '반려', '수정 요청')),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id text primary key,
  request_id text not null unique references public.requests (id) on delete restrict,
  status text not null,
  recruitment_open boolean not null default false,
  capacity integer not null check (capacity > 0),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.applications (
  id text primary key,
  activity_id text not null references public.activities (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete restrict,
  applied_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  unique (activity_id, student_id)
);

create table public.assignments (
  id text primary key,
  activity_id text not null references public.activities (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete restrict,
  status text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, student_id)
);

create index requests_requester_id_idx on public.requests (requester_id);
create index applications_student_id_idx on public.applications (student_id);
create index assignments_student_id_idx on public.assignments (student_id);
create index activities_recruitment_idx on public.activities (recruitment_open) where recruitment_open;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
$$;

create or replace function public.is_ieum_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_profile_role() = 'admin', false)
$$;

create or replace function public.owns_ieum_activity(p_activity_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.activities a
    join public.requests r on r.id = a.request_id
    where a.id = p_activity_id and r.requester_id = (select auth.uid())
  )
$$;

create or replace function public.is_ieum_activity_assigned(p_activity_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.activity_id = p_activity_id and a.student_id = (select auth.uid())
  )
$$;

create or replace function public.has_applied_to_ieum_activity(p_activity_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.applications a
    where a.activity_id = p_activity_id and a.student_id = (select auth.uid())
  )
$$;

create or replace function public.create_ieum_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := new.raw_user_meta_data;
  requested_role text := metadata ->> 'role';
begin
  if requested_role not in ('student', 'requester') then
    raise exception 'A valid student or requester role is required';
  end if;

  insert into public.profiles (
    id, role, requester_type, name, phone, university, age_group, address,
    address_zonecode, verification_status, verification_submitted_at,
    verification_summary, verification_document_name,
    address_verification_status, address_submitted_at
  ) values (
    new.id,
    requested_role,
    case when requested_role = 'requester' then metadata ->> 'requesterType' end,
    coalesce(nullif(btrim(metadata ->> 'name'), ''), '사용자'),
    new.phone,
    nullif(btrim(metadata ->> 'university'), ''),
    nullif(metadata ->> 'ageGroup', ''),
    nullif(btrim(metadata ->> 'address'), ''),
    nullif(metadata ->> 'addressZonecode', ''),
    case when requested_role = 'student' then 'pending' end,
    case when requested_role = 'student' then now() end,
    nullif(metadata ->> 'verificationSummary', ''),
    nullif(metadata ->> 'verificationDocumentName', ''),
    case when requested_role = 'requester' then 'pending' end,
    case when requested_role = 'requester' then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created_ieum_profile
  after insert on auth.users
  for each row execute function public.create_ieum_profile();

create or replace function public.protect_ieum_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and not public.is_ieum_admin()
    and (
    new.role is distinct from old.role
    or new.verification_status is distinct from old.verification_status
    or new.address_verification_status is distinct from old.address_verification_status
    or new.id is distinct from old.id
  ) then
    raise exception 'Protected profile fields can only be changed by an administrator';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_ieum_profile_fields
  before update on public.profiles
  for each row execute function public.protect_ieum_profile();

create or replace function public.touch_ieum_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_ieum_requests before update on public.requests
  for each row execute function public.touch_ieum_updated_at();
create trigger touch_ieum_activities before update on public.activities
  for each row execute function public.touch_ieum_updated_at();
create trigger touch_ieum_assignments before update on public.assignments
  for each row execute function public.touch_ieum_updated_at();

alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.activities enable row level security;
alter table public.applications enable row level security;
alter table public.assignments enable row level security;

create policy "profiles_read_self_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_ieum_admin()));
create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_ieum_admin()))
  with check (id = (select auth.uid()) or (select public.is_ieum_admin()));

create policy "requests_read_owner_or_admin" on public.requests
  for select to authenticated
  using (requester_id = (select auth.uid()) or (select public.is_ieum_admin()));
create policy "requesters_create_own_request" on public.requests
  for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and (select public.current_profile_role()) = 'requester'
    and status = '요청 접수'
    and data ->> 'requesterId' = (select auth.uid())::text
    and data ->> 'type' in ('생활·디지털 안내', '생활·취미 키트', '말벗·기록')
    and length(btrim(coalesce(data ->> 'title', ''))) between 1 and 200
    and length(btrim(coalesce(data ->> 'description', ''))) between 1 and 5000
    and length(btrim(coalesce(data ->> 'desiredResult', ''))) between 1 and 500
    and length(btrim(coalesce(data ->> 'period', ''))) between 1 and 100
  );
create policy "requesters_revise_own_request" on public.requests
  for update to authenticated
  using (
    requester_id = (select auth.uid())
    and status = '수정 요청'
    and not exists (select 1 from public.activities a where a.request_id = requests.id)
  )
  with check (
    requester_id = (select auth.uid())
    and status = '요청 접수'
    and data ->> 'requesterId' = (select auth.uid())::text
    and data ->> 'type' in ('생활·디지털 안내', '생활·취미 키트', '말벗·기록')
    and length(btrim(coalesce(data ->> 'title', ''))) between 1 and 200
    and length(btrim(coalesce(data ->> 'description', ''))) between 1 and 5000
    and length(btrim(coalesce(data ->> 'desiredResult', ''))) between 1 and 500
    and length(btrim(coalesce(data ->> 'period', ''))) between 1 and 100
  );
create policy "admins_manage_requests" on public.requests
  for all to authenticated
  using ((select public.is_ieum_admin()))
  with check ((select public.is_ieum_admin()));

create policy "activities_read_relevant" on public.activities
  for select to authenticated
  using (
    (select public.is_ieum_admin())
    or (recruitment_open and (select public.current_profile_role()) = 'student')
    or (select public.is_ieum_activity_assigned(activities.id))
    or (select public.has_applied_to_ieum_activity(activities.id))
    or (select public.owns_ieum_activity(activities.id))
  );
create policy "admins_manage_activities" on public.activities
  for all to authenticated
  using ((select public.is_ieum_admin()))
  with check ((select public.is_ieum_admin()));

create policy "applications_read_owner_or_admin" on public.applications
  for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_ieum_admin()));
create policy "admins_manage_applications" on public.applications
  for all to authenticated
  using ((select public.is_ieum_admin()))
  with check ((select public.is_ieum_admin()));

create policy "assignments_read_participant_admin_or_requester_after_certification" on public.assignments
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_ieum_admin())
    or (
      status = '인증 완료'
      and (select public.owns_ieum_activity(assignments.activity_id))
    )
  );
create policy "admins_manage_assignments" on public.assignments
  for all to authenticated
  using ((select public.is_ieum_admin()))
  with check ((select public.is_ieum_admin()));

create or replace function public.admin_replace_ieum_state(
  p_requests jsonb,
  p_activities jsonb,
  p_applications jsonb,
  p_assignments jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_ieum_admin()) then
    raise exception 'Administrator access is required';
  end if;
  if jsonb_typeof(p_requests) is distinct from 'array'
    or jsonb_typeof(p_activities) is distinct from 'array'
    or jsonb_typeof(p_applications) is distinct from 'array'
    or jsonb_typeof(p_assignments) is distinct from 'array' then
    raise exception 'State collections must be JSON arrays';
  end if;

  delete from public.assignments a
    where not exists (
      select 1 from jsonb_array_elements(p_assignments) as entries(item)
      where entries.item ->> 'id' = a.id
    );

  insert into public.requests (id, requester_id, status, data)
    select row_data.id, row_data.requester_id, row_data.status, row_data.data
    from jsonb_to_recordset(p_requests) as row_data(id text, requester_id uuid, status text, data jsonb)
    on conflict (id) do update
      set requester_id = excluded.requester_id, status = excluded.status, data = excluded.data;

  insert into public.activities (id, request_id, status, recruitment_open, capacity, data)
    select row_data.id, row_data.request_id, row_data.status, row_data.recruitment_open, row_data.capacity, row_data.data
    from jsonb_to_recordset(p_activities) as row_data(
      id text, request_id text, status text, recruitment_open boolean, capacity integer, data jsonb
    )
    on conflict (id) do update
      set request_id = excluded.request_id, status = excluded.status,
          recruitment_open = excluded.recruitment_open, capacity = excluded.capacity, data = excluded.data;

  insert into public.applications (id, activity_id, student_id, applied_at, data)
    select row_data.id, row_data.activity_id, row_data.student_id, row_data.applied_at, row_data.data
    from jsonb_to_recordset(p_applications) as row_data(
      id text, activity_id text, student_id uuid, applied_at timestamptz, data jsonb
    )
    on conflict (id) do update
      set activity_id = excluded.activity_id, student_id = excluded.student_id,
          applied_at = excluded.applied_at, data = excluded.data;

  insert into public.assignments (id, activity_id, student_id, status, data)
    select row_data.id, row_data.activity_id, row_data.student_id, row_data.status, row_data.data
    from jsonb_to_recordset(p_assignments) as row_data(
      id text, activity_id text, student_id uuid, status text, data jsonb
    )
    on conflict (id) do update
      set activity_id = excluded.activity_id, student_id = excluded.student_id,
          status = excluded.status, data = excluded.data;
end;
$$;

create or replace function public.apply_to_ieum_activity(p_activity_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.activities%rowtype;
  student_role text;
  student_status text;
begin
  if (select auth.uid()) is null then raise exception 'Authentication is required'; end if;
  select p.role, p.verification_status into student_role, student_status
    from public.profiles p where p.id = (select auth.uid());
  if student_role <> 'student' or student_status <> 'approved' then
    raise exception 'Only a verified student can apply';
  end if;

  select * into target from public.activities a where a.id = p_activity_id for update;
  if not found or not target.recruitment_open then raise exception 'This activity is not recruiting'; end if;
  if (select count(*) from public.assignments a where a.activity_id = p_activity_id) >= target.capacity then
    raise exception 'This activity is full';
  end if;
  if exists (
    select 1 from public.applications a
    where a.activity_id = p_activity_id and a.student_id = (select auth.uid())
  ) then raise exception 'You have already applied'; end if;

  insert into public.applications (id, activity_id, student_id, data)
  values (
    'application-' || gen_random_uuid()::text,
    p_activity_id,
    (select auth.uid()),
    jsonb_build_object('isDemo', false)
  );
end;
$$;

create or replace function public.submit_ieum_activity_result(
  p_assignment_id text,
  p_result text,
  p_activity_log text,
  p_evidence text,
  p_worked_minutes integer,
  p_result_file_path text default null,
  p_evidence_file_path text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.assignments%rowtype;
  next_status text;
  submission jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Authentication is required'; end if;
  if p_result is null or length(btrim(p_result)) = 0
    or p_activity_log is null or length(btrim(p_activity_log)) = 0
    or p_evidence is null or length(btrim(p_evidence)) = 0
    or p_worked_minutes is null or p_worked_minutes < 1 then
    raise exception 'All submission fields and a positive duration are required';
  end if;
  if length(p_result) > 2000 or length(p_activity_log) > 5000 or length(p_evidence) > 2000 then
    raise exception 'Submission text exceeds the allowed length';
  end if;
  if p_result_file_path is not null and not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'ieum-private' and o.name = p_result_file_path
      and o.owner_id = (select auth.uid())::text
  ) then raise exception 'The result file is not available in your private storage'; end if;
  if p_evidence_file_path is not null and not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'ieum-private' and o.name = p_evidence_file_path
      and o.owner_id = (select auth.uid())::text
  ) then raise exception 'The evidence file is not available in your private storage'; end if;

  select * into target from public.assignments a
    where a.id = p_assignment_id and a.student_id = (select auth.uid()) for update;
  if not found or target.status not in ('진행 중', '보완 요청') then
    raise exception 'Only your in-progress or revision-requested assignments can be submitted';
  end if;

  next_status := case when target.status = '보완 요청' then '재제출' else '결과물 제출' end;
  submission := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'result', btrim(p_result),
    'activityLog', btrim(p_activity_log),
    'evidence', btrim(p_evidence),
    'workedMinutes', p_worked_minutes,
    'submittedAt', now(),
    'isDemo', false,
    'resultFilePath', p_result_file_path,
    'evidenceFilePath', p_evidence_file_path
  );
  update public.assignments
    set status = next_status,
        data = jsonb_set(
          jsonb_set(target.data, '{status}', to_jsonb(next_status)),
          '{submissions}',
          coalesce(target.data -> 'submissions', '[]'::jsonb) || jsonb_build_array(submission),
          true
        )
    where id = target.id;
  update public.activities set status = next_status where id = target.activity_id;
end;
$$;

revoke all on function public.apply_to_ieum_activity(text) from public;
grant execute on function public.apply_to_ieum_activity(text) to authenticated;
revoke all on function public.admin_replace_ieum_state(jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.admin_replace_ieum_state(jsonb, jsonb, jsonb, jsonb) to authenticated;
revoke all on function public.submit_ieum_activity_result(text, text, text, text, integer, text, text) from public;
grant execute on function public.submit_ieum_activity_result(text, text, text, text, integer, text, text) to authenticated;
revoke all on function public.current_profile_role() from public;
grant execute on function public.current_profile_role() to authenticated;
revoke all on function public.is_ieum_admin() from public;
grant execute on function public.is_ieum_admin() to authenticated;
revoke all on function public.owns_ieum_activity(text) from public;
grant execute on function public.owns_ieum_activity(text) to authenticated;
revoke all on function public.is_ieum_activity_assigned(text) from public;
grant execute on function public.is_ieum_activity_assigned(text) to authenticated;
revoke all on function public.has_applied_to_ieum_activity(text) from public;
grant execute on function public.has_applied_to_ieum_activity(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ieum-private',
  'ieum-private',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "users_upload_own_private_files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ieum-private'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "users_read_own_or_admin_private_files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ieum-private'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_ieum_admin())
      or exists (
        select 1
        from public.assignments a
        where a.status = '인증 완료'
          and (select public.owns_ieum_activity(a.activity_id))
          and a.data -> 'submissions' -> -1 @> jsonb_build_object('resultFilePath', name)
      )
    )
  );
create policy "users_update_own_private_files" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'ieum-private'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'ieum-private'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.requests, public.activities,
  public.applications, public.assignments to authenticated;

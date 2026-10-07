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
  target_activity public.activities%rowtype;
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
  if not found then raise exception 'Only your own assignments can be submitted'; end if;

  select * into target_activity from public.activities a where a.id = target.activity_id;
  if not found then raise exception 'The assigned activity could not be found'; end if;
  if target.status = '봉사자 배정'
    and (target_activity.data ->> 'startDate')::date <= (now() at time zone 'Asia/Seoul')::date then
    target.status := '진행 중';
  end if;
  if target.status not in ('진행 중', '보완 요청') then
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

revoke all on function public.submit_ieum_activity_result(text, text, text, text, integer, text, text) from public;
grant execute on function public.submit_ieum_activity_result(text, text, text, text, integer, text, text) to authenticated;

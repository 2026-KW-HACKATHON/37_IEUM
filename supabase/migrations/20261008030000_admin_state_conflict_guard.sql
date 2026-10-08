-- 운영자에게 일관된 전체 스냅샷을 제공하고, 읽은 이후의 변경을 검사합니다.
create or replace function public.ieum_operation_snapshot()
returns jsonb language sql stable security definer
set search_path = '' set timezone = 'UTC' as $$
  select jsonb_build_object(
    'requests', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'requester_id', requester_id, 'status', status, 'data', data
    ) order by id) from public.requests), '[]'::jsonb),
    'activities', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'request_id', request_id, 'status', status,
      'recruitment_open', recruitment_open, 'capacity', capacity, 'data', data
    ) order by id) from public.activities), '[]'::jsonb),
    'applications', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'activity_id', activity_id, 'student_id', student_id,
      'applied_at', applied_at, 'data', data
    ) order by id) from public.applications), '[]'::jsonb),
    'assignments', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'activity_id', activity_id, 'student_id', student_id, 'status', status, 'data', data
    ) order by id) from public.assignments), '[]'::jsonb)
  );
$$;
revoke all on function public.ieum_operation_snapshot() from public, anon, authenticated;

create or replace function public.read_ieum_admin_state()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare snapshot jsonb;
begin
  if not coalesce(public.is_ieum_admin(), false) then raise exception '운영자만 전체 운영 정보를 조회할 수 있습니다.'; end if;
  snapshot := public.ieum_operation_snapshot();
  return snapshot || jsonb_build_object('revision', md5(snapshot::text));
end;
$$;

create or replace function public.save_ieum_admin_state(
  p_expected_revision text, p_requests jsonb, p_activities jsonb,
  p_applications jsonb, p_assignments jsonb
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.is_ieum_admin(), false) then raise exception '운영자만 운영 정보를 변경할 수 있습니다.'; end if;
  -- 비교와 저장 사이에 학생 제출·의뢰 수정·다른 운영자 저장이 끼어들지 않게 합니다.
  -- RPC 반환/오류 시 잠금은 트랜잭션 종료와 함께 해제됩니다.
  begin
    lock table public.requests, public.activities, public.applications, public.assignments
      in exclusive mode nowait;
  exception when lock_not_available then
    raise exception using errcode = '40001', message = '다른 사용자가 처리 중입니다. 잠시 후 최신 정보를 확인하고 다시 저장해주세요.';
  end;
  if p_expected_revision is distinct from md5(public.ieum_operation_snapshot()::text) then
    raise exception using errcode = '40001', message = '다른 사용자가 데이터를 변경했습니다. 최신 정보를 확인하고 다시 저장해주세요.';
  end if;
  perform public.admin_replace_ieum_state(p_requests, p_activities, p_applications, p_assignments);
end;
$$;

-- 예전 화면/API가 버전 검사를 우회하여 저장하지 못하게 합니다.
revoke all on function public.admin_replace_ieum_state(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.read_ieum_admin_state() from public, anon;
revoke all on function public.save_ieum_admin_state(text, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.read_ieum_admin_state() to authenticated;
grant execute on function public.save_ieum_admin_state(text, jsonb, jsonb, jsonb, jsonb) to authenticated;

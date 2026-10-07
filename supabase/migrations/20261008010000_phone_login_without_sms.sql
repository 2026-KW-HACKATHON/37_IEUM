create or replace function public.create_ieum_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := new.raw_user_meta_data;
  requested_role text := metadata ->> 'role';
  contact_phone text := metadata ->> 'phone';
begin
  if requested_role not in ('student', 'requester') then
    raise exception 'A valid student or requester role is required';
  end if;
  if contact_phone is null or length(btrim(contact_phone)) < 8 then
    raise exception 'A contact phone number is required';
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
    contact_phone,
    nullif(btrim(metadata ->> 'university'), ''),
    nullif(metadata ->> 'ageGroup', ''),
    nullif(btrim(metadata ->> 'address'), ''),
    nullif(btrim(metadata ->> 'addressZonecode'), ''),
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

-- ENUMS
create type public.app_role as enum ('student','officer','admin');
create type public.event_status as enum ('draft','pending_approval','approved','rejected','published','completed');
create type public.registration_status as enum ('registered','cancelled');
create type public.account_status as enum ('active','inactive');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  student_no text,
  course text,
  year_level text,
  department text,
  status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- USER ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

-- ORGANIZATIONS
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  acronym text not null,
  description text,
  adviser text,
  status account_status not null default 'active',
  created_at timestamptz not null default now()
);
grant select on public.organizations to anon;
grant select, insert, update, delete on public.organizations to authenticated;
grant all on public.organizations to service_role;
alter table public.organizations enable row level security;

create table public.organization_officers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position text not null default 'Officer',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
grant select, insert, update, delete on public.organization_officers to authenticated;
grant all on public.organization_officers to service_role;
alter table public.organization_officers enable row level security;

create or replace function public.is_org_officer(_user_id uuid, _org_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_officers
    where user_id = _user_id and organization_id = _org_id
  );
$$;

create or replace function public.my_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.organization_officers where user_id = auth.uid() limit 1;
$$;

-- EVENTS
create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null,
  description text,
  category text,
  venue text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int,
  registration_deadline timestamptz,
  requires_evaluation boolean not null default true,
  status event_status not null default 'draft',
  rejection_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;

-- REGISTRATIONS
create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status registration_status not null default 'registered',
  registered_at timestamptz not null default now(),
  unique (event_id, student_id)
);
grant select, insert, update on public.event_registrations to authenticated;
grant all on public.event_registrations to service_role;
alter table public.event_registrations enable row level security;

-- QR CODES
create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.event_registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  token text not null unique,
  is_active boolean not null default true,
  issued_at timestamptz not null default now()
);
grant select on public.qr_codes to authenticated;
grant all on public.qr_codes to service_role;
alter table public.qr_codes enable row level security;

-- ATTENDANCE
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.event_registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  scanned_by uuid references auth.users(id),
  scanned_at timestamptz not null default now(),
  method text not null default 'qr_scan'
);
grant select on public.attendance to authenticated;
grant all on public.attendance to service_role;
alter table public.attendance enable row level security;

-- EVALUATIONS
create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  rating_content int not null,
  rating_organization int not null,
  rating_venue int not null,
  rating_overall int not null,
  comments text,
  submitted_at timestamptz not null default now(),
  unique (event_id, student_id)
);
grant select on public.evaluations to authenticated;
grant all on public.evaluations to service_role;
alter table public.evaluations enable row level security;

-- CERTIFICATES
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  certificate_no text not null unique,
  status text not null default 'issued',
  issued_at timestamptz not null default now(),
  issued_by uuid references auth.users(id),
  unique (event_id, student_id)
);
grant select on public.certificates to authenticated;
grant all on public.certificates to service_role;
alter table public.certificates enable row level security;

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  event_id uuid references public.events(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

-- POLICIES
create policy "profiles_self_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'officer'));
create policy "profiles_self_insert" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles_self_update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "roles_read" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "orgs_read_public" on public.organizations for select using (true);
create policy "orgs_admin_write" on public.organizations for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "org_officers_read" on public.organization_officers for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "org_officers_admin_write" on public.organization_officers for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "events_read" on public.events for select to authenticated
  using (
    status in ('published','completed')
    or public.has_role(auth.uid(),'admin')
    or public.is_org_officer(auth.uid(), organization_id)
  );
create policy "events_officer_insert" on public.events for insert to authenticated
  with check (public.is_org_officer(auth.uid(), organization_id) and created_by = auth.uid());
create policy "events_officer_update" on public.events for update to authenticated
  using (public.is_org_officer(auth.uid(), organization_id) or public.has_role(auth.uid(),'admin'))
  with check (public.is_org_officer(auth.uid(), organization_id) or public.has_role(auth.uid(),'admin'));
create policy "events_officer_delete" on public.events for delete to authenticated
  using (public.is_org_officer(auth.uid(), organization_id) and status in ('draft','rejected'));

create policy "registrations_read" on public.event_registrations for select to authenticated
  using (
    student_id = auth.uid()
    or public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.events e where e.id = event_id and public.is_org_officer(auth.uid(), e.organization_id))
  );
create policy "registrations_self_update" on public.event_registrations for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "qr_read" on public.qr_codes for select to authenticated
  using (
    exists (select 1 from public.event_registrations r where r.id = registration_id and r.student_id = auth.uid())
    or public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.events e where e.id = event_id and public.is_org_officer(auth.uid(), e.organization_id))
  );

create policy "attendance_read" on public.attendance for select to authenticated
  using (
    student_id = auth.uid()
    or public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.events e where e.id = event_id and public.is_org_officer(auth.uid(), e.organization_id))
  );

create policy "evaluations_read" on public.evaluations for select to authenticated
  using (
    student_id = auth.uid()
    or public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.events e where e.id = event_id and public.is_org_officer(auth.uid(), e.organization_id))
  );

create policy "certificates_read" on public.certificates for select to authenticated
  using (
    student_id = auth.uid()
    or public.has_role(auth.uid(),'admin')
    or exists (select 1 from public.events e where e.id = event_id and public.is_org_officer(auth.uid(), e.organization_id))
  );

create policy "notifications_own_read" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications_own_update" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- BUSINESS LOGIC FUNCTIONS
create or replace function public.bootstrap_profile(
  _full_name text, _email text, _student_no text default null,
  _course text default null, _year_level text default null, _department text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into public.profiles (id, full_name, email, student_no, course, year_level, department)
  values (auth.uid(), _full_name, _email, _student_no, _course, _year_level, _department)
  on conflict (id) do update set full_name = excluded.full_name, updated_at = now();
  insert into public.user_roles (user_id, role) values (auth.uid(), 'student') on conflict do nothing;
end;
$$;

create or replace function public.admin_exists() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin');
$$;

create or replace function public.claim_first_admin() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then
    raise exception 'An administrator already exists';
  end if;
  insert into public.user_roles (user_id, role) values (auth.uid(),'admin') on conflict do nothing;
end;
$$;

create or replace function public.set_user_role(_user_id uuid, _role app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Only administrators can change roles'; end if;
  delete from public.user_roles where user_id = _user_id;
  insert into public.user_roles (user_id, role) values (_user_id, _role);
end;
$$;

create or replace function public.assign_officer(_user_id uuid, _org_id uuid, _position text default 'Officer')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Only administrators can assign officers'; end if;
  delete from public.organization_officers where user_id = _user_id;
  insert into public.organization_officers (user_id, organization_id, position) values (_user_id, _org_id, _position);
  delete from public.user_roles where user_id = _user_id;
  insert into public.user_roles (user_id, role) values (_user_id, 'officer');
end;
$$;

create or replace function public.register_for_event(_event_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _ev public.events;
  _count int;
  _reg_id uuid;
  _token text;
begin
  if _uid is null then raise exception 'Not authenticated'; end if;
  if not public.has_role(_uid,'student') then raise exception 'Only students can register for events'; end if;
  select * into _ev from public.events where id = _event_id;
  if _ev.id is null then raise exception 'Event not found'; end if;
  if _ev.status <> 'published' then raise exception 'Registration is only allowed for published events'; end if;
  if _ev.registration_deadline is not null and now() > _ev.registration_deadline then
    raise exception 'Registration for this event is closed';
  end if;
  if exists (select 1 from public.event_registrations where event_id = _event_id and student_id = _uid and status = 'registered') then
    raise exception 'You are already registered for this event';
  end if;
  if _ev.capacity is not null then
    select count(*) into _count from public.event_registrations where event_id = _event_id and status = 'registered';
    if _count >= _ev.capacity then raise exception 'This event has reached full capacity'; end if;
  end if;

  insert into public.event_registrations (event_id, student_id, status)
  values (_event_id, _uid, 'registered')
  on conflict (event_id, student_id) do update set status = 'registered', registered_at = now()
  returning id into _reg_id;

  _token := 'CSU-' || replace(gen_random_uuid()::text,'-','');
  insert into public.qr_codes (registration_id, event_id, token)
  values (_reg_id, _event_id, _token)
  on conflict (registration_id) do update set is_active = true;

  insert into public.notifications (user_id, title, body, event_id)
  values (_uid, 'Registration confirmed', 'You are registered for "' || _ev.title || '". Your QR code is now available.', _event_id);

  return _reg_id;
end;
$$;

create or replace function public.record_attendance(_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _qr public.qr_codes;
  _reg public.event_registrations;
  _ev public.events;
  _student public.profiles;
begin
  if _uid is null then raise exception 'Not authenticated'; end if;
  select * into _qr from public.qr_codes where token = trim(_token);
  if _qr.id is null then raise exception 'Invalid QR code'; end if;
  if not _qr.is_active then raise exception 'This QR code is no longer active'; end if;
  select * into _ev from public.events where id = _qr.event_id;
  if not (public.is_org_officer(_uid, _ev.organization_id) or public.has_role(_uid,'admin')) then
    raise exception 'Not authorized to record attendance for this event';
  end if;
  select * into _reg from public.event_registrations where id = _qr.registration_id;
  if _reg.status <> 'registered' then raise exception 'This student is not registered for the event'; end if;
  if exists (select 1 from public.attendance where registration_id = _reg.id) then
    raise exception 'Attendance already recorded for this student';
  end if;
  insert into public.attendance (registration_id, event_id, student_id, scanned_by)
  values (_reg.id, _reg.event_id, _reg.student_id, _uid);
  select * into _student from public.profiles where id = _reg.student_id;
  return jsonb_build_object('student_name', _student.full_name, 'student_no', _student.student_no, 'event_title', _ev.title);
end;
$$;

create or replace function public.submit_evaluation(
  _event_id uuid, _content int, _organization int, _venue int, _overall int, _comments text default null
) returns void language plpgsql security definer set search_path = public as $$
declare _uid uuid := auth.uid();
begin
  if _uid is null then raise exception 'Not authenticated'; end if;
  if least(_content,_organization,_venue,_overall) < 1 or greatest(_content,_organization,_venue,_overall) > 5 then
    raise exception 'Ratings must be between 1 and 5';
  end if;
  if not exists (
    select 1 from public.attendance a where a.event_id = _event_id and a.student_id = _uid
  ) then raise exception 'Only students with recorded attendance can evaluate this event'; end if;
  if exists (select 1 from public.evaluations where event_id = _event_id and student_id = _uid) then
    raise exception 'You have already submitted an evaluation for this event';
  end if;
  insert into public.evaluations (event_id, student_id, rating_content, rating_organization, rating_venue, rating_overall, comments)
  values (_event_id, _uid, _content, _organization, _venue, _overall, nullif(trim(_comments),''));
end;
$$;

create or replace function public.review_event(_event_id uuid, _approve boolean, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare _ev public.events;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Only administrators can review events'; end if;
  select * into _ev from public.events where id = _event_id;
  if _ev.id is null then raise exception 'Event not found'; end if;
  if _ev.status <> 'pending_approval' then raise exception 'Only events pending approval can be reviewed'; end if;
  update public.events
    set status = case when _approve then 'approved'::event_status else 'rejected'::event_status end,
        rejection_reason = case when _approve then null else nullif(trim(_reason),'') end,
        reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = _event_id;
  insert into public.notifications (user_id, title, body, event_id)
  values (_ev.created_by,
    case when _approve then 'Event approved' else 'Event rejected' end,
    'Your event "' || _ev.title || '" was ' || case when _approve then 'approved. You may now publish it.' else 'rejected. ' || coalesce(_reason,'') end,
    _event_id);
end;
$$;

create or replace function public.publish_event(_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare _ev public.events;
begin
  select * into _ev from public.events where id = _event_id;
  if _ev.id is null then raise exception 'Event not found'; end if;
  if not (public.is_org_officer(auth.uid(), _ev.organization_id) or public.has_role(auth.uid(),'admin')) then
    raise exception 'Not authorized';
  end if;
  if _ev.status <> 'approved' then raise exception 'Only approved events can be published'; end if;
  update public.events set status = 'published', published_at = now(), updated_at = now() where id = _event_id;
  insert into public.notifications (user_id, title, body, event_id)
  select p.id, 'New event published', 'Registration is now open for "' || _ev.title || '".', _event_id
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id and ur.role = 'student'
  where p.status = 'active';
end;
$$;

create or replace function public.issue_certificates(_event_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare _ev public.events; _issued int := 0; _rec record;
begin
  select * into _ev from public.events where id = _event_id;
  if _ev.id is null then raise exception 'Event not found'; end if;
  if not (public.is_org_officer(auth.uid(), _ev.organization_id) or public.has_role(auth.uid(),'admin')) then
    raise exception 'Not authorized';
  end if;
  for _rec in
    select a.student_id
    from public.attendance a
    join public.event_registrations r on r.id = a.registration_id and r.status = 'registered'
    where a.event_id = _event_id
      and (not _ev.requires_evaluation
           or exists (select 1 from public.evaluations e where e.event_id = _event_id and e.student_id = a.student_id))
      and not exists (select 1 from public.certificates c where c.event_id = _event_id and c.student_id = a.student_id)
  loop
    insert into public.certificates (event_id, student_id, certificate_no, issued_by)
    values (_event_id, _rec.student_id,
      'CSU-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
      auth.uid());
    insert into public.notifications (user_id, title, body, event_id)
    values (_rec.student_id, 'Certificate available', 'Your certificate for "' || _ev.title || '" is now available.', _event_id);
    _issued := _issued + 1;
  end loop;
  return _issued;
end;
$$;

create or replace function public.complete_event(_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare _ev public.events;
begin
  select * into _ev from public.events where id = _event_id;
  if _ev.id is null then raise exception 'Event not found'; end if;
  if not (public.is_org_officer(auth.uid(), _ev.organization_id) or public.has_role(auth.uid(),'admin')) then
    raise exception 'Not authorized';
  end if;
  if _ev.status <> 'published' then raise exception 'Only published events can be marked completed'; end if;
  update public.events set status = 'completed', updated_at = now() where id = _event_id;
end;
$$;

-- SEED ORGANIZATIONS
insert into public.organizations (name, acronym, description, adviser) values
  ('Supreme Student Government','SSG','The university-wide student governing body of Catanduanes State University.','Prof. M. Tabuzo'),
  ('Association of Computing Students','ACS','Organization of Information Technology and Computer Science students.','Prof. R. Vargas'),
  ('Junior Philippine Institute of Accountants','JPIA','Organization of Accountancy students of CSU.','Prof. L. Sarmiento'),
  ('CSU Teachers Guild','CTG','Organization of the College of Education students.','Prof. A. Boribor');

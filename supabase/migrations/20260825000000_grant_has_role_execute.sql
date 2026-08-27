grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_org_officer(uuid, uuid) to authenticated;

drop policy if exists "registrations_read" on public.event_registrations;
create policy "registrations_read" on public.event_registrations
for select to authenticated
using (
	student_id = auth.uid()
	or exists (
		select 1
		from public.events e
		join public.organization_officers oo
			on oo.organization_id = e.organization_id
		where e.id = event_id
			and oo.user_id = auth.uid()
	)
	or exists (
		select 1
		from public.user_roles ur
		where ur.user_id = auth.uid()
			and ur.role = 'admin'
	)
);

drop policy if exists "evaluations_read" on public.evaluations;
create policy "evaluations_read" on public.evaluations
for select to authenticated
using (
	student_id = auth.uid()
	or public.has_role(auth.uid(), 'admin')
	or exists (
		select 1
		from public.events e
		join public.organization_officers oo
			on oo.organization_id = e.organization_id
		where e.id = event_id
			and oo.user_id = auth.uid()
	)
);


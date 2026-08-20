revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated, public;
revoke execute on function public.is_org_officer(uuid, uuid) from anon, authenticated, public;
revoke execute on function public.my_org_id() from anon, authenticated, public;

revoke execute on function public.bootstrap_profile(text,text,text,text,text,text) from anon, public;
revoke execute on function public.admin_exists() from public;
revoke execute on function public.claim_first_admin() from anon, public;
revoke execute on function public.set_user_role(uuid, public.app_role) from anon, public;
revoke execute on function public.assign_officer(uuid, uuid, text) from anon, public;
revoke execute on function public.register_for_event(uuid) from anon, public;
revoke execute on function public.record_attendance(text) from anon, public;
revoke execute on function public.submit_evaluation(uuid,int,int,int,int,text) from anon, public;
revoke execute on function public.review_event(uuid, boolean, text) from anon, public;
revoke execute on function public.publish_event(uuid) from anon, public;
revoke execute on function public.issue_certificates(uuid) from anon, public;
revoke execute on function public.complete_event(uuid) from anon, public;

grant execute on function public.bootstrap_profile(text,text,text,text,text,text) to authenticated;
grant execute on function public.admin_exists() to anon, authenticated;
grant execute on function public.claim_first_admin() to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.assign_officer(uuid, uuid, text) to authenticated;
grant execute on function public.register_for_event(uuid) to authenticated;
grant execute on function public.record_attendance(text) to authenticated;
grant execute on function public.submit_evaluation(uuid,int,int,int,int,text) to authenticated;
grant execute on function public.review_event(uuid, boolean, text) to authenticated;
grant execute on function public.publish_event(uuid) to authenticated;
grant execute on function public.issue_certificates(uuid) to authenticated;
grant execute on function public.complete_event(uuid) to authenticated;
import { supabase } from "@/integrations/supabase/client";

export const EVENT_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "published",
  "completed",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export const STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
  completed: "Completed",
};

export type EventRow = {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  description: string | null;
  category: string | null;
  venue: string;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  registration_deadline: string | null;
  requires_evaluation: boolean;
  status: EventStatus;
  rejection_reason: string | null;
  published_at: string | null;
  created_at: string;
  organizations?: { name: string; acronym: string } | null;
};

const EVENT_SELECT = "*, organizations(name, acronym)";

export async function listEvents(filter?: { organizationId?: string; statuses?: EventStatus[] }) {
  let query = supabase.from("events").select(EVENT_SELECT).order("starts_at", { ascending: true });
  if (filter?.organizationId) query = query.eq("organization_id", filter.organizationId);
  if (filter?.statuses?.length) query = query.in("status", filter.statuses);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as EventRow[];
}

export async function getEvent(id: string) {
  const { data, error } = await supabase.from("events").select(EVENT_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as EventRow | null;
}

export type ParticipantRow = {
  id: string;
  event_id: string;
  student_id: string;
  status: string;
  registered_at: string;
  profiles: { full_name: string; student_no: string | null; course: string | null; email: string } | null;
  attendance: { scanned_at: string }[];
  qr_codes: { token: string }[];
};

export async function listParticipants(eventId: string) {
  const { data: registrations, error } = await supabase
    .from("event_registrations")
    .select(
      "id, event_id, student_id, status, registered_at",
    )
    .eq("event_id", eventId)
    .eq("status", "registered")
    .order("registered_at", { ascending: true });
  if (error) throw error;

  const studentIds = [...new Set((registrations ?? []).map((registration) => registration.student_id))];
  const registrationIds = (registrations ?? []).map((registration) => registration.id);
  const [{ data: profiles, error: profilesError }, { data: attendance, error: attendanceError }] =
    await Promise.all([
      studentIds.length
        ? supabase
            .from("profiles")
            .select("id, full_name, student_no, course, email")
            .in("id", studentIds)
        : Promise.resolve({ data: [], error: null }),
      registrationIds.length
        ? supabase
            .from("attendance")
            .select("registration_id, scanned_at")
            .in("registration_id", registrationIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (profilesError) throw profilesError;
  if (attendanceError) throw attendanceError;

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const attendanceByRegistrationId = new Map(
    (attendance ?? []).map((record) => [record.registration_id, [{ scanned_at: record.scanned_at }]]),
  );
  return (registrations ?? []).map((registration) => ({
    ...registration,
    profiles: profileById.get(registration.student_id) ?? null,
    attendance: attendanceByRegistrationId.get(registration.id) ?? [],
    qr_codes: [],
  })) as unknown as ParticipantRow[];
}

export async function myRegistration(eventId: string, userId: string) {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("id, status, registered_at")
    .eq("event_id", eventId)
    .eq("student_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [{ data: qrCodes, error: qrError }, { data: attendance, error: attendanceError }] =
    await Promise.all([
      supabase.from("qr_codes").select("token, is_active").eq("registration_id", data.id).maybeSingle(),
      supabase.from("attendance").select("scanned_at").eq("registration_id", data.id),
    ]);
  if (qrError) throw qrError;
  if (attendanceError) throw attendanceError;

  return {
    ...data,
    qr_codes: qrCodes ? [qrCodes] : [],
    attendance: attendance ?? [],
  } as {
    id: string;
    status: string;
    registered_at: string;
    qr_codes: { token: string; is_active: boolean }[];
    attendance: { scanned_at: string }[];
  };
}

export type EvaluationRow = {
  id: string;
  event_id: string;
  student_id: string;
  rating_content: number;
  rating_organization: number;
  rating_venue: number;
  rating_overall: number;
  comments: string | null;
  submitted_at: string;
  profiles?: { full_name: string } | null;
  events?: { title: string } | null;
};

export async function listEvaluations(filter: { eventId?: string; studentId?: string }) {
  let query = supabase
    .from("evaluations")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (filter.eventId) query = query.eq("event_id", filter.eventId);
  if (filter.studentId) query = query.eq("student_id", filter.studentId);
  const { data, error } = await query;
  if (error) throw error;
  const studentIds = [...new Set((data ?? []).map((evaluation) => evaluation.student_id))];
  const { data: profiles, error: profilesError } = studentIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
    : { data: [], error: null };
  if (profilesError) throw profilesError;
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return (data ?? []).map((evaluation) => ({
    ...evaluation,
    profiles: profileById.get(evaluation.student_id) ?? null,
  })) as unknown as EvaluationRow[];
}

export type CertificateRow = {
  id: string;
  event_id: string;
  student_id: string;
  certificate_no: string;
  status: string;
  issued_at: string;
  profiles?: { full_name: string; student_no: string | null } | null;
  events?: { title: string; starts_at: string; organizations?: { name: string } | null } | null;
};

export async function listCertificates(filter: { eventId?: string; studentId?: string }) {
  let query = supabase
    .from("certificates")
    .select("*")
    .order("issued_at", { ascending: false });
  if (filter.eventId) query = query.eq("event_id", filter.eventId);
  if (filter.studentId) query = query.eq("student_id", filter.studentId);
  const { data, error } = await query;
  if (error) throw error;
  const studentIds = [...new Set((data ?? []).map((certificate) => certificate.student_id))];
  const eventIds = [...new Set((data ?? []).map((certificate) => certificate.event_id))];
  const [{ data: profiles, error: profilesError }, { data: events, error: eventsError }] =
    await Promise.all([
      studentIds.length
        ? supabase.from("profiles").select("id, full_name, student_no").in("id", studentIds)
        : Promise.resolve({ data: [], error: null }),
      eventIds.length
        ? supabase.from("events").select("id, title, starts_at, organization_id").in("id", eventIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (profilesError) throw profilesError;
  if (eventsError) throw eventsError;

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const organizationIds = [...new Set((events ?? []).map((event) => event.organization_id))];
  const { data: organizations, error: organizationsError } = organizationIds.length
    ? await supabase.from("organizations").select("id, name").in("id", organizationIds)
    : { data: [], error: null };
  if (organizationsError) throw organizationsError;
  const organizationById = new Map((organizations ?? []).map((organization) => [organization.id, organization]));
  const eventById = new Map(
    (events ?? []).map((event) => [event.id, { ...event, organizations: organizationById.get(event.organization_id) ?? null }]),
  );
  return (data ?? []).map((certificate) => ({
    ...certificate,
    profiles: profileById.get(certificate.student_id) ?? null,
    events: eventById.get(certificate.event_id) ?? null,
  })) as unknown as CertificateRow[];
}

export async function eventReport(eventId: string) {
  const [participants, evaluations, certificates] = await Promise.all([
    listParticipants(eventId),
    listEvaluations({ eventId }),
    listCertificates({ eventId }),
  ]);
  const attended = participants.filter((p) => p.attendance.length > 0).length;
  const registered = participants.filter((p) => p.status === "registered").length;
  const avg = (key: keyof EvaluationRow) =>
    evaluations.length
      ? evaluations.reduce((sum, e) => sum + Number(e[key] ?? 0), 0) / evaluations.length
      : 0;
  return {
    participants,
    evaluations,
    certificates,
    registered,
    attended,
    attendanceRate: registered ? Math.round((attended / registered) * 100) : 0,
    averages: {
      content: avg("rating_content"),
      organization: avg("rating_organization"),
      venue: avg("rating_venue"),
      overall: avg("rating_overall"),
    },
  };
}
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type EventFormValues = {
  title: string;
  description: string;
  venue: string;
  starts_at: string;
  ends_at: string;
  capacity: string;
};

const EMPTY: EventFormValues = { title: "", description: "", venue: "", starts_at: "", ends_at: "", capacity: "" };

export function EventForm({ initialValues, submitLabel, onSubmit, isPending = false }: {
  initialValues?: Partial<EventFormValues>;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => void;
  isPending?: boolean;
}) {
  const [values, setValues] = useState({ ...EMPTY, ...initialValues });
  const update = (key: keyof EventFormValues, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit(values); };
  return (
    <form className="max-w-2xl space-y-5" onSubmit={submit}>
      <div className="space-y-2"><Label htmlFor="event-title">Title</Label><Input id="event-title" value={values.title} onChange={(e) => update("title", e.target.value)} required maxLength={150} /></div>
      <div className="space-y-2"><Label htmlFor="event-description">Description</Label><Textarea id="event-description" value={values.description} onChange={(e) => update("description", e.target.value)} rows={5} maxLength={2000} /></div>
      <div className="space-y-2"><Label htmlFor="event-venue">Location</Label><Input id="event-venue" value={values.venue} onChange={(e) => update("venue", e.target.value)} required maxLength={150} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="event-starts">Date and time</Label><Input id="event-starts" type="datetime-local" value={values.starts_at} onChange={(e) => update("starts_at", e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="event-ends">End date and time</Label><Input id="event-ends" type="datetime-local" value={values.ends_at} onChange={(e) => update("ends_at", e.target.value)} required /></div></div>
      <div className="space-y-2 sm:max-w-xs"><Label htmlFor="event-capacity">Capacity</Label><Input id="event-capacity" type="number" min={1} max={100000} value={values.capacity} onChange={(e) => update("capacity", e.target.value)} placeholder="Optional" /></div>
      <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : submitLabel}</Button>
    </form>
  );
}
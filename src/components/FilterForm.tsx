"use client";

import { CATEGORIES, type FiltersInput } from "@/lib/query";

export type FormState = {
  before: string;
  after: string;
  from: string;
  to: string;
  subject: string;
  hasWords: string;
  excludeWords: string;
  category: NonNullable<FiltersInput["category"]>;
  label: string;
  hasAttachment: boolean;
  largerThanMb: string;
  readState: NonNullable<FiltersInput["readState"]>;
  excludeStarred: boolean;
  excludeImportant: boolean;
  raw: string;
};

export const initialForm: FormState = {
  before: "",
  after: "",
  from: "",
  to: "",
  subject: "",
  hasWords: "",
  excludeWords: "",
  category: "",
  label: "",
  hasAttachment: false,
  largerThanMb: "",
  readState: "any",
  excludeStarred: true,
  excludeImportant: true,
  raw: "",
};

const splitList = (s: string) => s.split(/[,\n]/).map((v) => v.trim()).filter(Boolean);

export function toFilters(form: FormState): FiltersInput {
  return {
    ...form,
    from: splitList(form.from),
    to: splitList(form.to),
    largerThanMb: form.largerThanMb ? Number(form.largerThanMb) : undefined,
  };
}

const input =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function FilterForm({
  form,
  onChange,
  disabled,
}: {
  form: FormState;
  onChange: (form: FormState) => void;
  disabled?: boolean;
}) {
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => onChange({ ...form, [key]: value });
  const text = (key: { [K in keyof FormState]: FormState[K] extends string ? K : never }[keyof FormState]) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(key, e.target.value as FormState[typeof key]),
    className: input,
    disabled,
  });
  const check = (key: "hasAttachment" | "excludeStarred" | "excludeImportant", label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} disabled={disabled} />
      {label}
    </label>
  );

  return (
    <fieldset className="grid gap-4 sm:grid-cols-2" disabled={disabled}>
      <Field label="Older than" hint="Received before the start of this day">
        <input type="date" {...text("before")} />
      </Field>
      <Field label="Newer than" hint="Received on or after this day">
        <input type="date" {...text("after")} />
      </Field>
      <Field label="From" hint="Addresses, domains or names; comma-separated (matches any)">
        <input placeholder="news@shop.com, @linkedin.com" {...text("from")} />
      </Field>
      <Field label="To" hint="Comma-separated (matches any)">
        <input placeholder="me+lists@gmail.com" {...text("to")} />
      </Field>
      <Field label="Subject contains">
        <input {...text("subject")} />
      </Field>
      <Field label="Has the words">
        <input placeholder="unsubscribe" {...text("hasWords")} />
      </Field>
      <Field label="Doesn't have" hint="Space-separated words to exclude">
        <input placeholder="invoice receipt" {...text("excludeWords")} />
      </Field>
      <Field label="Label">
        <input placeholder="newsletters" {...text("label")} />
      </Field>
      <Field label="Category">
        <select {...text("category")}>
          <option value="">Any</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c[0].toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Read status">
        <select {...text("readState")}>
          <option value="any">Any</option>
          <option value="read">Read only</option>
          <option value="unread">Unread only</option>
        </select>
      </Field>
      <Field label="Larger than (MB)">
        <input type="number" min="0" step="0.5" {...text("largerThanMb")} />
      </Field>
      <Field label="Advanced: raw Gmail query" hint="Appended as-is, e.g. older_than:2y">
        <input {...text("raw")} />
      </Field>
      <div className="flex flex-col gap-2 sm:col-span-2">
        {check("hasAttachment", "Has attachment")}
        {check("excludeStarred", "Keep starred emails (recommended)")}
        {check("excludeImportant", "Keep emails marked important (recommended)")}
      </div>
    </fieldset>
  );
}

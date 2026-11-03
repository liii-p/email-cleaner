import { z } from "zod";

export const CATEGORIES = ["promotions", "social", "updates", "forums", "primary"] as const;

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const filtersSchema = z.object({
  before: dateString,
  after: dateString,
  from: z.array(z.string().trim()).default([]),
  to: z.array(z.string().trim()).default([]),
  subject: z.string().trim().default(""),
  hasWords: z.string().trim().default(""),
  excludeWords: z.string().trim().default(""),
  category: z.enum(CATEGORIES).or(z.literal("")).default(""),
  label: z.string().trim().default(""),
  hasAttachment: z.boolean().default(false),
  largerThanMb: z.number().positive().optional(),
  readState: z.enum(["any", "read", "unread"]).default("any"),
  excludeStarred: z.boolean().default(true),
  excludeImportant: z.boolean().default(true),
  raw: z.string().trim().default(""),
});

export type Filters = z.infer<typeof filtersSchema>;
export type FiltersInput = z.input<typeof filtersSchema>;

export class EmptyQueryError extends Error {
  constructor() {
    super("Add at least one filter. An empty query would match your whole mailbox.");
  }
}

// Strip characters that would break out of Gmail's query syntax.
function clean(value: string): string {
  return value.replace(/["()]/g, "").trim();
}

function quoted(value: string): string {
  const v = clean(value);
  return /\s/.test(v) ? `"${v}"` : v;
}

function anyOf(operator: string, values: string[]): string | null {
  const vs = values.map(clean).filter(Boolean);
  if (vs.length === 0) return null;
  if (vs.length === 1) return `${operator}:${quoted(vs[0])}`;
  return `${operator}:(${vs.map(quoted).join(" OR ")})`;
}

// Midnight at the start of the given day in the local timezone, as epoch
// seconds. Gmail treats `before:YYYY/MM/DD` as midnight Pacific time, so epoch
// seconds are used to respect the timezone the app runs in.
export function startOfDayEpoch(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(new Date(y, m - 1, d).getTime() / 1000);
}

export function buildQuery(filters: Filters): string {
  const criteria: string[] = [];

  if (filters.before) criteria.push(`before:${startOfDayEpoch(filters.before)}`);
  if (filters.after) criteria.push(`after:${startOfDayEpoch(filters.after)}`);

  const from = anyOf("from", filters.from);
  if (from) criteria.push(from);
  const to = anyOf("to", filters.to);
  if (to) criteria.push(to);

  if (clean(filters.subject)) criteria.push(`subject:(${clean(filters.subject)})`);
  if (clean(filters.hasWords)) criteria.push(clean(filters.hasWords));
  for (const word of clean(filters.excludeWords).split(/\s+/).filter(Boolean)) {
    criteria.push(`-${word}`);
  }

  if (filters.category) criteria.push(`category:${filters.category}`);
  if (clean(filters.label)) criteria.push(`label:${quoted(filters.label)}`);
  if (filters.hasAttachment) criteria.push("has:attachment");
  if (filters.largerThanMb) criteria.push(`larger:${filters.largerThanMb}M`);
  if (filters.readState === "read") criteria.push("is:read");
  if (filters.readState === "unread") criteria.push("is:unread");
  if (filters.raw) criteria.push(filters.raw);

  if (criteria.length === 0) throw new EmptyQueryError();

  if (filters.excludeStarred) criteria.push("-is:starred");
  if (filters.excludeImportant) criteria.push("-is:important");

  return criteria.join(" ");
}

/**
 * Shared contract between the Pagecog Forms API (api.pagecog.com.au) and the site kit.
 * zod schemas, wire types, localised messages. No I/O, no framework imports.
 */
import { z } from "zod"

export const LOCALES = ["en", "sr"] as const
/** "sr" is Serbian in Cyrillic (sr-Cyrl). */
export type Locale = (typeof LOCALES)[number]

/** Accepts "en", "en-AU", "sr", "sr-Cyrl", "sr_RS"; anything else is undefined. */
export function normaliseLocale(v: unknown): Locale | undefined {
  if (typeof v !== "string") return undefined
  const base = v.trim().toLowerCase().split(/[-_]/)[0]
  return (LOCALES as readonly string[]).includes(base) ? (base as Locale) : undefined
}

export const LIMITS = { name: 120, email: 254, phone: 40, message: 8000, website: 200, source: 40, page: 200 } as const
/** Submissions faster than this after the form rendered are treated as bots (ms). */
export const MIN_FILL_MS = 1500

// Same practical shape check as the collector's lead validation (not RFC 5322).
const EMAIL_RE = /^[^\s@<>()[\]",;:\\]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i
const hex = /^[a-f0-9]{16,64}$/

/** Blank form fields arrive as "". Treat them as absent. */
const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v)
const text = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional())

const emailString = z
  .string()
  .trim()
  .toLowerCase()
  .max(LIMITS.email)
  .refine((s) => EMAIL_RE.test(s), "invalid_email")
const email = z.preprocess(blank, emailString.optional())
const requiredEmail = z.preprocess(blank, emailString)
const phone = z.preprocess(
  blank,
  z
    .string()
    .trim()
    .max(LIMITS.phone)
    .refine((s) => /^[0-9+()\-.\s]+$/.test(s) && (s.match(/\d/g)?.length ?? 0) >= 6, "invalid_phone")
    .optional(),
)
const locale = z.preprocess((v) => normaliseLocale(v), z.enum(LOCALES).optional())

/** Spam control fields every form carries. `hp` must stay empty; `t` is ms between render and submit. */
const guard = {
  hp: z.string().max(200).optional(),
  t: z.number().int().min(0).max(86_400_000).optional(),
  /** The page the form is on (path). Optional: the server kit falls back to the Referer. */
  page: text(LIMITS.page),
}
/** Tracking context the server kit fills from the request (cookies and page), never the browser. */
const ctx = {
  v: z.string().regex(hex).optional(),
  s: z.string().regex(hex).optional(),
}

export const subscribeSchema = z.object({
  email: requiredEmail,
  name: text(LIMITS.name),
  source: text(LIMITS.source),
  locale,
  ...guard,
})
/** What the browser sends (before validation). */
export type SubscribeInput = { email: string; name?: string; source?: string; locale?: string; hp?: string; t?: number; page?: string }
export type SubscribeData = z.output<typeof subscribeSchema>

export const contactSchema = z
  .object({
    name: z.preprocess(blank, z.string().trim().min(2, "name_required").max(LIMITS.name)),
    email,
    phone,
    message: z.preprocess(blank, z.string().trim().min(1, "message_required").max(LIMITS.message)),
    website: text(LIMITS.website),
    locale,
    ...guard,
  })
  .refine((d) => d.email !== undefined || d.phone !== undefined, { message: "contact_required", path: ["email"] })
export type ContactInput = {
  name: string
  email?: string
  phone?: string
  message: string
  website?: string
  locale?: string
  hp?: string
  t?: number
  page?: string
}
export type ContactData = z.output<typeof contactSchema>

/** What the server kit POSTs: the browser fields plus request context. */
export const subscribeWireSchema = subscribeSchema.extend(ctx)
export const contactWireSchema = contactSchema.extend(ctx)
export type SubscribeWire = z.output<typeof subscribeWireSchema>
export type ContactWire = z.output<typeof contactWireSchema>

export type ErrorCode =
  | "invalid"
  | "rate_limited"
  | "feature_disabled"
  | "unavailable"
  | "unauthorised"
  | "email_failed"
  | "error"

export type FieldErrors = Partial<Record<"email" | "name" | "phone" | "message" | "website", string>>

export type FormResult<T extends object = object> =
  | ({ ok: true; message: string } & T)
  | { ok: false; code: ErrorCode; message: string; fields?: FieldErrors }

/** pending = confirmation email sent (double opt-in); subscribed = no confirmation needed. */
export type SubscribeResult = FormResult<{ status: "pending" | "subscribed" }>
export type ContactResult = FormResult<{ id: string }>

export type MessageKey =
  | "subscribe_pending"
  | "subscribe_done"
  | "contact_sent"
  | "invalid"
  | "invalid_email"
  | "name_required"
  | "contact_required"
  | "message_required"
  | "invalid_phone"
  | "rate_limited"
  | "feature_disabled"
  | "unavailable"
  | "unauthorised"
  | "email_failed"
  | "error"

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
  en: {
    subscribe_pending: "Almost done. Check your email for a link to confirm your subscription.",
    subscribe_done: "You're subscribed.",
    contact_sent: "Thanks. Your message has been sent.",
    invalid: "Please check the form and try again.",
    invalid_email: "Please enter a valid email address.",
    name_required: "Please enter your name.",
    contact_required: "Please give an email address or a phone number.",
    message_required: "Please write a message.",
    invalid_phone: "Please enter a valid phone number.",
    rate_limited: "Too many attempts. Please try again in a minute.",
    feature_disabled: "This form is not available right now.",
    unavailable: "We could not send that just now. Please try again shortly.",
    unauthorised: "This form is not available right now.",
    email_failed: "We could not send the email just now. Please try again shortly.",
    error: "Something went wrong. Please try again.",
  },
  sr: {
    subscribe_pending: "Још мало. Проверите е-пошту и потврдите претплату помоћу линка.",
    subscribe_done: "Претплаћени сте.",
    contact_sent: "Хвала. Ваша порука је послата.",
    invalid: "Проверите образац и покушајте поново.",
    invalid_email: "Унесите исправну адресу е-поште.",
    name_required: "Унесите своје име.",
    contact_required: "Унесите адресу е-поште или број телефона.",
    message_required: "Напишите поруку.",
    invalid_phone: "Унесите исправан број телефона.",
    rate_limited: "Превише покушаја. Покушајте поново за минут.",
    feature_disabled: "Овај образац тренутно није доступан.",
    unavailable: "Тренутно нисмо могли да пошаљемо. Покушајте поново ускоро.",
    unauthorised: "Овај образац тренутно није доступан.",
    email_failed: "Тренутно нисмо могли да пошаљемо е-пошту. Покушајте поново ускоро.",
    error: "Нешто није у реду. Покушајте поново.",
  },
}

export const message = (locale: Locale | undefined, key: MessageKey): string => MESSAGES[locale ?? "en"][key]

/** Maps zod issues to one message key per field. Unknown issue text falls back to "invalid". */
export function fieldErrors(error: z.ZodError, locale?: Locale): FieldErrors {
  const out: FieldErrors = {}
  for (const i of error.issues) {
    const f = String(i.path[0] ?? "")
    if (!["email", "name", "phone", "message", "website"].includes(f) || out[f as keyof FieldErrors]) continue
    const key = (i.message in MESSAGES.en ? i.message : f === "email" ? "invalid_email" : "invalid") as MessageKey
    out[f as keyof FieldErrors] = message(locale, key)
  }
  return out
}

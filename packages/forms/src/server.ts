/**
 * Server client for the Pagecog Forms API. Framework free (Request only), never throws.
 * Call it from your own server function / route handler, after your own transport-level checks:
 *
 *   const res = await pagecogSubscribe(request, env, input)   // input = the browser's fields
 *   return res                                                // { ok, message, ... } safe to send to the browser
 *
 * env.COLLECTOR_KEY is the site's collector key (the same one analytics uses). It is sent as x-pc-key and
 * never reaches the browser. The tenant is the request host verified against that key, never the input.
 */
import {
  contactSchema,
  fieldErrors,
  message,
  normaliseLocale,
  subscribeSchema,
  type ContactResult,
  type ErrorCode,
  type Locale,
  type SubscribeResult,
} from "./schema"

export const API_URL = "https://api.pagecog.com.au"
const TIMEOUT_MS = 5000
const ID_RE = /^[a-f0-9]{16,64}$/

export type FormsEnv = { COLLECTOR_KEY?: string; PAGECOG_API_URL?: string }

function envOf(env: unknown): FormsEnv {
  const e = (env ?? {}) as FormsEnv
  const p = typeof process !== "undefined" ? process.env : undefined
  return { COLLECTOR_KEY: e.COLLECTOR_KEY ?? p?.COLLECTOR_KEY, PAGECOG_API_URL: e.PAGECOG_API_URL ?? p?.PAGECOG_API_URL }
}

/** Platform info for the API's rate limits and analytics only (ip is never stored). Inbound x-pc-* is never read. */
function platformInfo(request: Request): { ip: string; country: string; region: string; city: string; bot: string } {
  const out = { ip: "", country: "", region: "", city: "", bot: "" }
  const cf = (request as { cf?: Record<string, unknown> }).cf
  if (cf && typeof cf === "object") {
    out.ip = request.headers.get("cf-connecting-ip") ?? ""
    out.country = String(cf.country ?? "")
    out.region = String(cf.regionCode ?? "")
    out.city = String(cf.city ?? "")
    const score = (cf.botManagement as { score?: number } | undefined)?.score
    if (typeof score === "number") out.bot = String(score)
    return out
  }
  if (typeof process !== "undefined" && process.env?.VERCEL) {
    const h = request.headers
    out.ip = h.get("x-real-ip") ?? ""
    out.country = h.get("x-vercel-ip-country") ?? ""
    out.region = h.get("x-vercel-ip-country-region") ?? ""
    try {
      out.city = decodeURIComponent(h.get("x-vercel-ip-city") ?? "")
    } catch {
      // keep empty
    }
  }
  return out
}

function cookie(request: Request, name: string): string | undefined {
  const m = (request.headers.get("cookie") ?? "").match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return m && ID_RE.test(m[1]) ? m[1] : undefined
}

/** Own-host page path from the Referer, when none was given. */
function refererPath(request: Request, host: string): string | undefined {
  try {
    const ref = request.headers.get("referer")
    if (!ref) return undefined
    const u = new URL(ref)
    return u.hostname.toLowerCase().replace(/^www\./, "") === host.replace(/^www\./, "") ? u.pathname : undefined
  } catch {
    return undefined
  }
}

type Json = { ok?: unknown; message?: unknown; code?: unknown; status?: unknown; id?: unknown; fields?: unknown }

const CODES: ErrorCode[] = ["invalid", "rate_limited", "feature_disabled", "unavailable", "unauthorised", "email_failed", "error"]

async function call(
  path: string,
  request: Request,
  env: unknown,
  body: Record<string, unknown>,
  locale: Locale | undefined,
): Promise<{ ok: true; json: Json } | { ok: false; code: ErrorCode; message: string }> {
  const fail = (code: ErrorCode) => ({ ok: false as const, code, message: message(locale, code) })
  try {
    const e = envOf(env)
    if (!e.COLLECTOR_KEY) {
      console.error("pagecog forms: COLLECTOR_KEY is not set")
      return fail("unavailable")
    }
    const host = new URL(request.url).hostname.toLowerCase()
    const bare = host.replace(/^www\./, "")
    const payload = {
      ...body,
      page: body.page ?? refererPath(request, bare),
      v: cookie(request, "pc_v"),
      s: cookie(request, "pc_s"),
    }
    const g = platformInfo(request)
    const headers: Record<string, string> = {
      "x-pc-key": e.COLLECTOR_KEY,
      "x-pc-host": host,
      "x-pc-ip": g.ip,
      "x-pc-ua": (request.headers.get("user-agent") ?? "").slice(0, 300),
      "x-pc-country": g.country,
      "x-pc-region": g.region,
      "x-pc-city": g.city,
      "content-type": "application/json",
    }
    if (g.bot) headers["x-pc-bot"] = g.bot
    if (/(?:^|; )pc_internal=1(?:;|$)/.test(request.headers.get("cookie") ?? "")) headers["x-pc-internal"] = "1"
    const res = await fetch(`${e.PAGECOG_API_URL ?? API_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    let json: Json = {}
    try {
      json = (await res.json()) as Json
    } catch {
      // non-JSON body: handled by status below
    }
    if (res.ok && json.ok === true) return { ok: true, json }
    if (res.status === 429) return fail("rate_limited")
    if (res.status === 401 || res.status === 404) {
      console.error("pagecog forms: API refused the key or host", res.status)
      return fail("unauthorised")
    }
    if (res.status >= 500) return fail("unavailable")
    const code = CODES.includes(json.code as ErrorCode) ? (json.code as ErrorCode) : "error"
    return { ok: false, code, message: typeof json.message === "string" ? json.message : message(locale, code) }
  } catch {
    return fail("unavailable")
  }
}

/** Subscribe an email (double opt-in by default). `input` is the browser's fields. */
export async function pagecogSubscribe(request: Request, env: unknown, input: unknown): Promise<SubscribeResult> {
  const raw = (input ?? {}) as Record<string, unknown>
  const locale = normaliseLocale(raw.locale)
  try {
    const parsed = subscribeSchema.safeParse(input)
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error, locale)
      return { ok: false, code: "invalid", message: fields.email ?? message(locale, "invalid"), fields }
    }
    const r = await call("/v1/subscribe", request, env, parsed.data, parsed.data.locale)
    if (!r.ok) return r
    return {
      ok: true,
      status: r.json.status === "subscribed" ? "subscribed" : "pending",
      message: typeof r.json.message === "string" ? r.json.message : message(parsed.data.locale, "subscribe_pending"),
    }
  } catch {
    return { ok: false, code: "error", message: message(locale, "error") }
  }
}

/** Send a contact enquiry: name + (email or phone) + message. */
export async function pagecogContact(request: Request, env: unknown, input: unknown): Promise<ContactResult> {
  const raw = (input ?? {}) as Record<string, unknown>
  const locale = normaliseLocale(raw.locale)
  try {
    const parsed = contactSchema.safeParse(input)
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error, locale)
      return { ok: false, code: "invalid", message: Object.values(fields)[0] ?? message(locale, "invalid"), fields }
    }
    const r = await call("/v1/contact", request, env, parsed.data, parsed.data.locale)
    if (!r.ok) return r
    return {
      ok: true,
      id: typeof r.json.id === "string" ? r.json.id : "",
      message: typeof r.json.message === "string" ? r.json.message : message(parsed.data.locale, "contact_sent"),
    }
  } catch {
    return { ok: false, code: "error", message: message(locale, "error") }
  }
}

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
import { contactSchema, fieldErrors, message, normaliseLocale, subscribeSchema, } from "./schema";
export const API_URL = "https://api.pagecog.com.au";
const TIMEOUT_MS = 5000;
const ID_RE = /^[a-f0-9]{16,64}$/;
function envOf(env) {
    const e = (env ?? {});
    const p = typeof process !== "undefined" ? process.env : undefined;
    return { COLLECTOR_KEY: e.COLLECTOR_KEY ?? p?.COLLECTOR_KEY, PAGECOG_API_URL: e.PAGECOG_API_URL ?? p?.PAGECOG_API_URL };
}
/** Platform client ip for the API's rate limits only (never stored). Inbound x-pc-* is never read. */
function platformIp(request) {
    if (request.cf)
        return request.headers.get("cf-connecting-ip") ?? "";
    if (typeof process !== "undefined" && process.env?.VERCEL)
        return request.headers.get("x-real-ip") ?? "";
    return "";
}
function cookie(request, name) {
    const m = (request.headers.get("cookie") ?? "").match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m && ID_RE.test(m[1]) ? m[1] : undefined;
}
/** Own-host page path from the Referer, when none was given. */
function refererPath(request, host) {
    try {
        const ref = request.headers.get("referer");
        if (!ref)
            return undefined;
        const u = new URL(ref);
        return u.hostname.toLowerCase().replace(/^www\./, "") === host.replace(/^www\./, "") ? u.pathname : undefined;
    }
    catch {
        return undefined;
    }
}
const CODES = ["invalid", "rate_limited", "disabled", "unavailable", "unauthorised", "email_failed", "error"];
async function call(path, request, env, body, locale) {
    const fail = (code) => ({ ok: false, code, message: message(locale, code) });
    try {
        const e = envOf(env);
        if (!e.COLLECTOR_KEY) {
            console.error("pagecog forms: COLLECTOR_KEY is not set");
            return fail("unavailable");
        }
        const host = new URL(request.url).hostname.toLowerCase();
        const bare = host.replace(/^www\./, "");
        const payload = {
            ...body,
            page: body.page ?? refererPath(request, bare),
            v: cookie(request, "pc_v"),
            s: cookie(request, "pc_s"),
        };
        const res = await fetch(`${e.PAGECOG_API_URL ?? API_URL}${path}`, {
            method: "POST",
            headers: {
                "x-pc-key": e.COLLECTOR_KEY,
                "x-pc-host": host,
                "x-pc-ip": platformIp(request),
                "x-pc-ua": (request.headers.get("user-agent") ?? "").slice(0, 300),
                "content-type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        let json = {};
        try {
            json = (await res.json());
        }
        catch {
            // non-JSON body: handled by status below
        }
        if (res.ok && json.ok === true)
            return { ok: true, json };
        if (res.status === 429)
            return fail("rate_limited");
        if (res.status === 401 || res.status === 404) {
            console.error("pagecog forms: API refused the key or host", res.status);
            return fail("unauthorised");
        }
        if (res.status >= 500)
            return fail("unavailable");
        const code = CODES.includes(json.code) ? json.code : "error";
        return { ok: false, code, message: typeof json.message === "string" ? json.message : message(locale, code) };
    }
    catch {
        return fail("unavailable");
    }
}
/** Subscribe an email (double opt-in by default). `input` is the browser's fields. */
export async function pagecogSubscribe(request, env, input) {
    const raw = (input ?? {});
    const locale = normaliseLocale(raw.locale);
    try {
        const parsed = subscribeSchema.safeParse(input);
        if (!parsed.success) {
            const fields = fieldErrors(parsed.error, locale);
            return { ok: false, code: "invalid", message: fields.email ?? message(locale, "invalid"), fields };
        }
        const r = await call("/v1/subscribe", request, env, parsed.data, parsed.data.locale);
        if (!r.ok)
            return r;
        return {
            ok: true,
            status: r.json.status === "subscribed" ? "subscribed" : "pending",
            message: typeof r.json.message === "string" ? r.json.message : message(parsed.data.locale, "subscribe_pending"),
        };
    }
    catch {
        return { ok: false, code: "error", message: message(locale, "error") };
    }
}
/** Send a contact enquiry: name + (email or phone) + message. */
export async function pagecogContact(request, env, input) {
    const raw = (input ?? {});
    const locale = normaliseLocale(raw.locale);
    try {
        const parsed = contactSchema.safeParse(input);
        if (!parsed.success) {
            const fields = fieldErrors(parsed.error, locale);
            return { ok: false, code: "invalid", message: Object.values(fields)[0] ?? message(locale, "invalid"), fields };
        }
        const r = await call("/v1/contact", request, env, parsed.data, parsed.data.locale);
        if (!r.ok)
            return r;
        return {
            ok: true,
            id: typeof r.json.id === "string" ? r.json.id : "",
            message: typeof r.json.message === "string" ? r.json.message : message(parsed.data.locale, "contact_sent"),
        };
    }
    catch {
        return { ok: false, code: "error", message: message(locale, "error") };
    }
}

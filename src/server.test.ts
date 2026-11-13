import { afterEach, expect, test } from "bun:test"
import { pagecogContact, pagecogSubscribe } from "./server"

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

const vid = "a".repeat(32)
const req = () =>
  new Request("https://www.church.example/en/join", {
    headers: { cookie: `pc_v=${vid}; pc_s=${vid}; other=1`, "user-agent": "Mozilla/5.0", referer: "https://church.example/news" },
  })
const env = { COLLECTOR_KEY: "k".repeat(64) }

function mock(res: () => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = []
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    return res()
  }) as never
  return calls
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } })

test("subscribe: posts key, host, cookies, page; returns the API message", async () => {
  const calls = mock(() => json({ ok: true, status: "pending", message: "Check your email" }))
  const r = await pagecogSubscribe(req(), env, { email: "Jo@Example.com", t: 5000 })
  expect(r).toEqual({ ok: true, status: "pending", message: "Check your email" })
  const h = calls[0].init.headers as Record<string, string>
  expect(calls[0].url).toBe("https://api.pagecog.com.au/v1/subscribe")
  expect(h["x-pc-key"]).toBe(env.COLLECTOR_KEY)
  expect(h["x-pc-host"]).toBe("www.church.example")
  const body = JSON.parse(calls[0].init.body as string)
  expect(body).toMatchObject({ email: "jo@example.com", v: vid, s: vid, page: "/news" })
})

test("subscribe: invalid email never calls the API", async () => {
  const calls = mock(() => json({ ok: true }))
  const r = await pagecogSubscribe(req(), env, { email: "x", locale: "sr" })
  expect(r.ok).toBe(false)
  if (!r.ok) {
    expect(r.code).toBe("invalid")
    expect(r.message).toBe("Унесите исправну адресу е-поште.")
  }
  expect(calls.length).toBe(0)
})

test("never throws: network error, timeout, 5xx, garbage, missing key", async () => {
  mock(() => {
    throw new Error("boom")
  })
  const a = await pagecogSubscribe(req(), env, { email: "jo@example.com" })
  expect(a).toMatchObject({ ok: false, code: "unavailable" })
  mock(() => new Response("<html>", { status: 502 }))
  expect(await pagecogSubscribe(req(), env, { email: "jo@example.com" })).toMatchObject({ ok: false, code: "unavailable" })
  mock(() => json({ ok: false }, 429))
  expect(await pagecogSubscribe(req(), env, { email: "jo@example.com" })).toMatchObject({ ok: false, code: "rate_limited" })
  mock(() => json({}, 401))
  expect(await pagecogSubscribe(req(), env, { email: "jo@example.com" })).toMatchObject({ ok: false, code: "unauthorised" })
  const calls = mock(() => json({ ok: true }))
  expect(await pagecogSubscribe(req(), {}, { email: "jo@example.com" })).toMatchObject({ ok: false, code: "unavailable" })
  expect(calls.length).toBe(0)
  expect(await pagecogSubscribe(req(), env, null)).toMatchObject({ ok: false })
})

test("contact: validates, posts, returns id", async () => {
  const calls = mock(() => json({ ok: true, id: "01JA2B3C4D5E6F7G8H9JKMNPQR", message: "Sent" }))
  const r = await pagecogContact(req(), env, { name: "Jo", phone: "0412 345 678", message: "Hello", website: "" })
  expect(r).toEqual({ ok: true, id: "01JA2B3C4D5E6F7G8H9JKMNPQR", message: "Sent" })
  expect(JSON.parse(calls[0].init.body as string).phone).toBe("0412 345 678")
  const bad = await pagecogContact(req(), env, { name: "Jo", message: "Hello" })
  expect(bad).toMatchObject({ ok: false, code: "invalid" })
})

test("a 4xx with a code and message passes through", async () => {
  mock(() => json({ ok: false, code: "feature_disabled", message: "Off" }, 403))
  expect(await pagecogSubscribe(req(), env, { email: "jo@example.com" })).toEqual({ ok: false, code: "feature_disabled", message: "Off" })
})

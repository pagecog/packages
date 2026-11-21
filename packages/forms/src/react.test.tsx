import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { collectFields, ContactForm, SubscribeForm } from "./react"

/** The full <input ...> tag for a field name (attribute order is not guaranteed). */
const tag = (html: string, name: string) => html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0] ?? ""

const noop = async () => ({ ok: true as const, status: "pending" as const, message: "ok" })

test("subscribe: labelled inputs, honeypot hidden from AT, live region always present", () => {
  const html = renderToStaticMarkup(<SubscribeForm onSubmit={noop} />)
  expect(html).toContain('type="email"')
  expect(html).toContain('type="tel"')
  expect(html).toContain("Email address")
  expect(html).toContain("Email or phone, one is enough.")
  expect(html).toContain('role="status"')
  expect(html).toContain('aria-live="polite"')
  expect(html).toContain('name="hp"')
  expect(html).toContain('aria-hidden="true"')
  expect(html).toContain('tabindex="-1"')
  expect(html).toMatch(/<label for="([^"]+)"[^>]*>Email address<\/label><input id="\1"/)
})

test("subscribe: name required by default, optional on request, hidden with showName=false", () => {
  const req = renderToStaticMarkup(<SubscribeForm onSubmit={noop} />)
  expect(tag(req, "name")).toContain("required")
  expect(req).not.toContain("optional")
  const opt = renderToStaticMarkup(<SubscribeForm onSubmit={noop} nameRequired={false} />)
  expect(opt).toContain("Name (optional)")
  expect(tag(opt, "name")).not.toContain("required")
  expect(renderToStaticMarkup(<SubscribeForm onSubmit={noop} showName={false} />)).not.toContain('name="name"')
})

test("subscribe: email and phone inputs are not individually required", () => {
  const html = renderToStaticMarkup(<SubscribeForm onSubmit={noop} />)
  expect(tag(html, "email")).not.toContain("required")
  expect(tag(html, "phone")).not.toContain("required")
})

test("subscribe: Serbian Cyrillic preset, lang attribute, strings override", () => {
  const html = renderToStaticMarkup(<SubscribeForm onSubmit={noop} locale="sr-Cyrl" strings={{ submit: "Пријави се" }} />)
  expect(html).toContain("Адреса е-поште")
  expect(html).toContain("Пријави се")
  expect(html).toContain('lang="sr-Cyrl"')
})

test("subscribe: name field can be hidden; classNames slots apply", () => {
  const html = renderToStaticMarkup(<SubscribeForm onSubmit={noop} showName={false} classNames={{ button: "btn" }} />)
  expect(html).not.toContain('name="name"')
  expect(html).toContain('class="btn"')
})

test("contact: name, email, phone, message; website only when enabled", () => {
  const off = renderToStaticMarkup(<ContactForm onSubmit={async () => ({ ok: true as const, id: "x", message: "ok" })} />)
  expect(off).toContain('name="message"')
  expect(off).toContain('name="phone"')
  expect(off).not.toContain('name="website"')
  const on = renderToStaticMarkup(<ContactForm website onSubmit={async () => ({ ok: true as const, id: "x", message: "ok" })} />)
  expect(on).toContain('name="website"')
})

test("contact: fields prop and children render; no extra inputs by default", () => {
  const ok = async () => ({ ok: true as const, id: "x", message: "ok" })
  const plain = renderToStaticMarkup(<ContactForm onSubmit={ok} />)
  expect(plain).not.toContain("fields.")
  const html = renderToStaticMarkup(
    <ContactForm onSubmit={ok} fields={{ plan: "pro" }}>
      <input name="fields.domain" />
    </ContactForm>,
  )
  expect(html).toContain('name="fields.domain"')
})

test("collectFields: static only, inputs override, repeats become arrays, blanks dropped", () => {
  expect(collectFields(new FormData())).toBeUndefined()
  expect(collectFields(new FormData(), {})).toBeUndefined()
  expect(collectFields(new FormData(), { plan: "pro" })).toEqual({ plan: "pro" })
  const fd = new FormData()
  fd.append("name", "ignored")
  fd.append("fields.domain", "a.example")
  fd.append("fields.plan", "team")
  fd.append("fields.needs", "site")
  fd.append("fields.needs", "seo")
  fd.append("fields.empty", "  ")
  expect(collectFields(fd, { plan: "pro", empty: "x", keep: 1 })).toEqual({ plan: "team", domain: "a.example", needs: ["site", "seo"], keep: 1 })
})

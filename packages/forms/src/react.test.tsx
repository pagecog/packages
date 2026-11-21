import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { collectFields, ContactForm, SubscribeForm, splitContact } from "./react"

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

test("splitContact: an @ is the email, anything else the phone, blank is neither", () => {
  expect(splitContact("  a@b.co ")).toEqual({ email: "a@b.co" })
  expect(splitContact("0412 345 678")).toEqual({ phone: "0412 345 678" })
  expect(splitContact("   ")).toEqual({})
})

test("subscribe: contactField=single renders one Email or phone input, no email/phone inputs", () => {
  const html = renderToStaticMarkup(<SubscribeForm onSubmit={noop} contactField="single" />)
  expect(html).toContain("Email or phone</label>")
  expect(tag(html, "contact")).toContain('type="text"')
  expect(tag(html, "contact")).toContain('autoComplete="email tel"')
  expect(html).not.toContain('name="email"')
  expect(html).not.toContain('name="phone"')
  expect(html).not.toContain("one is enough")
  expect(html).toMatch(/<label for="([^"]+)"[^>]*>Email or phone<\/label><input id="\1"/)
  const sr = renderToStaticMarkup(<SubscribeForm onSubmit={noop} contactField="single" locale="sr" />)
  expect(sr).toContain("Е-пошта или телефон</label>")
})

test("subscribe: placeholders, idle note, row and fields slots, aria-busy hook", () => {
  const html = renderToStaticMarkup(
    <SubscribeForm
      onSubmit={noop}
      contactField="single"
      errorDisplay="status"
      strings={{ namePlaceholder: "Your name", contactPlaceholder: "you@email.com", idleNote: "No spam.", submit: "Join the List" }}
      classNames={{ row: "r", fields: "f", status: "note", input: "in", label: "lb" }}
    />,
  )
  expect(tag(html, "name")).toContain('placeholder="Your name"')
  expect(tag(html, "contact")).toContain('placeholder="you@email.com"')
  expect(html).toContain('class="r"')
  expect(html).toContain('class="f"')
  expect(html).toContain("Join the List")
  // The idle note is the live region's text and both inputs point at it.
  expect(html).toMatch(/<div id="([^"]+)" role="status"[^>]*class="note"[^>]*data-state="idle">No spam\.<\/div>/)
  const id = html.match(/<div id="([^"]+)" role="status"/)?.[1] ?? "none"
  expect(tag(html, "name")).toContain(`aria-describedby="${id}"`)
  expect(tag(html, "contact")).toContain(`aria-describedby="${id}"`)
  // Defaults keep the plain hooks.
  expect(renderToStaticMarkup(<SubscribeForm onSubmit={noop} />)).toContain('class="pcf-row"')
})

test("subscribe: default split form has no status id and no idle text", () => {
  const html = renderToStaticMarkup(<SubscribeForm onSubmit={noop} />)
  expect(html).not.toMatch(/<div id="[^"]+" role="status"/)
  expect(html).toMatch(/role="status"[^>]*data-state="idle"><\/div>/)
})

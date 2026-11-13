import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { ContactForm, SubscribeForm } from "./react"

const noop = async () => ({ ok: true as const, status: "pending" as const, message: "ok" })

test("subscribe: labelled inputs, honeypot hidden from AT, live region always present", () => {
  const html = renderToStaticMarkup(<SubscribeForm onSubmit={noop} />)
  expect(html).toContain('type="email"')
  expect(html).toContain("Email address")
  expect(html).toContain('role="status"')
  expect(html).toContain('aria-live="polite"')
  expect(html).toContain('name="hp"')
  expect(html).toContain('aria-hidden="true"')
  expect(html).toContain('tabindex="-1"')
  expect(html).toMatch(/<label for="([^"]+)"[^>]*>Email address<\/label><input id="\1"/)
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

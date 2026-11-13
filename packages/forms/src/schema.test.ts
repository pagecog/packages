import { expect, test } from "bun:test"
import { contactSchema, fieldErrors, message, normaliseLocale, subscribeSchema } from "./schema"

test("normaliseLocale", () => {
  expect(normaliseLocale("sr-Cyrl")).toBe("sr")
  expect(normaliseLocale("en-AU")).toBe("en")
  expect(normaliseLocale("fr")).toBeUndefined()
  expect(normaliseLocale(5)).toBeUndefined()
})

test("subscribe: lowercases, trims, blank name is absent", () => {
  const r = subscribeSchema.parse({ email: "  Jo@Example.COM ", name: "  ", source: "footer", locale: "sr-Cyrl", t: 4000 })
  expect(r.email).toBe("jo@example.com")
  expect(r.name).toBeUndefined()
  expect(r.locale).toBe("sr")
})

test("subscribe: rejects bad and missing email", () => {
  expect(subscribeSchema.safeParse({ email: "nope" }).success).toBe(false)
  expect(subscribeSchema.safeParse({ email: "" }).success).toBe(false)
  expect(subscribeSchema.safeParse({}).success).toBe(false)
  expect(subscribeSchema.safeParse({ email: "a b@example.com" }).success).toBe(false)
})

test("contact: name + (email or phone) + message", () => {
  expect(contactSchema.safeParse({ name: "Jo", email: "jo@example.com", message: "Hi" }).success).toBe(true)
  expect(contactSchema.safeParse({ name: "Jo", phone: "0412 345 678", message: "Hi" }).success).toBe(true)
  expect(contactSchema.safeParse({ name: "Jo", message: "Hi" }).success).toBe(false)
  expect(contactSchema.safeParse({ name: "Jo", email: "jo@example.com" }).success).toBe(false)
  expect(contactSchema.safeParse({ name: "J", email: "jo@example.com", message: "Hi" }).success).toBe(false)
  expect(contactSchema.safeParse({ name: "Jo", phone: "12", message: "Hi" }).success).toBe(false)
})

test("contact: unknown keys are stripped, not rejected", () => {
  const r = contactSchema.parse({ name: "Jo", email: "jo@example.com", message: "Hi", budget: "10k" })
  expect("budget" in r).toBe(false)
})

test("fieldErrors are localised", () => {
  const r = contactSchema.safeParse({ name: "Jo", message: "Hi" })
  if (r.success) throw new Error("expected failure")
  expect(fieldErrors(r.error, "sr").email).toBe(message("sr", "contact_required"))
  expect(fieldErrors(r.error).email).toBe(message("en", "contact_required"))
})

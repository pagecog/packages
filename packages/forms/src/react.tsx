/**
 * Headless-ish form components. Semantic markup, real labels, aria-live status, honeypot and minimum fill
 * time built in. No CSS framework: style with the className slots, or import "@pagecog/forms/styles.css"
 * and set --pc-form-* custom properties.
 *
 *   <SubscribeForm locale="sr" onSubmit={(input) => subscribeFn({ data: input })} />
 *
 * `onSubmit` is the site's own server function (which calls pagecogSubscribe / pagecogContact). It must
 * return the FormResult; a thrown error is shown as the generic error message.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react"
import {
  contactSchema,
  fieldErrors,
  message,
  normaliseLocale,
  subscribeFormSchema,
  subscribeSchema,
  type ContactFields,
  type ContactInput,
  type ContactResult,
  type FieldErrors,
  type Locale,
  type SubscribeInput,
  type SubscribeResult,
} from "./schema"

export type Slots =
  | "form"
  | "row"
  | "fields"
  | "field"
  | "label"
  | "input"
  | "textarea"
  | "hint"
  | "error"
  | "button"
  | "status"
  | "success"
export type ClassNames = Partial<Record<Slots, string>>

export type SubscribeStrings = {
  emailLabel: string
  phoneLabel: string
  contactHint: string
  /** Label of the single field (`contactField="single"`). */
  contactLabel: string
  /** Message under the single field when it is empty. Empty uses the schema message. */
  contactRequired: string
  /** Placeholders. Empty means none. */
  namePlaceholder: string
  contactPlaceholder: string
  /** Text shown in the status line while idle (for example "No spam."). Empty means nothing. */
  idleNote: string
  nameLabel: string
  optional: string
  submit: string
  submitting: string
}
export type ContactStrings = {
  nameLabel: string
  emailLabel: string
  phoneLabel: string
  contactHint: string
  messageLabel: string
  websiteLabel: string
  optional: string
  submit: string
  submitting: string
}

export const subscribeStrings: Record<Locale, SubscribeStrings> = {
  en: {
    emailLabel: "Email address",
    phoneLabel: "Phone",
    contactHint: "Email or phone, one is enough.",
    contactLabel: "Email or phone",
    contactRequired: "",
    namePlaceholder: "",
    contactPlaceholder: "",
    idleNote: "",
    nameLabel: "Name",
    optional: "optional",
    submit: "Subscribe",
    submitting: "Sending…",
  },
  sr: {
    emailLabel: "Адреса е-поште",
    phoneLabel: "Телефон",
    contactHint: "Е-пошта или телефон, довољно је једно.",
    contactLabel: "Е-пошта или телефон",
    contactRequired: "",
    namePlaceholder: "",
    contactPlaceholder: "",
    idleNote: "",
    nameLabel: "Име",
    optional: "необавезно",
    submit: "Претплати се",
    submitting: "Слање…",
  },
}
export const contactStrings: Record<Locale, ContactStrings> = {
  en: {
    nameLabel: "Name",
    emailLabel: "Email",
    phoneLabel: "Phone",
    contactHint: "Email or phone, one is enough.",
    messageLabel: "Message",
    websiteLabel: "Website",
    optional: "optional",
    submit: "Send message",
    submitting: "Sending…",
  },
  sr: {
    nameLabel: "Име",
    emailLabel: "Е-пошта",
    phoneLabel: "Телефон",
    contactHint: "Е-пошта или телефон, довољно је једно.",
    messageLabel: "Порука",
    websiteLabel: "Веб-сајт",
    optional: "необавезно",
    submit: "Пошаљи поруку",
    submitting: "Слање…",
  },
}

const cx = (...c: (string | undefined)[]) => c.filter(Boolean).join(" ")
const DEFAULTS: Required<ClassNames> = {
  form: "pcf-form",
  row: "pcf-row",
  fields: "pcf-fields",
  field: "pcf-field",
  label: "pcf-label",
  input: "pcf-input",
  textarea: "pcf-input pcf-textarea",
  hint: "pcf-hint",
  error: "pcf-error",
  button: "pcf-button",
  status: "pcf-status",
  success: "pcf-success",
}
const hpStyle = { position: "absolute", left: "-10000px", width: "1px", height: "1px", overflow: "hidden" } as const

type Phase = { kind: "idle" } | { kind: "sending" } | { kind: "ok"; message: string } | { kind: "error"; message: string }

/** Shared state machine: validation, honeypot, fill time, submit, status. */
function useFormState<I extends Record<string, unknown>, R extends { ok: boolean; message: string; fields?: FieldErrors }>(
  locale: Locale,
  validate: (i: I) => FieldErrors | null,
  onSubmit: (i: I) => Promise<R>,
  opts: { statusErrors?: boolean; firstError?: (e: FieldErrors) => string | undefined; onSuccess?: (i: I, r: R) => void } = {},
) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const [errors, setErrors] = useState<FieldErrors>({})
  const mounted = useRef<number>(0)
  useEffect(() => {
    mounted.current = Date.now()
  }, [])
  const submit = async (e: FormEvent<HTMLFormElement>, extra: (fd: FormData) => I) => {
    e.preventDefault()
    if (phase.kind === "sending") return
    const fd = new FormData(e.currentTarget)
    const input = { ...extra(fd), hp: String(fd.get("hp") ?? ""), t: mounted.current ? Date.now() - mounted.current : undefined } as I
    const bad = validate(input)
    if (bad) {
      setErrors(bad)
      const first = opts.statusErrors ? (opts.firstError?.(bad) ?? Object.values(bad)[0]) : undefined
      setPhase(first ? { kind: "error", message: first } : { kind: "idle" })
      return
    }
    setErrors({})
    setPhase({ kind: "sending" })
    try {
      const r = await onSubmit(input)
      if (r.ok) {
        setPhase({ kind: "ok", message: r.message })
        try {
          opts.onSuccess?.(input, r)
        } catch {
          // A failing site callback must not turn a stored signup into an error message.
        }
      } else {
        setErrors(r.fields ?? {})
        setPhase({ kind: "error", message: r.message })
      }
    } catch {
      setPhase({ kind: "error", message: message(locale, "error") })
    }
  }
  return { phase, errors, submit }
}

function Field(p: {
  id: string
  label: string
  hint?: string
  error?: string
  /** Mark the field invalid but render the message elsewhere (the status line). */
  hideError?: boolean
  /** Extra id for aria-describedby (the status line). */
  describedBy?: string
  cn: Required<ClassNames>
  children: (a: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined }) => ReactNode
}) {
  const hintId = p.hint ? `${p.id}-hint` : undefined
  const errId = p.error && !p.hideError ? `${p.id}-error` : undefined
  const describedBy = [hintId, errId, p.describedBy].filter(Boolean).join(" ") || undefined
  return (
    <div className={p.cn.field}>
      <label htmlFor={p.id} className={p.cn.label}>
        {p.label}
      </label>
      {p.children({ id: p.id, "aria-invalid": Boolean(p.error), "aria-describedby": describedBy })}
      {p.hint ? (
        <p id={hintId} className={p.cn.hint}>
          {p.hint}
        </p>
      ) : null}
      {errId ? (
        <p id={errId} className={p.cn.error}>
          {p.error}
        </p>
      ) : null}
    </div>
  )
}

function Honeypot({ id }: { id: string }) {
  return (
    <div aria-hidden="true" style={hpStyle}>
      <label htmlFor={id}>Leave this field empty</label>
      <input id={id} name="hp" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
    </div>
  )
}

function Status({ phase, cn, id, idle }: { phase: Phase; cn: Required<ClassNames>; id?: string; idle?: string }) {
  // The live region is always mounted so assistive tech announces later changes.
  const text = phase.kind === "ok" || phase.kind === "error" ? phase.message : (idle ?? "")
  return (
    <div id={id} role="status" aria-live="polite" className={cx(cn.status, phase.kind === "ok" ? cn.success : undefined)} data-state={phase.kind}>
      {text}
    </div>
  )
}

/** Prefix for extra inputs: `<input name="fields.domain">` becomes `fields.domain`. Repeated names make a string[]. */
export const FIELD_INPUT_PREFIX = "fields."

/**
 * Merges static `fields` with extra inputs named `fields.<key>`. Inputs win. Blank strings are dropped.
 * Returns undefined when nothing remains, so a form without extras sends the same payload as before.
 */
export function collectFields(fd: FormData, base?: ContactFields): ContactFields | undefined {
  const out: ContactFields = { ...base }
  const seen = new Set<string>()
  const names: string[] = []
  fd.forEach((_, name) => {
    if (name.startsWith(FIELD_INPUT_PREFIX) && !seen.has(name)) {
      seen.add(name)
      names.push(name)
    }
  })
  for (const name of names) {
    const key = name.slice(FIELD_INPUT_PREFIX.length)
    const vals = fd.getAll(name).filter((v): v is string => typeof v === "string" && v.trim() !== "")
    if (vals.length === 0) delete out[key]
    else out[key] = vals.length === 1 ? vals[0] : vals
  }
  return Object.keys(out).length ? out : undefined
}

/**
 * The single "Email or phone" field: a value containing "@" is an email, anything else is a phone number.
 * Blank gives neither key, so the schema answers `contact_required`.
 */
export function splitContact(value: string): { email?: string; phone?: string } {
  const v = value.trim()
  if (!v) return {}
  return v.includes("@") ? { email: v } : { phone: v }
}

type CommonProps<I, R> = {
  onSubmit: (input: I) => Promise<R>
  /** "en" (default) or "sr" (Serbian, Cyrillic). */
  locale?: Locale | string
  className?: string
  classNames?: ClassNames
  /** The page path the form is on; the server kit falls back to the Referer. */
  page?: string
}

export type SubscribeFormProps = CommonProps<SubscribeInput, SubscribeResult> & {
  /** Where on the site this form sits ("footer", "home"). Max 40 characters. */
  source?: string
  /** Override any label; unset keys use the locale preset. */
  strings?: Partial<SubscribeStrings>
  /**
   * Show the name field (default true). It is required unless `nameRequired` is false. Hiding it sends no name,
   * which the API rejects for new subscribers, so keep it unless the site's API config says otherwise.
   */
  showName?: boolean
  /** Require a name (default true, matching the API). Set false for an optional name field. */
  nameRequired?: boolean
  /**
   * "split" (default) shows an email input and a phone input. "single" shows one "Email or phone" input
   * (`name="contact"`, `strings.contactLabel`): a value with "@" is sent as the email, anything else as the phone.
   */
  contactField?: "split" | "single"
  /**
   * Where validation messages go. "field" (default) puts each under its input. "status" shows the first one in the
   * status line (the inputs are still marked `aria-invalid`), for compact inline layouts.
   */
  errorDisplay?: "field" | "status"
  /** Called once after a successful submit (analytics, remember the visitor joined). Errors it throws are ignored. */
  onSuccess?: (input: SubscribeInput, result: SubscribeResult) => void
  /**
   * Replaces the form after a successful submit, given the API message. The status line stays mounted (it is the
   * live region); give `classNames.success` a value such as "sr-only" to avoid showing the message twice.
   */
  renderSuccess?: (message: string) => ReactNode
}

export function SubscribeForm(props: SubscribeFormProps) {
  const locale = normaliseLocale(props.locale) ?? "en"
  const s = { ...subscribeStrings[locale], ...props.strings }
  const cn = { ...DEFAULTS, ...props.classNames }
  const uid = useId()
  const nameRequired = props.nameRequired !== false && props.showName !== false
  const single = props.contactField === "single"
  const inStatus = props.errorDisplay === "status"
  const statusId = inStatus || s.idleNote ? `${uid}-status` : undefined
  const f = useFormState<SubscribeInput & Record<string, unknown>, SubscribeResult>(
    locale,
    (i) => {
      const r = (nameRequired ? subscribeFormSchema : subscribeSchema).safeParse(i)
      if (r.success) return null
      const errs = fieldErrors(r.error, locale)
      // Single field: one place for either problem, with the site's own wording when the field is empty.
      if (single && (errs.email || errs.phone)) {
        const empty = !i.email && !i.phone
        errs.email = empty && s.contactRequired ? s.contactRequired : (errs.email ?? errs.phone)
        delete errs.phone
      }
      return errs
    },
    (i) => props.onSubmit(i),
    {
      statusErrors: inStatus,
      // Name first, then the contact problem, matching the field order.
      firstError: (e) => e.name ?? e.email ?? e.phone,
      onSuccess: props.onSuccess,
    },
  )
  const done = f.phase.kind === "ok"
  const showErr = !inStatus
  return (
    <form
      className={cx(cn.form, props.className)}
      noValidate
      lang={locale === "sr" ? "sr-Cyrl" : "en"}
      onSubmit={(e) =>
        f.submit(e, (fd) => ({
          ...(single
            ? splitContact(String(fd.get("contact") ?? ""))
            : { email: String(fd.get("email") ?? ""), phone: String(fd.get("phone") ?? "") }),
          name: String(fd.get("name") ?? ""),
          source: props.source,
          page: props.page,
          locale,
        }))
      }
    >
      {done && props.renderSuccess ? (
        props.renderSuccess(f.phase.kind === "ok" ? f.phase.message : "")
      ) : done ? null : (
        <div className={cn.row}>
          <div className={cn.fields}>
            {props.showName === false ? null : (
              <Field
                id={`${uid}-name`}
                label={nameRequired ? s.nameLabel : `${s.nameLabel} (${s.optional})`}
                error={f.errors.name}
                hideError={!showErr}
                describedBy={statusId}
                cn={cn}
              >
                {(a) => (
                  <input
                    {...a}
                    name="name"
                    type="text"
                    autoComplete="name"
                    required={nameRequired}
                    maxLength={120}
                    placeholder={s.namePlaceholder || undefined}
                    className={cn.input}
                  />
                )}
              </Field>
            )}
            {single ? (
              <Field
                id={`${uid}-contact`}
                label={s.contactLabel}
                error={f.errors.email}
                hideError={!showErr}
                describedBy={statusId}
                cn={cn}
              >
                {(a) => (
                  <input
                    {...a}
                    name="contact"
                    type="text"
                    autoComplete="email tel"
                    inputMode="email"
                    spellCheck={false}
                    maxLength={254}
                    placeholder={s.contactPlaceholder || undefined}
                    className={cn.input}
                  />
                )}
              </Field>
            ) : (
              <>
                <Field
                  id={`${uid}-email`}
                  label={s.emailLabel}
                  hint={s.contactHint}
                  error={f.errors.email}
                  hideError={!showErr}
                  describedBy={statusId}
                  cn={cn}
                >
                  {(a) => (
                    <input {...a} name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} className={cn.input} />
                  )}
                </Field>
                <Field
                  id={`${uid}-phone`}
                  label={s.phoneLabel}
                  error={f.errors.phone}
                  hideError={!showErr}
                  describedBy={statusId}
                  cn={cn}
                >
                  {(a) => <input {...a} name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={40} className={cn.input} />}
                </Field>
              </>
            )}
          </div>
          <Honeypot id={`${uid}-hp`} />
          <button
            type="submit"
            className={cn.button}
            disabled={f.phase.kind === "sending"}
            aria-busy={f.phase.kind === "sending" || undefined}
          >
            {f.phase.kind === "sending" ? s.submitting : s.submit}
          </button>
        </div>
      )}
      <Status phase={f.phase} cn={cn} id={statusId} idle={s.idleNote} />
    </form>
  )
}

export type ContactFormProps = CommonProps<ContactInput, ContactResult> & {
  strings?: Partial<ContactStrings>
  /** Show the optional website field. Only where the tenant has it enabled in its form config. */
  website?: boolean
  /**
   * Extra structured info sent with the lead, merged with any inputs you pass as `children` named
   * `name="fields.<key>"`. Optional. Client lead forms stay at three inputs unless the site owner asks otherwise.
   */
  fields?: ContactFields
  /** Extra inputs rendered after the message field, e.g. `<input name="fields.domain" />`. */
  children?: ReactNode
}

export function ContactForm(props: ContactFormProps) {
  const locale = normaliseLocale(props.locale) ?? "en"
  const s = { ...contactStrings[locale], ...props.strings }
  const cn = { ...DEFAULTS, ...props.classNames }
  const uid = useId()
  const f = useFormState<ContactInput & Record<string, unknown>, ContactResult>(
    locale,
    (i) => {
      const r = contactSchema.safeParse(i)
      return r.success ? null : fieldErrors(r.error, locale)
    },
    (i) => props.onSubmit(i),
  )
  const done = f.phase.kind === "ok"
  return (
    <form
      className={cx(cn.form, props.className)}
      noValidate
      lang={locale === "sr" ? "sr-Cyrl" : "en"}
      onSubmit={(e) =>
        f.submit(e, (fd) => ({
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          message: String(fd.get("message") ?? ""),
          website: props.website ? String(fd.get("website") ?? "") : undefined,
          fields: collectFields(fd, props.fields),
          page: props.page,
          locale,
        }))
      }
    >
      {done ? null : (
        <>
          <Field id={`${uid}-name`} label={s.nameLabel} error={f.errors.name} cn={cn}>
            {(a) => <input {...a} name="name" type="text" autoComplete="name" required maxLength={120} className={cn.input} />}
          </Field>
          <Field id={`${uid}-email`} label={s.emailLabel} hint={s.contactHint} error={f.errors.email} cn={cn}>
            {(a) => <input {...a} name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} className={cn.input} />}
          </Field>
          <Field id={`${uid}-phone`} label={s.phoneLabel} error={f.errors.phone} cn={cn}>
            {(a) => <input {...a} name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={40} className={cn.input} />}
          </Field>
          <Field id={`${uid}-message`} label={s.messageLabel} error={f.errors.message} cn={cn}>
            {(a) => <textarea {...a} name="message" required rows={5} maxLength={8000} className={cn.textarea} />}
          </Field>
          {props.website ? (
            <Field id={`${uid}-website`} label={`${s.websiteLabel} (${s.optional})`} error={f.errors.website} cn={cn}>
              {(a) => <input {...a} name="website" type="text" inputMode="url" autoComplete="url" maxLength={200} className={cn.input} />}
            </Field>
          ) : null}
          {props.children}
          {f.errors.fields ? <p className={cn.error}>{f.errors.fields}</p> : null}
          <Honeypot id={`${uid}-hp`} />
          <button type="submit" className={cn.button} disabled={f.phase.kind === "sending"}>
            {f.phase.kind === "sending" ? s.submitting : s.submit}
          </button>
        </>
      )}
      <Status phase={f.phase} cn={cn} />
    </form>
  )
}

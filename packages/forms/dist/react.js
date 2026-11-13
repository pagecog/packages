import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { useEffect, useId, useRef, useState } from "react";
import { contactSchema, fieldErrors, message, normaliseLocale, subscribeSchema, } from "./schema";
export const subscribeStrings = {
    en: { emailLabel: "Email address", nameLabel: "Name", optional: "optional", submit: "Subscribe", submitting: "Sending…" },
    sr: { emailLabel: "Адреса е-поште", nameLabel: "Име", optional: "необавезно", submit: "Претплати се", submitting: "Слање…" },
};
export const contactStrings = {
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
};
const cx = (...c) => c.filter(Boolean).join(" ");
const DEFAULTS = {
    form: "pcf-form",
    field: "pcf-field",
    label: "pcf-label",
    input: "pcf-input",
    textarea: "pcf-input pcf-textarea",
    hint: "pcf-hint",
    error: "pcf-error",
    button: "pcf-button",
    status: "pcf-status",
    success: "pcf-success",
};
const hpStyle = { position: "absolute", left: "-10000px", width: "1px", height: "1px", overflow: "hidden" };
/** Shared state machine: validation, honeypot, fill time, submit, status. */
function useFormState(locale, validate, onSubmit) {
    const [phase, setPhase] = useState({ kind: "idle" });
    const [errors, setErrors] = useState({});
    const mounted = useRef(0);
    useEffect(() => {
        mounted.current = Date.now();
    }, []);
    const submit = async (e, extra) => {
        e.preventDefault();
        if (phase.kind === "sending")
            return;
        const fd = new FormData(e.currentTarget);
        const input = { ...extra(fd), hp: String(fd.get("hp") ?? ""), t: mounted.current ? Date.now() - mounted.current : undefined };
        const bad = validate(input);
        if (bad) {
            setErrors(bad);
            setPhase({ kind: "idle" });
            return;
        }
        setErrors({});
        setPhase({ kind: "sending" });
        try {
            const r = await onSubmit(input);
            if (r.ok)
                setPhase({ kind: "ok", message: r.message });
            else {
                setErrors(r.fields ?? {});
                setPhase({ kind: "error", message: r.message });
            }
        }
        catch {
            setPhase({ kind: "error", message: message(locale, "error") });
        }
    };
    return { phase, errors, submit };
}
function Field(p) {
    const hintId = p.hint ? `${p.id}-hint` : undefined;
    const errId = p.error ? `${p.id}-error` : undefined;
    const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
    return (_jsxs("div", { className: p.cn.field, children: [_jsx("label", { htmlFor: p.id, className: p.cn.label, children: p.label }), p.children({ id: p.id, "aria-invalid": Boolean(p.error), "aria-describedby": describedBy }), p.hint ? (_jsx("p", { id: hintId, className: p.cn.hint, children: p.hint })) : null, p.error ? (_jsx("p", { id: errId, className: p.cn.error, children: p.error })) : null] }));
}
function Honeypot({ id }) {
    return (_jsxs("div", { "aria-hidden": "true", style: hpStyle, children: [_jsx("label", { htmlFor: id, children: "Leave this field empty" }), _jsx("input", { id: id, name: "hp", type: "text", tabIndex: -1, autoComplete: "off", defaultValue: "" })] }));
}
function Status({ phase, cn }) {
    // The live region is always mounted so assistive tech announces later changes.
    const text = phase.kind === "ok" || phase.kind === "error" ? phase.message : "";
    return (_jsx("div", { role: "status", "aria-live": "polite", className: cx(cn.status, phase.kind === "ok" ? cn.success : undefined), "data-state": phase.kind, children: text }));
}
export function SubscribeForm(props) {
    const locale = normaliseLocale(props.locale) ?? "en";
    const s = { ...subscribeStrings[locale], ...props.strings };
    const cn = { ...DEFAULTS, ...props.classNames };
    const uid = useId();
    const f = useFormState(locale, (i) => {
        const r = subscribeSchema.safeParse(i);
        return r.success ? null : fieldErrors(r.error, locale);
    }, (i) => props.onSubmit(i));
    const done = f.phase.kind === "ok";
    return (_jsxs("form", { className: cx(cn.form, props.className), noValidate: true, lang: locale === "sr" ? "sr-Cyrl" : "en", onSubmit: (e) => f.submit(e, (fd) => ({
            email: String(fd.get("email") ?? ""),
            name: String(fd.get("name") ?? ""),
            source: props.source,
            page: props.page,
            locale,
        })), children: [done ? null : (_jsxs(_Fragment, { children: [props.showName === false ? null : (_jsx(Field, { id: `${uid}-name`, label: `${s.nameLabel} (${s.optional})`, error: f.errors.name, cn: cn, children: (a) => _jsx("input", { ...a, name: "name", type: "text", autoComplete: "name", maxLength: 120, className: cn.input }) })), _jsx(Field, { id: `${uid}-email`, label: s.emailLabel, error: f.errors.email, cn: cn, children: (a) => _jsx("input", { ...a, name: "email", type: "email", autoComplete: "email", inputMode: "email", required: true, maxLength: 254, className: cn.input }) }), _jsx(Honeypot, { id: `${uid}-hp` }), _jsx("button", { type: "submit", className: cn.button, disabled: f.phase.kind === "sending", children: f.phase.kind === "sending" ? s.submitting : s.submit })] })), _jsx(Status, { phase: f.phase, cn: cn })] }));
}
export function ContactForm(props) {
    const locale = normaliseLocale(props.locale) ?? "en";
    const s = { ...contactStrings[locale], ...props.strings };
    const cn = { ...DEFAULTS, ...props.classNames };
    const uid = useId();
    const f = useFormState(locale, (i) => {
        const r = contactSchema.safeParse(i);
        return r.success ? null : fieldErrors(r.error, locale);
    }, (i) => props.onSubmit(i));
    const done = f.phase.kind === "ok";
    return (_jsxs("form", { className: cx(cn.form, props.className), noValidate: true, lang: locale === "sr" ? "sr-Cyrl" : "en", onSubmit: (e) => f.submit(e, (fd) => ({
            name: String(fd.get("name") ?? ""),
            email: String(fd.get("email") ?? ""),
            phone: String(fd.get("phone") ?? ""),
            message: String(fd.get("message") ?? ""),
            website: props.website ? String(fd.get("website") ?? "") : undefined,
            page: props.page,
            locale,
        })), children: [done ? null : (_jsxs(_Fragment, { children: [_jsx(Field, { id: `${uid}-name`, label: s.nameLabel, error: f.errors.name, cn: cn, children: (a) => _jsx("input", { ...a, name: "name", type: "text", autoComplete: "name", required: true, maxLength: 120, className: cn.input }) }), _jsx(Field, { id: `${uid}-email`, label: s.emailLabel, hint: s.contactHint, error: f.errors.email, cn: cn, children: (a) => _jsx("input", { ...a, name: "email", type: "email", autoComplete: "email", inputMode: "email", maxLength: 254, className: cn.input }) }), _jsx(Field, { id: `${uid}-phone`, label: s.phoneLabel, error: f.errors.phone, cn: cn, children: (a) => _jsx("input", { ...a, name: "phone", type: "tel", autoComplete: "tel", inputMode: "tel", maxLength: 40, className: cn.input }) }), _jsx(Field, { id: `${uid}-message`, label: s.messageLabel, error: f.errors.message, cn: cn, children: (a) => _jsx("textarea", { ...a, name: "message", required: true, rows: 5, maxLength: 8000, className: cn.textarea }) }), props.website ? (_jsx(Field, { id: `${uid}-website`, label: `${s.websiteLabel} (${s.optional})`, error: f.errors.website, cn: cn, children: (a) => _jsx("input", { ...a, name: "website", type: "text", inputMode: "url", autoComplete: "url", maxLength: 200, className: cn.input }) })) : null, _jsx(Honeypot, { id: `${uid}-hp` }), _jsx("button", { type: "submit", className: cn.button, disabled: f.phase.kind === "sending", children: f.phase.kind === "sending" ? s.submitting : s.submit })] })), _jsx(Status, { phase: f.phase, cn: cn })] }));
}

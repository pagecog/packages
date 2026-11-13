/**
 * Shared contract between the Pagecog Forms API (api.pagecog.com.au) and the site kit.
 * zod schemas, wire types, localised messages. No I/O, no framework imports.
 */
import { z } from "zod";
export declare const LOCALES: readonly ["en", "sr"];
/** "sr" is Serbian in Cyrillic (sr-Cyrl). */
export type Locale = (typeof LOCALES)[number];
/** Accepts "en", "en-AU", "sr", "sr-Cyrl", "sr_RS"; anything else is undefined. */
export declare function normaliseLocale(v: unknown): Locale | undefined;
export declare const LIMITS: {
    readonly name: 120;
    readonly email: 254;
    readonly phone: 40;
    readonly message: 8000;
    readonly website: 200;
    readonly source: 40;
    readonly page: 200;
};
/** Submissions faster than this after the form rendered are treated as bots (ms). */
export declare const MIN_FILL_MS = 1500;
export declare const subscribeSchema: z.ZodObject<{
    hp: z.ZodOptional<z.ZodString>;
    t: z.ZodOptional<z.ZodNumber>;
    page: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    email: z.ZodPreprocess<z.ZodString, unknown>;
    name: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    source: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    locale: z.ZodPreprocess<z.ZodOptional<z.ZodEnum<{
        en: "en";
        sr: "sr";
    }>>, unknown>;
}, z.core.$strip>;
/** What the browser sends (before validation). */
export type SubscribeInput = {
    email: string;
    name?: string;
    source?: string;
    locale?: string;
    hp?: string;
    t?: number;
    page?: string;
};
export type SubscribeData = z.output<typeof subscribeSchema>;
export declare const contactSchema: z.ZodObject<{
    hp: z.ZodOptional<z.ZodString>;
    t: z.ZodOptional<z.ZodNumber>;
    page: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    name: z.ZodPreprocess<z.ZodString, unknown>;
    email: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    phone: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    message: z.ZodPreprocess<z.ZodString, unknown>;
    website: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    locale: z.ZodPreprocess<z.ZodOptional<z.ZodEnum<{
        en: "en";
        sr: "sr";
    }>>, unknown>;
}, z.core.$strip>;
export type ContactInput = {
    name: string;
    email?: string;
    phone?: string;
    message: string;
    website?: string;
    locale?: string;
    hp?: string;
    t?: number;
    page?: string;
};
export type ContactData = z.output<typeof contactSchema>;
/** What the server kit POSTs: the browser fields plus request context. */
export declare const subscribeWireSchema: z.ZodObject<{
    hp: z.ZodOptional<z.ZodString>;
    t: z.ZodOptional<z.ZodNumber>;
    page: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    email: z.ZodPreprocess<z.ZodString, unknown>;
    name: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    source: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    locale: z.ZodPreprocess<z.ZodOptional<z.ZodEnum<{
        en: "en";
        sr: "sr";
    }>>, unknown>;
    v: z.ZodOptional<z.ZodString>;
    s: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const contactWireSchema: z.ZodObject<{
    hp: z.ZodOptional<z.ZodString>;
    t: z.ZodOptional<z.ZodNumber>;
    page: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    name: z.ZodPreprocess<z.ZodString, unknown>;
    email: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    phone: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    message: z.ZodPreprocess<z.ZodString, unknown>;
    website: z.ZodPreprocess<z.ZodOptional<z.ZodString>, unknown>;
    locale: z.ZodPreprocess<z.ZodOptional<z.ZodEnum<{
        en: "en";
        sr: "sr";
    }>>, unknown>;
    v: z.ZodOptional<z.ZodString>;
    s: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type SubscribeWire = z.output<typeof subscribeWireSchema>;
export type ContactWire = z.output<typeof contactWireSchema>;
export type ErrorCode = "invalid" | "rate_limited" | "feature_disabled" | "unavailable" | "unauthorised" | "email_failed" | "error";
export type FieldErrors = Partial<Record<"email" | "name" | "phone" | "message" | "website", string>>;
export type FormResult<T extends object = object> = ({
    ok: true;
    message: string;
} & T) | {
    ok: false;
    code: ErrorCode;
    message: string;
    fields?: FieldErrors;
};
/** pending = confirmation email sent (double opt-in); subscribed = no confirmation needed. */
export type SubscribeResult = FormResult<{
    status: "pending" | "subscribed";
}>;
export type ContactResult = FormResult<{
    id: string;
}>;
export type MessageKey = "subscribe_pending" | "subscribe_done" | "contact_sent" | "invalid" | "invalid_email" | "name_required" | "contact_required" | "message_required" | "invalid_phone" | "rate_limited" | "feature_disabled" | "unavailable" | "unauthorised" | "email_failed" | "error";
export declare const MESSAGES: Record<Locale, Record<MessageKey, string>>;
export declare const message: (locale: Locale | undefined, key: MessageKey) => string;
/** Maps zod issues to one message key per field. Unknown issue text falls back to "invalid". */
export declare function fieldErrors(error: z.ZodError, locale?: Locale): FieldErrors;

import { type ContactInput, type ContactResult, type Locale, type SubscribeInput, type SubscribeResult } from "./schema";
export type Slots = "form" | "field" | "label" | "input" | "textarea" | "hint" | "error" | "button" | "status" | "success";
export type ClassNames = Partial<Record<Slots, string>>;
export type SubscribeStrings = {
    emailLabel: string;
    nameLabel: string;
    optional: string;
    submit: string;
    submitting: string;
};
export type ContactStrings = {
    nameLabel: string;
    emailLabel: string;
    phoneLabel: string;
    contactHint: string;
    messageLabel: string;
    websiteLabel: string;
    optional: string;
    submit: string;
    submitting: string;
};
export declare const subscribeStrings: Record<Locale, SubscribeStrings>;
export declare const contactStrings: Record<Locale, ContactStrings>;
type CommonProps<I, R> = {
    onSubmit: (input: I) => Promise<R>;
    /** "en" (default) or "sr" (Serbian, Cyrillic). */
    locale?: Locale | string;
    className?: string;
    classNames?: ClassNames;
    /** The page path the form is on; the server kit falls back to the Referer. */
    page?: string;
};
export type SubscribeFormProps = CommonProps<SubscribeInput, SubscribeResult> & {
    /** Where on the site this form sits ("footer", "home"). Max 40 characters. */
    source?: string;
    /** Override any label; unset keys use the locale preset. */
    strings?: Partial<SubscribeStrings>;
    /** Show the optional name field (default true). */
    showName?: boolean;
};
export declare function SubscribeForm(props: SubscribeFormProps): import("react").JSX.Element;
export type ContactFormProps = CommonProps<ContactInput, ContactResult> & {
    strings?: Partial<ContactStrings>;
    /** Show the optional website field. Only where the tenant has it enabled in its form config. */
    website?: boolean;
};
export declare function ContactForm(props: ContactFormProps): import("react").JSX.Element;
export {};

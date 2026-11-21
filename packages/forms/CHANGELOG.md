# Changelog

## 0.3.0

- Subscribers take a name plus an email or a phone, at least one (`contact_required` when neither). Backward compatible: email-only input is still valid, and the wire payload for it is unchanged.
- `subscribeSchema` and `subscribeWireSchema` accept optional `email` and `phone`. New `subscribeFormSchema` is the same with the name required (2 to 120 characters).
- `SubscribeInput` gains `phone`; `email` is now optional. `pagecogSubscribe` returns the first field error as the message and passes a phone-only result through (`status: "subscribed"`).
- `SubscribeForm` styling and layout hooks, for sites with their own look: `contactField="single"` (one "Email or phone" input named `contact`; an "@" means email, else phone; exported `splitContact`), `errorDisplay="status"` (first message in the status line, inputs still `aria-invalid`), `onSuccess`, `renderSuccess`, new `classNames` slots `row` and `fields`, new strings `contactLabel`, `contactRequired`, `namePlaceholder`, `contactPlaceholder` and `idleNote` (text in the status line while idle). The submit button gets `aria-busy` while sending. Defaults are unchanged apart from the two wrapper divs (`pcf-row`, `pcf-fields`).
- `SubscribeForm` shows name (required by default; `nameRequired={false}` makes it optional), email and phone with a "one is enough" hint. New strings `phoneLabel` and `contactHint` (en, sr). No consent screens.

## 0.2.0

- Contact submissions accept optional structured `fields`: up to 12 keys (lowercase `[a-z][a-z0-9_]*`, not `dup_of` or `backfill`), values string (max 200), finite number, boolean or string[] (max 20 items).
- `contactSchema`, `ContactInput`, `LIMITS`, `RESERVED_FIELD_KEYS`, `ContactFields`, `FieldValue` and the `invalid_fields` message (en, sr) added to `/schema`.
- `pagecogContact` validates and forwards `fields`. `ContactForm` takes `fields` and `children` (inputs named `fields.<key>`); `collectFields` exported from `/react`.
- No change when `fields` is absent: same payload, no new required props.

## 0.1.0

- Initial release: schema, server client, React forms (includes the `feature_disabled` error code).

# Changelog

## 0.2.0

- Contact submissions accept optional structured `fields`: up to 12 keys (lowercase `[a-z][a-z0-9_]*`, not `dup_of` or `backfill`), values string (max 200), finite number, boolean or string[] (max 20 items).
- `contactSchema`, `ContactInput`, `LIMITS`, `RESERVED_FIELD_KEYS`, `ContactFields`, `FieldValue` and the `invalid_fields` message (en, sr) added to `/schema`.
- `pagecogContact` validates and forwards `fields`. `ContactForm` takes `fields` and `children` (inputs named `fields.<key>`); `collectFields` exported from `/react`.
- No change when `fields` is absent: same payload, no new required props.

## 0.1.0

- Initial release: schema, server client, React forms (includes the `feature_disabled` error code).

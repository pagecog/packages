# @pagecog/forms

Shared schema, server client and React components for the Pagecog Forms API (`api.pagecog.com`): subscribe (double opt-in) and contact.

Install (see the repo README; tarball from the GitHub release):

```json
"@pagecog/forms": "https://github.com/Pagecog/packages/releases/download/forms%400.2.0/pagecog-forms-0.2.0.tgz"
```

Set `COLLECTOR_KEY` (the site's key) in the server env. `PAGECOG_API_URL` overrides the default `https://api.pagecog.com`.

```ts
// site server function (framework side is yours)
import { pagecogSubscribe } from "@pagecog/forms/server"
const res = await pagecogSubscribe(request, env, input) // never throws; env.COLLECTOR_KEY = the site's collector key
```

```tsx
import { SubscribeForm } from "@pagecog/forms/react"
import "@pagecog/forms/styles.css" // optional; set --pc-form-accent etc.
<SubscribeForm locale="sr" source="footer" onSubmit={(input) => subscribeFn({ data: input })} />
```

- `/schema`: zod schemas, wire types, localised messages (`en`, `sr` = Serbian Cyrillic). The API imports the same file.
- `/server`: `pagecogSubscribe`, `pagecogContact`. POSTs with `x-pc-key`, forwards the platform IP and `pc_v`/`pc_s` cookies, 5 s timeout.
- `/react`: `SubscribeForm`, `ContactForm`. Labels, `aria-live` status, honeypot, minimum fill time, `strings` + `classNames` props.

## Extra fields on a contact

`pagecogContact` and `ContactForm` accept an optional `fields` object, stored with the lead and shown in the dashboard and notification email. Up to 12 keys (lowercase `[a-z][a-z0-9_]*`; `dup_of` and `backfill` are reserved). Values: string (max 200 characters), number, boolean, or string[] (max 20 items). Without `fields` the payload is identical to 0.1.x.

```tsx
<ContactForm fields={{ plan: "growth" }} onSubmit={(input) => contactFn({ data: input })}>
  <label>Domain <input name="fields.domain" /></label>
</ContactForm>
```

Inputs named `fields.<key>` are collected and merged over the static `fields` (blank values dropped, repeated names become a list). Server side, pass `fields` in the input to `pagecogContact`; it is validated with the same schema. Invalid `fields` return code `invalid` with a localised `fields` error.

House rule: client lead forms stay at three inputs (name, phone or email, comment) unless the site owner asks otherwise. Prefer static `fields` for context the site already knows.

Tests: `bun test src/schema.test.ts src/server.test.ts src/react.test.tsx`. Releases: see the root README.

# @pagecog/forms

Shared schema, server client and React components for the Pagecog Forms API (`api.pagecog.com.au`): subscribe (double opt-in) and contact.

Install (pinned by tag, `dist/` is committed so no build runs on install):

```json
"@pagecog/forms": "github:Pagecog/forms#v0.1.0"
```

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

After changing `src/`: `bun run build`, commit `dist/`, tag a NEW version (never move a tag).
Tests: `bun test src/schema.test.ts src/server.test.ts src/react.test.tsx`.

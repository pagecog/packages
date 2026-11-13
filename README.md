# Pagecog packages

Open source packages from [Pagecog](https://pagecog.com), one repo, Bun workspaces.

| Package | What it is |
| --- | --- |
| [`@pagecog/forms`](packages/forms) | Schema, server client and React components for Pagecog Forms (subscribe with double opt-in, contact). |

## Install

Each release is a GitHub release with a tarball, tagged `<package>@<version>` (for example `forms@0.1.0`).
Depend on the tarball URL (encode `@` in the tag as `%40`):

```json
"@pagecog/forms": "https://github.com/Pagecog/packages/releases/download/forms%400.1.0/pagecog-forms-0.1.0.tgz"
```

When a package is also published to npm, `bun add @pagecog/<name>` works as usual.

## Develop

```sh
bun install
bun run build   # all packages
bun run test    # all packages (explicit test files per package)
```

## Release

1. Bump `version` in `packages/<name>/package.json`, commit.
2. Tag `git tag <name>@<version>` and push the tag.
3. The `release` workflow builds, tests, packs `pagecog-<name>-<version>.tgz`, attaches it to a GitHub release, and runs `npm publish --access public` only when the `NPM_TOKEN` secret exists.

Never move or reuse a tag; ship a new version.

## License

MIT

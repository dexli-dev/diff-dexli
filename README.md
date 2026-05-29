# diff.dexli.dev

Paste two pieces of text, see what changed, share the comparison via URL.
Part of the [dexli.dev](https://dexli.dev) anti-IDE tiny-tools family.

Family of tools:
- [webhook.dexli.dev](https://webhook.dexli.dev) — temporary webhook inbox
- [cron.dexli.dev](https://cron.dexli.dev) — cron expression parser + preview
- [regex.dexli.dev](https://regex.dexli.dev) — live regex tester
- [dexli.dev](https://dexli.dev) — apex hub

## Develop

```sh
git clone --recurse-submodules https://github.com/dexli-dev/diff-dexli.git
cd diff-dexli
npm install
npm run dev
```

If you forgot `--recurse-submodules`, run from the repo root:

```sh
git submodule update --init --recursive
```

## Build + run with Docker

```sh
docker build -t diff-dexli .
docker run --rm -p 3000:3000 diff-dexli
```

The Dockerfile fetches the `@dexli/family` library at the pinned SHA in
a dedicated stage, so the build doesn't need the submodule to be
checked out on the host.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Bind port for the Node server (adapter-node). |
| `HOST` | `0.0.0.0` | Bind interface. |
| `PUBLIC_BASE_URL` | _(unset)_ | Canonical origin used for absolute share URLs. When unset, derives from request origin. Must be origin-only (no path). PROD: `PUBLIC_BASE_URL=https://diff.dexli.dev`. |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for commit convention,
attribution mechanics, and submodule discipline.

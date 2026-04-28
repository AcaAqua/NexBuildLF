# Netlify Deployment Note - NexBuildLF

## Status

Netlify deployment succeeded.

## Final Working Configuration

- Base directory: empty
- Package directory: empty
- Build command: `npm run build`
- Publish directory: `.next`
- Functions directory: empty
- Runtime: Next.js Runtime

## Final Architecture

The project currently uses a root-level Next.js structure.

```txt
NexBuildLF/
├─ src/
├─ public/
├─ package.json
├─ next.config.ts
├─ tsconfig.json
├─ sdk/
├─ docs/
└─ legacy-php/
```

## Lessons Learned

The original workspace / monorepo structure caused repeated Netlify deploy failures.

Observed failure types:

- `npm error Invalid Version`
- workspace dependency resolution issues
- publish directory mismatch between `.next` and `web/.next`
- Netlify security block due to vulnerable Next.js version

## Current Policy

For stable deployment:

- Keep the production Next.js app at repository root.
- Do not re-enable npm workspaces until deployment behavior is intentionally redesigned.
- Keep `sdk/` excluded from the production build for now.
- Keep Netlify publish directory as `.next`.
- Keep Next.js updated to avoid Netlify security blocks.

## Future Work

- Confirm PWA installation on Android and iOS.
- Decide whether to remove or archive the old `web/` folder.
- Reintroduce SDK packaging only after Web deployment is stable.
- Consider adding a GitHub Action for build verification.

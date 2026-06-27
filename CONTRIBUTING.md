# Contributing to NexBuildLF

Thank you for considering a contribution to NexBuildLF.

NexBuildLF is a field operations app for construction teams. Contributions should keep the core field workflow reliable, portable, and easy to recover.

## Project Priorities

- Keep the app usable on mobile and field devices.
- Preserve CSV/JSON data portability.
- Prefer small, reviewable changes.
- Avoid changes that make one optional feature capable of stopping the whole app.
- Keep secrets, generated outputs, local databases, model files, and local configuration out of commits.

## Before You Start

For small documentation, UI copy, or bug fix changes, opening a pull request directly is fine.

For larger changes, please open an issue first, especially if the work involves:

- Data model changes.
- Authentication or authorization.
- External APIs or paid services.
- Build or deployment behavior.
- Security-sensitive code.
- Large refactors.

## Development Setup

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Pull Request Guidelines

- Explain the purpose of the change.
- List affected files or features.
- Include test or verification results.
- Update relevant documentation when behavior changes.
- Add an entry to `CHANGELOG.md` for user-visible or maintainer-relevant changes.

## Safety Rules

Do not commit:

- `.env` or `.env.*` files.
- API keys, access tokens, private keys, or credentials.
- Generated databases such as `.db`, `.sqlite`, or `.sqlite3`.
- Local build output such as `.next/`, `dist/`, `build/`, `output/`, or `outputs/`.
- Large model files or generated media.
- Personal or customer data.

If a change touches security, authentication, data deletion, migrations, or production configuration, call that out clearly in the PR description.

## Code Style

- Use TypeScript for application code.
- Follow existing component and styling patterns.
- Prefer existing utilities before adding new dependencies.
- Keep optional integrations isolated so failures do not block the main workflow.

## License

By contributing, you agree that your contributions will be licensed under the repository's MIT License.

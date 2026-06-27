# Security Policy

## Supported Versions

NexBuildLF is currently in an early public development phase. Security fixes are applied to the `main` branch unless a separate release branch is announced.

| Version | Supported |
| --- | --- |
| `main` | Yes |
| Older snapshots | No |

## Reporting a Vulnerability

Please do not publish sensitive vulnerability details, credentials, tokens, personal data, or exploit steps in public issues.

For security concerns:

1. Use GitHub's private vulnerability reporting feature if it is enabled for this repository.
2. If private reporting is not available, open a public issue with a minimal non-sensitive summary and ask for a private contact path.

When reporting, include:

- Affected area or file path.
- Expected impact.
- Minimal reproduction steps that do not expose secrets or real user data.
- Suggested mitigation, if known.

## Security Scope

In scope:

- Authentication and authorization logic.
- Data import/export safety.
- Local storage and browser-side data handling.
- Build, release, and dependency configuration.
- Any behavior that could expose user data, secrets, or project files.

Out of scope:

- Attacks requiring direct access to a user's unlocked device.
- Vulnerabilities in unsupported legacy deployments.
- Denial-of-service reports without a practical user impact.

## Handling Principles

- Fail soft: optional integrations should not break core project management workflows.
- Avoid public secrets: `.env` files, API keys, private keys, generated database files, and local output files must not be committed.
- Keep security changes small and reviewable.
- Document security-relevant behavior changes in `CHANGELOG.md`.

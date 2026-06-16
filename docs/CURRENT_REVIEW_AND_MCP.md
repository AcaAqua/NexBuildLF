# Current Review and Debug MCP

## Review Summary

Date: 2026-06-16

### Design and Field Usability

- The current dark-mode field UI is substantially more usable than earlier builds: project cards, filters, page surfaces, and the Gantt chart now follow theme tokens instead of hard-coded white panels.
- The project detail route is the most important field workflow. Its current structure is appropriate: compact project header, project-level tabs, large Gantt work area, and quick share/edit actions.
- The mobile bottom navigation is better focused after removing the non-primary About item. This keeps the main field actions easier to hit.
- Remaining field validation should be done on real devices outdoors. Desktop screenshots cannot confirm sunlight readability, glove operation, or wet-screen behavior.

### Engineering State

- APK artifact workflow exists at `.github/workflows/android-debug-apk.yml`.
- GitHub download path: Actions -> Build Android debug APK -> latest successful run -> `kouteikanri-debug-apk`.
- The workflow uses current official GitHub Actions major versions.
- Local app storage is still localStorage based, so shared data and device-to-device operations should be treated as file/share transfer unless a backend sync layer is added later.

## Debug MCP

This repository includes a local MCP server for AI-assisted debugging.

Run it directly:

```bash
npm run mcp:debug
```

VS Code/Codex-style MCP config:

```json
{
  "servers": {
    "kouteikanri-debug": {
      "command": "node",
      "args": ["scripts/kouteikanri-debug-mcp.mjs"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

The checked-in `.vscode/mcp.json` already contains this configuration.

### Exposed Resource

- `kouteikanri://debug/project-summary`
  - Project metadata, key routes, build scripts, APK path, and workflow path.

### Exposed Tools

- `project_status`
  - Git branch/status, origin/main head, local URLs, APK file status, workflow existence.
- `check_local_url`
  - Fetches `localhost` / `127.0.0.1` URLs only and reports HTTP status/title/app shell presence.
- `run_safe_check`
  - Runs only allow-listed checks: `typecheck`, `lint`, `build`, `git-status`, `diff-check`.
- `apk_artifact_info`
  - Reports local APK path and GitHub Actions artifact workflow URL.

### Safety Notes

- No destructive file operations are exposed.
- No production/Xserver operations are exposed.
- No database/migration operations are exposed.
- Network fetch is restricted to localhost URLs for the local URL checker.

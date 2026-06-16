#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const timeoutMs = 120_000;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const server = new McpServer({
  name: 'kouteikanri-debug',
  version: '1.0.0',
});

function textResult(text, structuredContent) {
  return {
    content: [{ type: 'text', text }],
    ...(structuredContent ? { structuredContent } : {}),
  };
}

async function run(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: options.cwd || root,
      timeout: options.timeout || timeoutMs,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 4,
    });
    return {
      ok: true,
      command: [command, ...args].join(' '),
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  } catch (error) {
    return {
      ok: false,
      command: [command, ...args].join(' '),
      code: error.code ?? null,
      stdout: (error.stdout || '').trim(),
      stderr: (error.stderr || error.message || '').trim(),
    };
  }
}

function parsePackageJson() {
  const path = resolve(root, 'package.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

function safeJson(value) {
  return JSON.stringify(value, null, 2);
}

server.registerResource(
  'project-summary',
  'kouteikanri://debug/project-summary',
  {
    title: 'Kouteikanri project summary',
    description: 'Static project metadata useful for AI debugging.',
    mimeType: 'application/json',
  },
  async (uri) => {
    const pkg = parsePackageJson();
    const workflowPath = resolve(root, '.github/workflows/android-debug-apk.yml');
    const apkPath = resolve(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
    const summary = {
      name: pkg.name,
      version: pkg.version,
      root,
      framework: {
        next: pkg.dependencies?.next,
        react: pkg.dependencies?.react,
        capacitorAndroid: pkg.dependencies?.['@capacitor/android'],
      },
      scripts: pkg.scripts,
      paths: {
        dashboard: '/',
        projectDemo: '/project?id=demo-1',
        schedule: '/schedule',
        settings: '/settings',
        androidDebugApk: apkPath,
        githubActionsWorkflow: workflowPath,
      },
      exists: {
        androidDebugApk: existsSync(apkPath),
        githubActionsWorkflow: existsSync(workflowPath),
      },
    };
    return {
      contents: [{ uri: uri.href, mimeType: 'application/json', text: safeJson(summary) }],
    };
  },
);

server.registerTool(
  'project_status',
  {
    title: 'Project status',
    description: 'Return package metadata, git branch status, workflow file status, APK file status, and local app URLs.',
    outputSchema: {
      packageName: z.string(),
      branch: z.string(),
      gitStatus: z.string(),
      originMain: z.string(),
      localUrls: z.array(z.object({ label: z.string(), url: z.string() })),
      apk: z.object({ exists: z.boolean(), path: z.string(), sizeBytes: z.number().nullable(), modifiedAt: z.string().nullable() }),
      workflowExists: z.boolean(),
    },
  },
  async () => {
    const pkg = parsePackageJson();
    const branch = await run('git', ['branch', '--show-current']);
    const status = await run('git', ['status', '--short', '--branch']);
    const originMain = await run('git', ['log', '--oneline', '-1', 'origin/main']);
    const apkPath = resolve(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
    const apkStat = existsSync(apkPath) ? statSync(apkPath) : null;
    const structuredContent = {
      packageName: pkg.name,
      branch: branch.stdout || '',
      gitStatus: status.stdout || status.stderr || '',
      originMain: originMain.stdout || originMain.stderr || '',
      localUrls: [
        { label: 'Dashboard', url: 'http://127.0.0.1:3025/' },
        { label: 'Demo project', url: 'http://127.0.0.1:3025/project?id=demo-1' },
        { label: 'Schedule', url: 'http://127.0.0.1:3025/schedule' },
        { label: 'Settings', url: 'http://127.0.0.1:3025/settings' },
      ],
      apk: {
        exists: Boolean(apkStat),
        path: apkPath,
        sizeBytes: apkStat?.size ?? null,
        modifiedAt: apkStat?.mtime.toISOString() ?? null,
      },
      workflowExists: existsSync(resolve(root, '.github/workflows/android-debug-apk.yml')),
    };
    return textResult(safeJson(structuredContent), structuredContent);
  },
);

server.registerTool(
  'check_local_url',
  {
    title: 'Check local URL',
    description: 'Fetch a local development URL and report status, title, and whether app content is present.',
    inputSchema: {
      url: z.string().url().default('http://127.0.0.1:3025/'),
    },
    outputSchema: {
      ok: z.boolean(),
      status: z.number().nullable(),
      url: z.string(),
      title: z.string().nullable(),
      hasAppShell: z.boolean(),
    },
  },
  async ({ url }) => {
    if (!url.startsWith('http://127.0.0.1:') && !url.startsWith('http://localhost:')) {
      return textResult('Only localhost URLs are allowed.', {
        ok: false,
        status: null,
        url,
        title: null,
        hasAppShell: false,
      });
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const html = await response.text();
      const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || null;
      const structuredContent = {
        ok: response.ok,
        status: response.status,
        url,
        title,
        hasAppShell: html.includes('工程管理 Pro') || html.includes('NexBuildLF'),
      };
      return textResult(safeJson(structuredContent), structuredContent);
    } catch (error) {
      const structuredContent = {
        ok: false,
        status: null,
        url,
        title: null,
        hasAppShell: false,
      };
      return textResult(`Failed to fetch ${url}: ${error.message}`, structuredContent);
    }
  },
);

server.registerTool(
  'run_safe_check',
  {
    title: 'Run safe check',
    description: 'Run an allow-listed verification command: typecheck, lint, build, git-status, or diff-check.',
    inputSchema: {
      check: z.enum(['typecheck', 'lint', 'build', 'git-status', 'diff-check']),
    },
  },
  async ({ check }) => {
    const commands = {
      typecheck: [npmCommand, ['run', 'typecheck']],
      lint: [npmCommand, ['run', 'lint']],
      build: [npmCommand, ['run', 'build']],
      'git-status': ['git', ['status', '--short', '--branch']],
      'diff-check': ['git', ['diff', '--check']],
    };
    const [command, args] = commands[check];
    const result = await run(command, args, { timeout: check === 'build' ? 240_000 : timeoutMs });
    return textResult(safeJson(result), result);
  },
);

server.registerTool(
  'apk_artifact_info',
  {
    title: 'APK artifact info',
    description: 'Report local APK file details and GitHub Actions workflow URL for downloading the generated artifact.',
    outputSchema: {
      localApkPath: z.string(),
      localApkExists: z.boolean(),
      localApkSizeBytes: z.number().nullable(),
      localApkModifiedAt: z.string().nullable(),
      githubWorkflowUrl: z.string(),
      artifactName: z.string(),
    },
  },
  async () => {
    const apkPath = resolve(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
    const apkStat = existsSync(apkPath) ? statSync(apkPath) : null;
    const structuredContent = {
      localApkPath: apkPath,
      localApkExists: Boolean(apkStat),
      localApkSizeBytes: apkStat?.size ?? null,
      localApkModifiedAt: apkStat?.mtime.toISOString() ?? null,
      githubWorkflowUrl: 'https://github.com/AcaAqua/NexBuildLF/actions/workflows/android-debug-apk.yml',
      artifactName: 'kouteikanri-debug-apk',
    };
    return textResult(safeJson(structuredContent), structuredContent);
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Kouteikanri debug MCP server running on stdio');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

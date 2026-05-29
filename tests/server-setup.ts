// Vitest globalSetup: spawns the production adapter-node build on 127.0.0.1
// so route tests can fetch live HTML. Mirrors the D3 dexli-hub test infra
// pattern (engineer-domain test config; scaffold's vite.config.ts untouched).

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let child: ChildProcess | null = null;

const PORT = process.env.SERVER_PORT || '3400';
const HOST = '127.0.0.1';
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const BUILD_ENTRY = resolve(ROOT, 'build/index.js');
const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';

async function waitForServer(url: string, timeoutMs = 20000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const r = await fetch(url);
			if (r.ok || r.status < 500) return;
		} catch {
			// retry
		}
		await new Promise((r) => setTimeout(r, 200));
	}
	throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`);
}

function ensureBuild(): void {
	if (existsSync(BUILD_ENTRY)) return;
	const r = spawnSync(NPM_CMD, ['run', 'build'], {
		cwd: ROOT,
		stdio: 'inherit',
		shell: true
	});
	if (r.status !== 0) {
		throw new Error(`npm run build failed with status ${r.status}`);
	}
}

export async function setup(): Promise<void> {
	ensureBuild();

	child = spawn(process.execPath, [BUILD_ENTRY], {
		env: { ...process.env, HOST, PORT, NODE_ENV: 'production' },
		stdio: ['ignore', 'pipe', 'pipe']
	});

	child.stdout?.on('data', () => {});
	child.stderr?.on('data', () => {});

	await waitForServer(`http://${HOST}:${PORT}/`);
	process.env.TEST_SERVER_URL = `http://${HOST}:${PORT}`;
}

export async function teardown(): Promise<void> {
	if (child && !child.killed) {
		child.kill('SIGTERM');
		await new Promise((r) => setTimeout(r, 500));
		if (!child.killed) {
			try {
				child.kill('SIGKILL');
			} catch {
				// ignore
			}
		}
	}
}

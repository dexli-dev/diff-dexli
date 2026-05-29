// Engineer-domain vitest config — extends scaffold's vite.config.ts to
// (a) add the engineer `tests/` directory to the include glob, and
// (b) globalSetup spawns the production adapter-node build so route walks
// can fetch live HTML (bar item 10 mechanical coverage). Scaffold's
// vite.config.ts is untouched.

import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
			globalSetup: ['./tests/server-setup.ts'],
			testTimeout: 30000,
			hookTimeout: 30000
		}
	})
);

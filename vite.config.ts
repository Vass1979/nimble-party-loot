import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
	root: '.',
	publicDir: false,
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		sourcemap: true,
		minify: false,
		lib: {
			entry: 'src/module.ts',
			formats: ['es'],
			fileName: () => 'module.js',
		},
		rollupOptions: {
			output: {
				// Emit the bundled stylesheet at a stable path referenced by module.json.
				assetFileNames: (asset) => {
					if (asset.name && asset.name.endsWith('.css')) return 'styles/party-loot.css';
					return 'assets/[name][extname]';
				},
			},
		},
	},
	plugins: [
		svelte(),
		viteStaticCopy({
			targets: [
				{ src: 'module.json', dest: '.' },
				{ src: 'lang', dest: '.' },
			],
		}),
	],
});

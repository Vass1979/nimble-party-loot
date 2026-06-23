import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess(),
	compilerOptions: {
		// Foundry mounts these components imperatively via svelte.mount(); we are
		// not hydrating server-rendered markup.
		runes: true,
	},
};

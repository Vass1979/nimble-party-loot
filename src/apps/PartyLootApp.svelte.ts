import type { Component } from 'svelte';
import { MODULE_ID } from '../constants.js';
import { SvelteApplicationMixin } from '../lib/SvelteApplicationMixin.svelte.js';
import PartyLoot from '../components/PartyLoot.svelte';

const { ApplicationV2 } = foundry.applications.api;

export default class PartyLootApp extends SvelteApplicationMixin(ApplicationV2) {
	static #instance: PartyLootApp | null = null;

	protected root: Component<any> = PartyLoot as unknown as Component<any>;

	static DEFAULT_OPTIONS = {
		id: 'nimble-party-loot-app',
		classes: ['nimble-sheet', 'nimble-party-loot'],
		window: {
			title: 'NIMBLE_PARTY_LOOT.appTitle',
			icon: 'fa-solid fa-box-archive',
			resizable: true,
		},
		position: {
			width: 480,
			height: 640,
		},
	};

	/** Open the single shared window, focusing it if already open. */
	static show(): PartyLootApp {
		if (PartyLootApp.#instance?.rendered) {
			PartyLootApp.#instance.bringToFront();
			return PartyLootApp.#instance;
		}
		PartyLootApp.#instance = new PartyLootApp();
		PartyLootApp.#instance.render(true);
		return PartyLootApp.#instance;
	}

	static toggle(): void {
		if (PartyLootApp.#instance?.rendered) PartyLootApp.#instance.close();
		else PartyLootApp.show();
	}

	override _onClose(options: any): void {
		super._onClose(options);
		if (PartyLootApp.#instance === this) PartyLootApp.#instance = null;
	}

	/** Render context passed to the root component. */
	async _prepareContext(): Promise<any> {
		return { state: { moduleId: MODULE_ID } };
	}
}

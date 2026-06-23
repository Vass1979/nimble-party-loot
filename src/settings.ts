import { MODULE_ID, SETTING_STORE } from './constants.js';
import { lootStore } from './state/lootStore.svelte.js';
import { EMPTY_STORE, type LootStore } from './types.js';

/**
 * Register the single world-scoped setting that persists the entire pool.
 *
 * Scope `world` means only a GM can commit changes — which is exactly the
 * trust boundary we want. Player-initiated transfers are relayed to the active
 * GM over the socket; the GM performs the validated write here, and Foundry
 * propagates the change to every connected client via `onChange`.
 */
export function registerSettings(): void {
	game.settings.register(MODULE_ID, SETTING_STORE, {
		name: 'Party Loot Store',
		scope: 'world',
		config: false,
		type: Object,
		default: structuredClone(EMPTY_STORE),
		onChange: (value: LootStore) => {
			lootStore.replace(normaliseStore(value));
		},
	});
}

/** Read the persisted store, defaulting/repairing shape as needed. */
export function readStore(): LootStore {
	const raw = game.settings.get(MODULE_ID, SETTING_STORE) as LootStore | undefined;
	return normaliseStore(raw);
}

/** Persist the store. Only callable on a GM client (world-scope write). */
export async function writeStore(store: LootStore): Promise<void> {
	await game.settings.set(MODULE_ID, SETTING_STORE, store);
}

/** Defensive normalisation so a malformed/empty setting never breaks the UI. */
export function normaliseStore(raw: Partial<LootStore> | undefined): LootStore {
	return {
		currency: {
			cp: Number(raw?.currency?.cp ?? 0) || 0,
			sp: Number(raw?.currency?.sp ?? 0) || 0,
			gp: Number(raw?.currency?.gp ?? 0) || 0,
		},
		items: Array.isArray(raw?.items) ? raw!.items : [],
		log: Array.isArray(raw?.log) ? raw!.log : [],
	};
}

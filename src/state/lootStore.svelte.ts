import { EMPTY_STORE, type CoinPurse, type LogEntry, type LootEntry, type LootStore } from '../types.js';

/**
 * Reactive singleton holding the current pool. Because this lives in a
 * `.svelte.ts` module compiled by Svelte, the `$state` proxy is reactive
 * everywhere — including when mutated from a Foundry hook callback. Components
 * import `lootStore` and read its fields during render to subscribe.
 */
class LootStoreState {
	currency = $state<CoinPurse>({ ...EMPTY_STORE.currency });
	items = $state<LootEntry[]>([]);
	log = $state<LogEntry[]>([]);

	/** Replace the entire contents from a freshly read setting value. */
	replace(store: LootStore): void {
		this.currency = { ...store.currency };
		this.items = store.items.map((entry) => ({ ...entry }));
		this.log = store.log.map((entry) => ({ ...entry }));
	}

	get isEmpty(): boolean {
		return (
			this.items.length === 0 &&
			this.currency.cp === 0 &&
			this.currency.sp === 0 &&
			this.currency.gp === 0
		);
	}
}

export const lootStore = new LootStoreState();

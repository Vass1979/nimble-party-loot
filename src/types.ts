/** A coin purse, mirroring the three Nimble denominations. */
export interface CoinPurse {
	cp: number;
	sp: number;
	gp: number;
}

/**
 * A single entry in the party loot pool. We store the full serialised source of
 * the Nimble `object` item (via `item.toObject()`) so it can be faithfully
 * recreated on any actor on withdrawal — including price, properties, slots,
 * identified state, embedded activation/effects, etc.
 */
export interface LootEntry {
	/** Stable id for this pool entry (foundry.utils.randomID), distinct from the item's own _id. */
	entryId: string;
	/** Quantity held in the pool (may exceed the source's own quantity field). */
	quantity: number;
	/** Display name (resolved respecting identified state at write time for sorting/headers). */
	name: string;
	/** Image path for the row. */
	img: string;
	/** Nimble objectType: weapon | armor | shield | consumable | misc (drives grouping). */
	objectType: string;
	/** Whether the source is identified. Players see the unidentified name when false. */
	identified: boolean;
	/** Whether identical stackable copies may merge into this entry. */
	stackable: boolean;
	/** Merge signature — identical signatures collapse into one entry (for stackables). */
	signature: string;
	/** The full serialised item source, ready for Item.create / actor.createEmbeddedDocuments. */
	source: Record<string, unknown>;
	/** Display name of the depositor (informational only). */
	depositedBy: string;
}

/** A recorded purchase made from the shared pool. */
export interface LogEntry {
	id: string;
	/** Epoch milliseconds. */
	timestamp: number;
	/** The Foundry user who spent. */
	userName: string;
	/** Their assigned character at spend time, if any. */
	characterName: string | null;
	cp: number;
	sp: number;
	gp: number;
	/** What the coins were spent on. */
	reason: string;
}

/** The entire shared store, persisted as a single world setting. */
export interface LootStore {
	currency: CoinPurse;
	items: LootEntry[];
	log: LogEntry[];
}

export const EMPTY_STORE: LootStore = {
	currency: { cp: 0, sp: 0, gp: 0 },
	items: [],
	log: [],
};

/** Socket request actions a player can ask the active GM to perform. */
export type LootAction =
	| 'depositItem'
	| 'depositItemSource'
	| 'withdrawItem'
	| 'depositCurrency'
	| 'withdrawCurrency'
	| 'spendCurrency'
	| 'adjustCurrency'
	| 'clearLog';

/** A request emitted by any client and executed on the active GM client. */
export interface LootRequest {
	type: 'request';
	requestId: string;
	userId: string;
	action: LootAction;
	payload:
		| DepositItemPayload
		| WithdrawItemPayload
		| MultiCurrencyPayload
		| SpendPayload
		| DepositItemSourcePayload
		| AdjustCurrencyPayload
		| Record<string, never>;
}

/** The GM's reply, targeted back at the requesting user. */
export interface LootResponse {
	type: 'response';
	requestId: string;
	toUserId: string;
	ok: boolean;
	error?: string;
}

export interface DepositItemPayload {
	actorId: string;
	itemId: string;
	quantity: number;
}

export interface WithdrawItemPayload {
	actorId: string;
	entryId: string;
	quantity: number;
}

/** Deposit or withdraw any mix of the three denominations through one character. */
export interface MultiCurrencyPayload {
	actorId: string;
	cp: number;
	sp: number;
	gp: number;
}

/** Spend any mix of denominations straight out of the pool, with a reason for the log. */
export interface SpendPayload {
	cp: number;
	sp: number;
	gp: number;
	reason: string;
}

/** GM-only: deposit a copy of any item (world or compendium) by uuid, no source removal. */
export interface DepositItemSourcePayload {
	uuid: string;
	quantity: number;
}

/** GM-only: add (or, with negative deltas, remove) coins directly to/from the pool. */
export interface AdjustCurrencyPayload {
	cp: number;
	sp: number;
	gp: number;
}

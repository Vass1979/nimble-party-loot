import { LOOT_ITEM_TYPE } from '../constants.js';
import { getCoin } from '../lib/actors.js';
import { entryFromItem } from '../lib/lootHelpers.js';
import { readStore, writeStore } from '../settings.js';
import type {
	AdjustCurrencyPayload,
	DepositItemPayload,
	DepositItemSourcePayload,
	LogEntry,
	LootStore,
	MultiCurrencyPayload,
	SpendPayload,
	WithdrawItemPayload,
} from '../types.js';

export interface TxResult {
	ok: boolean;
	error?: string;
}

/** These run ONLY on a GM client. The requesting user is resolved for permission checks. */

export async function execDepositItem(
	userId: string,
	payload: DepositItemPayload,
): Promise<TxResult> {
	const user = game.users.get(userId);
	const actor = game.actors.get(payload.actorId);
	if (!user || !actor) return fail('Unknown actor or user.');
	if (!actor.testUserPermission(user, 'OWNER')) return fail('You do not own that character.');

	const item = actor.items.get(payload.itemId);
	if (!item || item.type !== LOOT_ITEM_TYPE) return fail('That item cannot be stashed.');

	const held = Number(item.system?.quantity ?? 1) || 1;
	const qty = clampInt(payload.quantity, 1, held);
	if (qty <= 0) return fail('Nothing to deposit.');

	const store = readStore();
	const entry = entryFromItem(item, qty, user.name);

	// Merge into an existing stackable entry with an identical signature.
	const existing = entry.stackable
		? store.items.find((e) => e.stackable && e.signature === entry.signature)
		: undefined;
	if (existing) existing.quantity += qty;
	else store.items.push(entry);

	// Remove the deposited count from the source actor.
	if (qty >= held) await actor.deleteEmbeddedDocuments('Item', [item.id]);
	else await item.update({ 'system.quantity': held - qty });

	await writeStore(store);
	return ok();
}

export async function execWithdrawItem(
	userId: string,
	payload: WithdrawItemPayload,
): Promise<TxResult> {
	const user = game.users.get(userId);
	const actor = game.actors.get(payload.actorId);
	if (!user || !actor) return fail('Unknown actor or user.');
	if (!actor.testUserPermission(user, 'OWNER')) return fail('You do not own that character.');
	if (actor.type !== 'character') return fail('Loot can only be taken by characters.');

	const store = readStore();
	const entry = store.items.find((e) => e.entryId === payload.entryId);
	if (!entry) return fail('That item is no longer in the stash.');

	const qty = clampInt(payload.quantity, 1, entry.quantity);
	if (qty <= 0) return fail('Nothing to withdraw.');

	// Recreate the item on the receiving actor with the withdrawn quantity.
	const source = foundry.utils.deepClone(entry.source);
	source._id = null;
	if (source.system) source.system.quantity = qty;
	await actor.createEmbeddedDocuments('Item', [source]);

	// Decrement or remove the pool entry.
	if (qty >= entry.quantity) store.items = store.items.filter((e) => e.entryId !== entry.entryId);
	else entry.quantity -= qty;

	await writeStore(store);
	return ok();
}

export async function execDepositCurrency(
	userId: string,
	payload: MultiCurrencyPayload,
): Promise<TxResult> {
	const user = game.users.get(userId);
	const actor = game.actors.get(payload.actorId);
	if (!user || !actor) return fail('Unknown actor or user.');
	if (!actor.testUserPermission(user, 'OWNER')) return fail('You do not own that character.');

	// Clamp each denomination to what the character actually holds.
	const move = {
		cp: clampInt(payload.cp, 0, getCoin(actor, 'cp')),
		sp: clampInt(payload.sp, 0, getCoin(actor, 'sp')),
		gp: clampInt(payload.gp, 0, getCoin(actor, 'gp')),
	};
	if (move.cp + move.sp + move.gp <= 0) return fail('Nothing to deposit.');

	const store = readStore();
	const update: Record<string, number> = {};
	for (const d of ['cp', 'sp', 'gp'] as const) {
		if (move[d] <= 0) continue;
		store.currency[d] += move[d];
		update[`system.currency.${d}.value`] = getCoin(actor, d) - move[d];
	}

	await actor.update(update);
	await writeStore(store);
	return ok();
}

export async function execWithdrawCurrency(
	userId: string,
	payload: MultiCurrencyPayload,
): Promise<TxResult> {
	const user = game.users.get(userId);
	const actor = game.actors.get(payload.actorId);
	if (!user || !actor) return fail('Unknown actor or user.');
	if (!actor.testUserPermission(user, 'OWNER')) return fail('You do not own that character.');

	const store = readStore();
	// Clamp each denomination to what the pool holds.
	const move = {
		cp: clampInt(payload.cp, 0, store.currency.cp),
		sp: clampInt(payload.sp, 0, store.currency.sp),
		gp: clampInt(payload.gp, 0, store.currency.gp),
	};
	if (move.cp + move.sp + move.gp <= 0) return fail('Nothing to withdraw.');

	const update: Record<string, number> = {};
	for (const d of ['cp', 'sp', 'gp'] as const) {
		if (move[d] <= 0) continue;
		store.currency[d] -= move[d];
		update[`system.currency.${d}.value`] = getCoin(actor, d) + move[d];
	}

	await actor.update(update);
	await writeStore(store);
	return ok();
}

/**
 * Spend coins straight out of the pool — they leave the game entirely (paid to a
 * merchant, a bribe, etc.) and the purchase is recorded in the shared ledger.
 * Any player may spend from the shared pool, capped at what the pool holds.
 */
export async function execSpendCurrency(
	userId: string,
	payload: SpendPayload,
): Promise<TxResult> {
	const user = game.users.get(userId);
	if (!user) return fail('Unknown user.');

	const reason = String(payload.reason ?? '').trim();
	if (!reason) return fail('Say what the coins are being spent on.');

	const store = readStore();
	const spend = {
		cp: clampInt(payload.cp, 0, store.currency.cp),
		sp: clampInt(payload.sp, 0, store.currency.sp),
		gp: clampInt(payload.gp, 0, store.currency.gp),
	};
	if (spend.cp + spend.sp + spend.gp <= 0) return fail('Nothing to spend.');

	store.currency.cp -= spend.cp;
	store.currency.sp -= spend.sp;
	store.currency.gp -= spend.gp;

	const entry: LogEntry = {
		id: foundry.utils.randomID(),
		timestamp: Date.now(),
		userName: user.name,
		characterName: user.character?.name ?? null,
		cp: spend.cp,
		sp: spend.sp,
		gp: spend.gp,
		reason,
	};
	store.log.unshift(entry);
	// Keep the ledger from growing without bound.
	if (store.log.length > 200) store.log.length = 200;

	await writeStore(store);
	return ok();
}

/** GM-only. Clear the spending ledger. */
export async function execClearLog(userId: string): Promise<TxResult> {
	const user = game.users.get(userId);
	if (!user?.isGM) return fail('Only a GM can clear the ledger.');
	const store = readStore();
	store.log = [];
	await writeStore(store);
	return ok();
}

/**
 * GM-only. Deposit a *copy* of any item resolvable by uuid (world Items
 * directory or a compendium pack). Nothing is removed from any source — this is
 * how a GM seeds the stash with found treasure, shop stock, monster drops, etc.
 */
export async function execDepositItemSource(
	userId: string,
	payload: DepositItemSourcePayload,
): Promise<TxResult> {
	const user = game.users.get(userId);
	if (!user?.isGM) return fail('Only a GM can add items from outside a character.');

	const item = await fromUuid(payload.uuid);
	if (!item || item.type !== LOOT_ITEM_TYPE) return fail('That item cannot be stashed.');

	const qty = clampInt(payload.quantity, 1, 99999);
	if (qty <= 0) return fail('Nothing to deposit.');

	const store = readStore();
	const entry = entryFromItem(item, qty, user.name);

	const existing = entry.stackable
		? store.items.find((e) => e.stackable && e.signature === entry.signature)
		: undefined;
	if (existing) existing.quantity += qty;
	else store.items.push(entry);

	await writeStore(store);
	return ok();
}

/**
 * GM-only. Add coins straight to the pool with no character as the source.
 * Negative deltas subtract (clamped at zero) so it doubles as a correction tool.
 */
export async function execAdjustCurrency(
	userId: string,
	payload: AdjustCurrencyPayload,
): Promise<TxResult> {
	const user = game.users.get(userId);
	if (!user?.isGM) return fail('Only a GM can add coins without a source.');

	const cp = Math.floor(Number(payload.cp) || 0);
	const sp = Math.floor(Number(payload.sp) || 0);
	const gp = Math.floor(Number(payload.gp) || 0);
	if (cp === 0 && sp === 0 && gp === 0) return fail('Enter an amount to add.');

	const store = readStore();
	store.currency.cp = Math.max(0, store.currency.cp + cp);
	store.currency.sp = Math.max(0, store.currency.sp + sp);
	store.currency.gp = Math.max(0, store.currency.gp + gp);

	await writeStore(store);
	return ok();
}

function clampInt(value: number, min: number, max: number): number {
	const n = Math.floor(Number(value) || 0);
	return Math.max(min, Math.min(max, n));
}

function ok(): TxResult {
	return { ok: true };
}

function fail(error: string): TxResult {
	return { ok: false, error };
}

export type { LootStore };

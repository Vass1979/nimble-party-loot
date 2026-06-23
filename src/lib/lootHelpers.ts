import { LOOT_ITEM_TYPE } from '../constants.js';
import type { LootEntry } from '../types.js';

/** Is this item a Nimble physical inventory object (the only depositable type)? */
export function isDepositableItem(item: any): boolean {
	return item?.type === LOOT_ITEM_TYPE;
}

/** Is the object a stackable type (its copies can merge in the pool)? */
export function isStackable(source: Record<string, any>): boolean {
	return source?.system?.objectSizeType === 'stackable';
}

/**
 * A signature used to collapse identical stackable items into one pool entry.
 * Two stackables merge only when name, image, object type, identified state and
 * the meaningful system fields all match. Non-stackables always get a unique
 * signature so they never merge.
 */
export function computeSignature(source: Record<string, any>): string {
	if (!isStackable(source)) return foundry.utils.randomID();
	const sys = source.system ?? {};
	const key = {
		name: source.name,
		img: source.img,
		objectType: sys.objectType,
		identified: sys.identified,
		price: sys.price,
		description: sys.description,
		properties: sys.properties,
		slotsRequired: sys.slotsRequired,
	};
	return JSON.stringify(key);
}

/** The name shown to a viewer, honouring identified state for non-GMs. */
export function displayName(entry: LootEntry, isGM: boolean): string {
	if (entry.identified || isGM) return entry.name;
	const unidentified = (entry.source?.system as any)?.unidentifiedName;
	return unidentified || 'Unidentified Object';
}

/**
 * Build a pool entry from a live item document, normalising the serialised
 * source so it is clean to recreate later (quantity is tracked on the entry,
 * not the source; we reset the source quantity to 1 to avoid double counting).
 */
export function entryFromItem(item: any, quantity: number, depositedBy: string): LootEntry {
	const source = item.toObject();
	source._id = null;
	if (source.system) source.system.quantity = 1;

	return {
		entryId: foundry.utils.randomID(),
		quantity,
		name: source.name,
		img: source.img,
		objectType: source.system?.objectType ?? 'misc',
		identified: source.system?.identified ?? true,
		stackable: isStackable(source),
		signature: computeSignature(source),
		source,
		depositedBy,
	};
}

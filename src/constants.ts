/** The id declared in module.json. Used for settings scope, socket channel and flags. */
export const MODULE_ID = 'nimble-party-loot';

/** The Nimble system id, used to guard activation and to read system data paths. */
export const SYSTEM_ID = 'nimble';

/** Socket channel name. Foundry namespaces module sockets as `module.<id>`. */
export const SOCKET_NAME = `module.${MODULE_ID}`;

/** World-scoped setting key holding the entire shared loot store (items + coins). */
export const SETTING_STORE = 'lootStore';

/** Item document type in Nimble that represents physical inventory ("objects"). */
export const LOOT_ITEM_TYPE = 'object';

/** Currency denominations, smallest to largest, as stored on the character actor. */
export const DENOMINATIONS = ['cp', 'sp', 'gp'] as const;
export type Denomination = (typeof DENOMINATIONS)[number];

/** Drag-data type set on a loot row so actor-sheet drops can be intercepted for withdrawal. */
export const DRAG_TYPE_WITHDRAW = 'NimblePartyLoot';

/** Object-type grouping order, mirroring the Nimble character sheet inventory tab. */
export const OBJECT_TYPE_ORDER = ['weapon', 'armor', 'shield', 'consumable', 'misc'] as const;

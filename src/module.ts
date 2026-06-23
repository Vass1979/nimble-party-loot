import './styles.js';
import PartyLootApp from './apps/PartyLootApp.svelte.js';
import { DRAG_TYPE_WITHDRAW, MODULE_ID } from './constants.js';
import { isNimble } from './lib/actors.js';
import { withdrawItem } from './lib/lootActions.js';
import { registerSocket } from './socket/socket.js';
import { lootStore } from './state/lootStore.svelte.js';
import { readStore, registerSettings } from './settings.js';

Hooks.once('init', () => {
	registerSettings();
	registerSocket();

	game.keybindings.register(MODULE_ID, 'toggle', {
		name: 'NIMBLE_PARTY_LOOT.keybindToggle',
		editable: [{ key: 'KeyL', modifiers: ['Shift'] }],
		onDown: () => {
			PartyLootApp.toggle();
			return true;
		},
	});

	const mod = game.modules.get(MODULE_ID);
	if (mod) {
		mod.api = {
			open: () => PartyLootApp.show(),
			toggle: () => PartyLootApp.toggle(),
			app: PartyLootApp,
		};
	}
});

Hooks.once('ready', () => {
	if (!isNimble()) {
		ui.notifications.error('Nimble Party Loot requires the Nimble system to be active.');
		return;
	}
	// Seed the reactive store from the persisted setting for this session.
	lootStore.replace(readStore());
});

/**
 * Add a togglable control button to the Token tools group (visible to all
 * users, including players). Written for the Foundry v13 record-style controls.
 */
Hooks.on('getSceneControlButtons', (controls: any) => {
	const group = controls.tokens ?? controls.token;
	if (!group?.tools) return;
	group.tools['party-loot'] = {
		name: 'party-loot',
		title: 'NIMBLE_PARTY_LOOT.controlTitle',
		icon: 'fa-solid fa-box-archive',
		button: true,
		visible: true,
		order: 99,
		onChange: () => PartyLootApp.toggle(),
		onClick: () => PartyLootApp.toggle(),
	};
});

/**
 * Intercept loot rows dropped onto a character sheet so they are withdrawn
 * (atomically removed from the pool and created on that actor) instead of the
 * system trying to handle an unknown drop type. Returning false cancels the
 * system's default drop handling. Drag-to-sheet takes the whole stack; use the
 * in-window "Take" button for partial quantities.
 */
Hooks.on('dropActorSheetData', (actor: any, _sheet: any, data: any) => {
	if (!data || data.type !== DRAG_TYPE_WITHDRAW) return true;
	const entry = lootStore.items.find((e) => e.entryId === data.entryId);
	if (!entry) {
		ui.notifications.warn('That item is no longer in the stash.');
		return false;
	}
	if (!actor?.testUserPermission(game.user, 'OWNER') || actor.type !== 'character') {
		ui.notifications.warn('You can only take loot into a character you own.');
		return false;
	}
	void withdrawItem(entry, actor.id, entry.quantity);
	return false;
});

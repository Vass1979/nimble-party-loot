<script lang="ts">
	import { DRAG_TYPE_WITHDRAW, OBJECT_TYPE_ORDER } from '../constants.js';
	import {
		defaultCharacter,
		getCoin,
		hasActiveGM,
		ownedCharacters,
	} from '../lib/actors.js';
	import {
		adjustCurrency,
		clearLog,
		depositCurrency,
		depositItem,
		depositItemSource,
		spendCurrency,
		withdrawCurrency,
		withdrawItem,
	} from '../lib/lootActions.js';
	import { isDepositableItem } from '../lib/lootHelpers.js';
	import { lootStore } from '../state/lootStore.svelte.js';
	import type { CoinPurse, LootEntry } from '../types.js';
	import AmountPrompt from './AmountPrompt.svelte';
	import CharacterPicker from './CharacterPicker.svelte';
	import CurrencyBar from './CurrencyBar.svelte';
	import CurrencyModal from './CurrencyModal.svelte';
	import LogPanel from './LogPanel.svelte';
	import LootList from './LootList.svelte';

	const isGM = game.user.isGM;

	let dragOver = $state(false);
	let gmOnline = $state(hasActiveGM());

	// Modal state ------------------------------------------------------------
	type AmountState = {
		title: string;
		label: string;
		max: number;
		initial: number;
		confirm: (n: number) => void;
	} | null;
	let amountModal = $state<AmountState>(null);

	type PickerState = {
		title: string;
		characters: { id: string; name: string; img: string }[];
		confirm: (id: string) => void;
	} | null;
	let pickerModal = $state<PickerState>(null);

	type CurrencyModalState = {
		title: string;
		maxes: CoinPurse;
		requireReason: boolean;
		confirmLabel: string;
		confirm: (r: { cp: number; sp: number; gp: number; reason: string }) => void;
	} | null;
	let currencyModal = $state<CurrencyModalState>(null);

	function cancelCurrency() {
		currencyModal = null;
	}

	function promptAmount(title: string, label: string, max: number, initial = 1): Promise<number | null> {
		return new Promise((resolve) => {
			if (max <= 1) {
				resolve(max <= 0 ? null : 1);
				return;
			}
			amountModal = {
				title,
				label,
				max,
				initial: Math.min(initial, max),
				confirm: (n) => {
					amountModal = null;
					resolve(n);
				},
			};
		});
	}

	function cancelAmount() {
		amountModal = null;
	}

	function pickCharacter(title: string): Promise<string | null> {
		const owned = isGM
			? game.actors.contents.filter((a: any) => a.type === 'character')
			: ownedCharacters();
		if (owned.length === 0) {
			ui.notifications.warn('You have no character to use.');
			return Promise.resolve(null);
		}
		if (owned.length === 1) return Promise.resolve(owned[0].id);
		return new Promise((resolve) => {
			pickerModal = {
				title,
				characters: owned.map((a: any) => ({ id: a.id, name: a.name, img: a.img })),
				confirm: (id) => {
					pickerModal = null;
					resolve(id);
				},
			};
		});
	}

	function cancelPicker() {
		pickerModal = null;
	}

	/** Resolve which owned character to act through for a given purpose. */
	async function resolveActor(title: string): Promise<any | null> {
		const fallback = defaultCharacter();
		if (fallback) return fallback;
		const id = await pickCharacter(title);
		return id ? game.actors.get(id) : null;
	}

	// Deposit (drag item into the window) ------------------------------------
	async function handleDrop(event: DragEvent) {
		dragOver = false;
		const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
		if (!data || data.type !== 'Item') return;

		const item = await fromUuid(data.uuid);
		if (!item) return;
		if (!isDepositableItem(item)) {
			ui.notifications.warn('Only physical items (objects) can be stashed.');
			return;
		}

		const actor = item.actor;
		if (actor) {
			// Item embedded on a character/NPC: deposit from that inventory, capped
			// at the held quantity, removing the deposited count from the source.
			if (!actor.testUserPermission(game.user, 'OWNER')) {
				ui.notifications.warn('You can only stash items from a character you own.');
				return;
			}
			const held = Number(item.system?.quantity ?? 1) || 1;
			const qty = await promptAmount('Deposit Item', `How many "${item.name}" to stash?`, held, held);
			if (!qty) return;
			await depositItem(actor.id, item.id, qty);
			return;
		}

		// No owning actor: a world item (Items tab) or a compendium item.
		// GMs may seed the stash with a copy; players cannot mint items.
		if (!isGM) {
			ui.notifications.warn('You can only stash items from a character you own.');
			return;
		}
		const sourceQty = Number(item.system?.quantity ?? 1) || 1;
		const qty = await promptAmount(
			'Add Item to Stash',
			`How many "${item.name}" to add?`,
			99999,
			sourceQty,
		);
		if (!qty) return;
		await depositItemSource(item.uuid, qty, item.name);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	function handleDragLeave(event: DragEvent) {
		// Only clear when leaving the drop surface entirely.
		if (event.currentTarget === event.target) dragOver = false;
	}

	// Withdraw (Take button on a row) ----------------------------------------
	async function takeItem(entry: LootEntry) {
		const actor = await resolveActor('Take item — which character?');
		if (!actor) return;
		const qty = await promptAmount('Take Item', `How many "${entry.name}" to take?`, entry.quantity, entry.quantity);
		if (!qty) return;
		await withdrawItem(entry, actor.id, qty);
	}

	// Currency ---------------------------------------------------------------
	function openCurrencyModal(state: NonNullable<CurrencyModalState>) {
		currencyModal = state;
	}

	async function depositFlow() {
		const actor = await resolveActor('Deposit coins — from which character?');
		if (!actor) return;
		const maxes: CoinPurse = {
			gp: getCoin(actor, 'gp'),
			sp: getCoin(actor, 'sp'),
			cp: getCoin(actor, 'cp'),
		};
		if (maxes.gp + maxes.sp + maxes.cp <= 0) {
			ui.notifications.warn('That character has no coins.');
			return;
		}
		openCurrencyModal({
			title: `Deposit coins from ${actor.name}`,
			maxes,
			requireReason: false,
			confirmLabel: 'Deposit',
			confirm: async ({ cp, sp, gp }) => {
				currencyModal = null;
				await depositCurrency(actor.id, { cp, sp, gp });
			},
		});
	}

	async function withdrawFlow() {
		const actor = await resolveActor('Withdraw coins — to which character?');
		if (!actor) return;
		openCurrencyModal({
			title: `Withdraw coins to ${actor.name}`,
			maxes: { ...lootStore.currency },
			requireReason: false,
			confirmLabel: 'Withdraw',
			confirm: async ({ cp, sp, gp }) => {
				currencyModal = null;
				await withdrawCurrency(actor.id, { cp, sp, gp });
			},
		});
	}

	function spendFlow() {
		openCurrencyModal({
			title: 'Spend from the stash',
			maxes: { ...lootStore.currency },
			requireReason: true,
			confirmLabel: 'Spend',
			confirm: async ({ cp, sp, gp, reason }) => {
				currencyModal = null;
				await spendCurrency({ cp, sp, gp }, reason);
			},
		});
	}

	// GM-only: mint coins directly into the pool (no character source).
	async function gmAdjustCoins(deltas: { cp: number; sp: number; gp: number }) {
		await adjustCurrency(deltas);
	}

	async function clearLedger() {
		await clearLog();
	}

	// Keep the "GM online" hint live.
	$effect(() => {
		const update = () => (gmOnline = hasActiveGM());
		Hooks.on('userConnected', update);
		return () => Hooks.off('userConnected', update);
	});

	// Grouped, ordered items for display.
	let grouped = $derived.by(() => {
		const groups = new Map<string, LootEntry[]>();
		for (const entry of lootStore.items) {
			const key = entry.objectType || 'misc';
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key)!.push(entry);
		}
		const order = [...OBJECT_TYPE_ORDER];
		return [...groups.entries()]
			.sort((a, b) => {
				const ai = order.indexOf(a[0] as any);
				const bi = order.indexOf(b[0] as any);
				return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
			})
			.map(([type, entries]) => ({
				type,
				entries: entries.sort((x, y) => x.name.localeCompare(y.name)),
			}));
	});
</script>

<div
	class="npl"
	class:npl--drag-over={dragOver}
	role="region"
	aria-label="Party Loot"
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
>
	{#if !gmOnline && !isGM}
		<p class="npl__banner">A GM must be online to move loot.</p>
	{/if}

	<CurrencyBar
		currency={lootStore.currency}
		{isGM}
		onDeposit={depositFlow}
		onWithdraw={withdrawFlow}
		onSpend={spendFlow}
		onGmAdjust={gmAdjustCoins}
	/>

	<div class="npl__items">
		{#if lootStore.items.length === 0}
			<div class="npl__empty">
				<i class="fa-solid fa-box-open"></i>
				<p>The stash is empty.</p>
				<p class="npl__empty-hint">Drag an item here from your character sheet to share it.</p>
			</div>
		{:else}
			<LootList {grouped} {isGM} onTake={takeItem} {DRAG_TYPE_WITHDRAW} />
		{/if}
	</div>

	<LogPanel log={lootStore.log} {isGM} onClear={clearLedger} />

	{#if amountModal}
		<AmountPrompt
			title={amountModal.title}
			label={amountModal.label}
			max={amountModal.max}
			initial={amountModal.initial}
			onConfirm={amountModal.confirm}
			onCancel={cancelAmount}
		/>
	{/if}

	{#if currencyModal}
		<CurrencyModal
			title={currencyModal.title}
			maxes={currencyModal.maxes}
			requireReason={currencyModal.requireReason}
			confirmLabel={currencyModal.confirmLabel}
			onConfirm={currencyModal.confirm}
			onCancel={cancelCurrency}
		/>
	{/if}

	{#if pickerModal}
		<CharacterPicker
			title={pickerModal.title}
			characters={pickerModal.characters}
			onConfirm={pickerModal.confirm}
			onCancel={cancelPicker}
		/>
	{/if}
</div>

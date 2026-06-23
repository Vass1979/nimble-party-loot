<script lang="ts">
	import type { LootEntry } from '../types.js';
	import LootRow from './LootRow.svelte';

	let {
		grouped,
		isGM,
		onTake,
		DRAG_TYPE_WITHDRAW,
	}: {
		grouped: { type: string; entries: LootEntry[] }[];
		isGM: boolean;
		onTake: (entry: LootEntry) => void;
		DRAG_TYPE_WITHDRAW: string;
	} = $props();

	const headings: Record<string, string> =
		CONFIG?.NIMBLE?.objectTypeHeadings ?? {
			weapon: 'Weapons',
			armor: 'Armor',
			shield: 'Shields',
			consumable: 'Consumables',
			misc: 'Miscellaneous',
		};

	function heading(type: string): string {
		const value = headings[type];
		if (!value) return type;
		return value.startsWith('NIMBLE.') ? game.i18n.localize(value) : value;
	}
</script>

{#each grouped as group (group.type)}
	<div class="npl-group">
		<h3 class="npl-group__heading">{heading(group.type)}</h3>
		<ul class="npl-group__list">
			{#each group.entries as entry (entry.entryId)}
				<LootRow {entry} {isGM} {onTake} {DRAG_TYPE_WITHDRAW} />
			{/each}
		</ul>
	</div>
{/each}

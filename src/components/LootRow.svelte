<script lang="ts">
	import { displayName } from '../lib/lootHelpers.js';
	import type { LootEntry } from '../types.js';

	let {
		entry,
		isGM,
		onTake,
		DRAG_TYPE_WITHDRAW,
	}: {
		entry: LootEntry;
		isGM: boolean;
		onTake: (entry: LootEntry) => void;
		DRAG_TYPE_WITHDRAW: string;
	} = $props();

	let name = $derived(displayName(entry, isGM));
	let price = $derived(entry.source?.system as any);

	function onDragStart(event: DragEvent) {
		// Custom drag payload intercepted by the dropActorSheetData hook so the
		// item can be dropped straight onto a character sheet to withdraw it.
		event.dataTransfer?.setData(
			'text/plain',
			JSON.stringify({ type: DRAG_TYPE_WITHDRAW, entryId: entry.entryId }),
		);
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
	}
</script>

<li
	class="npl-row"
	class:npl-row--unidentified={!entry.identified}
	draggable="true"
	ondragstart={onDragStart}
	data-tooltip={name}
>
	<img class="npl-row__img" src={entry.source.img as string} alt="" draggable="false" />
	<span class="npl-row__name">{name}</span>
	{#if entry.quantity > 1}
		<span class="npl-row__qty">×{entry.quantity}</span>
	{/if}
	{#if isGM && !entry.identified}
		<i class="npl-row__flag fa-solid fa-eye-slash" title="Unidentified to players"></i>
	{/if}
	<button type="button" class="npl-row__take" title="Take" onclick={() => onTake(entry)}>
		<i class="fa-solid fa-hand"></i>
	</button>
</li>

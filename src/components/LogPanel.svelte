<script lang="ts">
	import { coinString } from '../lib/lootActions.js';
	import type { LogEntry } from '../types.js';

	let {
		log,
		isGM,
		onClear,
	}: {
		log: LogEntry[];
		isGM: boolean;
		onClear: () => void;
	} = $props();

	let open = $state(false);

	function who(entry: LogEntry): string {
		return entry.characterName ? `${entry.characterName} (${entry.userName})` : entry.userName;
	}

	function when(ts: number): string {
		try {
			return new Date(ts).toLocaleString();
		} catch {
			return '';
		}
	}
</script>

<section class="npl-ledger" aria-label="Spending ledger">
	<button type="button" class="npl-ledger__toggle" onclick={() => (open = !open)}>
		<i class="fa-solid {open ? 'fa-caret-down' : 'fa-caret-right'}"></i>
		<i class="fa-solid fa-scroll"></i>
		Spending ledger
		{#if log.length}<span class="npl-ledger__count">{log.length}</span>{/if}
	</button>

	{#if open}
		{#if log.length === 0}
			<p class="npl-ledger__empty">Nothing has been spent yet.</p>
		{:else}
			<ul class="npl-ledger__list">
				{#each log as entry (entry.id)}
					<li class="npl-ledger__entry">
						<div class="npl-ledger__line">
							<strong>{who(entry)}</strong> spent
							<span class="npl-ledger__coins">{coinString(entry)}</span>
							on <em>{entry.reason}</em>
						</div>
						<time class="npl-ledger__time">{when(entry.timestamp)}</time>
					</li>
				{/each}
			</ul>
			{#if isGM}
				<button type="button" class="npl-ledger__clear" onclick={onClear}>
					<i class="fa-solid fa-trash"></i> Clear ledger
				</button>
			{/if}
		{/if}
	{/if}
</section>

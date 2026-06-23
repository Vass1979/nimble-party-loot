<script lang="ts">
	import type { CoinPurse } from '../types.js';

	let {
		currency,
		isGM,
		onDeposit,
		onWithdraw,
		onSpend,
		onGmAdjust,
	}: {
		currency: CoinPurse;
		isGM: boolean;
		onDeposit: () => void;
		onWithdraw: () => void;
		onSpend: () => void;
		onGmAdjust: (deltas: { cp: number; sp: number; gp: number }) => void;
	} = $props();

	const coins: { key: keyof CoinPurse; label: string; cls: string }[] = [
		{ key: 'gp', label: 'Gold', cls: 'npl-coin--gp' },
		{ key: 'sp', label: 'Silver', cls: 'npl-coin--sp' },
		{ key: 'cp', label: 'Copper', cls: 'npl-coin--cp' },
	];

	let empty = $derived(currency.cp + currency.sp + currency.gp <= 0);

	// GM mint panel state
	let gmOpen = $state(false);
	let addGp = $state(0);
	let addSp = $state(0);
	let addCp = $state(0);

	function submitGm() {
		const deltas = {
			gp: Math.floor(Number(addGp) || 0),
			sp: Math.floor(Number(addSp) || 0),
			cp: Math.floor(Number(addCp) || 0),
		};
		if (!deltas.gp && !deltas.sp && !deltas.cp) return;
		onGmAdjust(deltas);
		addGp = addSp = addCp = 0;
	}
</script>

<section class="npl-currency" aria-label="Shared coins">
	{#each coins as coin (coin.key)}
		<div class="npl-coin {coin.cls}">
			<span class="npl-coin__disc" aria-hidden="true">{coin.key}</span>
			<span class="npl-coin__value">{currency[coin.key]}</span>
			<span class="npl-coin__label">{coin.label}</span>
		</div>
	{/each}
</section>

<div class="npl-coin-actions">
	<button type="button" class="npl-coin-action npl-coin-action--deposit" onclick={onDeposit}>
		<i class="fa-solid fa-arrow-down-to-line"></i> Deposit
	</button>
	<button
		type="button"
		class="npl-coin-action npl-coin-action--withdraw"
		disabled={empty}
		onclick={onWithdraw}
	>
		<i class="fa-solid fa-arrow-up-from-line"></i> Withdraw
	</button>
	<button
		type="button"
		class="npl-coin-action npl-coin-action--spend"
		disabled={empty}
		onclick={onSpend}
	>
		<i class="fa-solid fa-coins"></i> Spend
	</button>
</div>

{#if isGM}
	<section class="npl-gm-coins" aria-label="GM: add coins to the stash">
		<button type="button" class="npl-gm-coins__toggle" onclick={() => (gmOpen = !gmOpen)}>
			<i class="fa-solid {gmOpen ? 'fa-caret-down' : 'fa-caret-right'}"></i>
			<i class="fa-solid fa-wand-magic-sparkles"></i>
			GM: add coins (no source)
		</button>
		{#if gmOpen}
			<div class="npl-gm-coins__row">
				<label class="npl-gm-coins__field">
					<span>gp</span>
					<input type="number" bind:value={addGp} />
				</label>
				<label class="npl-gm-coins__field">
					<span>sp</span>
					<input type="number" bind:value={addSp} />
				</label>
				<label class="npl-gm-coins__field">
					<span>cp</span>
					<input type="number" bind:value={addCp} />
				</label>
				<button type="button" class="npl-gm-coins__add" onclick={submitGm}>Add</button>
			</div>
			<p class="npl-gm-coins__hint">Negative values remove from the stash.</p>
		{/if}
	</section>
{/if}

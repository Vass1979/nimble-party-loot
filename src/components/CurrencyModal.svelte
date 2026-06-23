<script lang="ts">
	import type { CoinPurse } from '../types.js';

	let {
		title,
		maxes,
		requireReason = false,
		confirmLabel = 'Confirm',
		onConfirm,
		onCancel,
	}: {
		title: string;
		maxes: CoinPurse;
		requireReason?: boolean;
		confirmLabel?: string;
		onConfirm: (result: { cp: number; sp: number; gp: number; reason: string }) => void;
		onCancel: () => void;
	} = $props();

	const rows: { key: keyof CoinPurse; label: string }[] = [
		{ key: 'gp', label: 'Gold (gp)' },
		{ key: 'sp', label: 'Silver (sp)' },
		{ key: 'cp', label: 'Copper (cp)' },
	];

	let amounts = $state<CoinPurse>({ cp: 0, sp: 0, gp: 0 });
	let reason = $state('');

	function clamp(key: keyof CoinPurse) {
		const max = maxes[key];
		amounts[key] = Math.max(0, Math.min(max, Math.floor(Number(amounts[key]) || 0)));
	}

	let total = $derived(amounts.cp + amounts.sp + amounts.gp);
	let canConfirm = $derived(total > 0 && (!requireReason || reason.trim().length > 0));

	function confirm() {
		for (const r of rows) clamp(r.key);
		if (!canConfirm) return;
		onConfirm({ ...amounts, reason: reason.trim() });
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Escape') onCancel();
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="npl-modal" role="presentation" onclick={onCancel}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="npl-modal__panel" role="dialog" aria-label={title} tabindex="-1" onclick={(e) => e.stopPropagation()}>
		<h3 class="npl-modal__title">{title}</h3>

		<div class="npl-coinfields">
			{#each rows as row (row.key)}
				<label class="npl-coinfields__row">
					<span class="npl-coinfields__label">{row.label}</span>
					<input
						class="npl-coinfields__input"
						type="number"
						min="0"
						max={maxes[row.key]}
						bind:value={amounts[row.key]}
						oninput={() => clamp(row.key)}
					/>
					<button
						type="button"
						class="npl-coinfields__max"
						title="Use the maximum"
						onclick={() => { amounts[row.key] = maxes[row.key]; }}
					>
						/ {maxes[row.key]}
					</button>
				</label>
			{/each}
		</div>

		{#if requireReason}
			<label class="npl-modal__label" for="npl-spend-reason">What are you spending it on?</label>
			<input
				id="npl-spend-reason"
				class="npl-modal__input npl-modal__input--text"
				type="text"
				placeholder="e.g. a night at the inn, healing potions…"
				bind:value={reason}
			/>
		{/if}

		<div class="npl-modal__actions">
			<button type="button" class="npl-modal__btn npl-modal__btn--cancel" onclick={onCancel}>Cancel</button>
			<button
				type="button"
				class="npl-modal__btn npl-modal__btn--confirm"
				disabled={!canConfirm}
				onclick={confirm}
			>
				{confirmLabel}
			</button>
		</div>
	</div>
</div>

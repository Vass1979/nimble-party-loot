<script lang="ts">
	let {
		title,
		label,
		max,
		initial,
		onConfirm,
		onCancel,
	}: {
		title: string;
		label: string;
		max: number;
		initial: number;
		onConfirm: (n: number) => void;
		onCancel: () => void;
	} = $props();

	let value = $state(initial);

	function clamp() {
		value = Math.max(1, Math.min(max, Math.floor(Number(value) || 1)));
	}

	function confirm() {
		clamp();
		onConfirm(value);
	}

	function onKey(event: KeyboardEvent) {
		if (event.key === 'Enter') confirm();
		if (event.key === 'Escape') onCancel();
	}
</script>

<div class="npl-modal" role="presentation" onclick={onCancel}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="npl-modal__panel" role="dialog" aria-label={title} tabindex="-1" onclick={(e) => e.stopPropagation()}>
		<h3 class="npl-modal__title">{title}</h3>
		<label class="npl-modal__label" for="npl-amount">{label}</label>
		<div class="npl-modal__row">
			<button type="button" class="npl-modal__step" aria-label="Decrease" onclick={() => { value = Math.max(1, value - 1); }}>
				<i class="fa-solid fa-minus"></i>
			</button>
			<input
				id="npl-amount"
				class="npl-modal__input"
				type="number"
				min="1"
				{max}
				bind:value
				oninput={clamp}
				onkeydown={onKey}
			/>
			<button type="button" class="npl-modal__step" aria-label="Increase" onclick={() => { value = Math.min(max, value + 1); }}>
				<i class="fa-solid fa-plus"></i>
			</button>
			<button type="button" class="npl-modal__max" onclick={() => { value = max; }}>Max</button>
		</div>
		<p class="npl-modal__hint">Available: {max}</p>
		<div class="npl-modal__actions">
			<button type="button" class="npl-modal__btn npl-modal__btn--cancel" onclick={onCancel}>Cancel</button>
			<button type="button" class="npl-modal__btn npl-modal__btn--confirm" onclick={confirm}>Confirm</button>
		</div>
	</div>
</div>

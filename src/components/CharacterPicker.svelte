<script lang="ts">
	let {
		title,
		characters,
		onConfirm,
		onCancel,
	}: {
		title: string;
		characters: { id: string; name: string; img: string }[];
		onConfirm: (id: string) => void;
		onCancel: () => void;
	} = $props();
</script>

<div class="npl-modal" role="presentation" onclick={onCancel}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="npl-modal__panel" role="dialog" aria-label={title} tabindex="-1" onclick={(e) => e.stopPropagation()}>
		<h3 class="npl-modal__title">{title}</h3>
		<ul class="npl-picker__list">
			{#each characters as character (character.id)}
				<li>
					<button type="button" class="npl-picker__item" onclick={() => onConfirm(character.id)}>
						<img class="npl-picker__img" src={character.img} alt="" />
						<span class="npl-picker__name">{character.name}</span>
					</button>
				</li>
			{/each}
		</ul>
		<div class="npl-modal__actions">
			<button type="button" class="npl-modal__btn npl-modal__btn--cancel" onclick={onCancel}>Cancel</button>
		</div>
	</div>
</div>

import * as svelte from 'svelte';

/**
 * Augments an ApplicationV2 subclass with Svelte 5 rendering, following the same
 * approach the Nimble system uses internally (we cannot import the system's copy
 * from an external module, so this is a self-contained equivalent):
 *  - `_renderHTML` just forwards the render context;
 *  - `_replaceHTML` mounts the root component on first render;
 *  - `_onClose` unmounts to avoid leaks.
 */
export function SvelteApplicationMixin<T extends abstract new (...args: any[]) => any>(Base: T) {
	abstract class SvelteApplication extends Base {
		protected abstract root: svelte.Component<any>;

		protected $state: Record<string, unknown> = $state({});

		#mount: Record<string, any> | null = null;

		protected async _renderHTML(context: any): Promise<any> {
			return context;
		}

		protected _replaceHTML(result: any, content: HTMLElement, options: any): void {
			Object.assign(this.$state, result?.state ?? {});

			if (options?.isFirstRender || content.childElementCount === 0) {
				if (this.#mount) {
					try {
						svelte.unmount(this.#mount);
					} catch {
						/* already destroyed */
					}
				}
				this.#mount = svelte.mount(this.root, {
					target: content,
					props: { ...(result ?? {}), foundryApp: this, state: this.$state },
				});
			}
		}

		protected _onClose(options: any): void {
			super._onClose(options);
			if (this.#mount) {
				svelte.unmount(this.#mount, { outro: true });
				this.#mount = null;
			}
		}
	}

	return SvelteApplication;
}

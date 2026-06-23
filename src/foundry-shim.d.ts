/**
 * Lightweight ambient declarations for the Foundry VTT globals this module
 * touches. They are deliberately loose (`any`) so the project compiles in
 * isolation. If you install `fvtt-types` in your own environment and add it to
 * `tsconfig` `types`, you can delete this file for full type-checking.
 */

declare const game: any;
declare const ui: any;
declare const CONFIG: any;
declare const Hooks: any;
declare const foundry: any;
declare const fromUuid: (uuid: string) => Promise<any>;
declare const Item: any;
declare const Actor: any;

interface Window {
	game: any;
	ui: any;
	CONFIG: any;
}

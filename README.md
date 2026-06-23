# Nimble Party Loot

A shared party-loot stash for the [Nimble 2](https://github.com/Nimble-Co/FoundryVTT-Nimble) system on Foundry VTT v13. Players drag items and coins out of their own character and into a common pool; anyone can take them back out. Every transfer is reconciled against the real inventories and purses involved.

Built with Svelte 5 + Vite + TypeScript to mirror the Nimble system's own stack, and styled with the system's `--nimble-*` design tokens so it reads as native.

## What it does

- **Shared window for everyone.** A togglable button in the Token controls (and `Shift+L`) opens one shared window visible to all players.
- **Items.** Drag any Nimble *object* (weapon, armour, shield, consumable, misc) from a character sheet onto the window. You're asked how many to deposit; that quantity leaves the character and joins the pool. Items are grouped by type exactly like the inventory tab.
- **Coins.** Gold, silver and copper are shown as a read-only bar with three actions — **Deposit**, **Withdraw**, and **Spend** — each opening one dialog where you enter all three denominations at once, every field capped at the relevant maximum:
  - **Deposit** moves coins from one of your characters into the pool (capped at that character's holdings).
  - **Withdraw** moves coins from the pool into one of your characters (capped at the pool).
  - **Spend** removes coins from the pool entirely (paid to a merchant, a bribe, etc.) and asks what they're being spent on. No need to withdraw to a sheet first.
- **Spending ledger.** Every Spend is recorded in a shared, persisted ledger — "Hamlin (Bill) spent 10 gp on rope" — collapsible at the bottom of the window and visible to everyone. The GM can clear it.
- **Taking things out.** Drag a loot row onto a character sheet to take the whole stack, or use the row's **Take** button (with the character sheet closed) to choose a quantity and — if you own more than one character — which one receives it.
- **Identified state respected.** Unidentified items show their unidentified name to players; the GM sees the real name and an indicator.
- **Stackables merge.** Identical stackable objects collapse into one quantity in the pool.

## Trust model

The pool lives in a single **world-scoped setting**, which only a GM may write. Player actions are relayed over the module socket to the **active GM**, who validates ownership and caps and performs the write; Foundry then syncs the change to every client. This means:

- A player can only deposit items/coins from a character they own, and only as much as that character has.
- A player can only take loot into a character they own.
- **A GM must be online** for transfers to commit. (If you'd rather players transact without a GM present, that requires the alternative "shared actor with OWNER permission" backend — see the design notes in the source.)

GMs execute their own actions directly and can deposit from any sheet (including NPCs/monsters).

### GM extras

- **Add items from any source.** As GM, drag an item from the **Items sidebar** or a **compendium pack** onto the window. Since there's no owning character, nothing is removed — a copy is added to the pool, and you're asked how many. (Players can still only deposit from a character they own.)
- **Mint coins with no source.** The currency bar has a GM-only "add coins (no source)" panel: enter gp/sp/cp and click **Add** to drop a hoard straight into the stash. Negative values subtract, so it doubles as a correction tool.

## Install (pre-built)

Copy the contents of `dist/` into a folder named `nimble-party-loot` in your Foundry `Data/modules/` directory, then enable the module in your Nimble world. The folder must contain `module.json`, `module.js`, `styles/`, and `lang/`.

## Build from source

```bash
npm install
npm run build      # outputs an installable module to dist/
npm run watch      # rebuild on change
```

Point a dev symlink at `dist/` (or set Foundry's module path there) for live iteration.

If you use `fvtt-types` in your environment, add it to `tsconfig.json` `types` and delete `src/foundry-shim.d.ts` for full type-checking; the shim only exists so the project compiles in isolation.

## Layout

```
src/
  module.ts                       entry: hooks, scene control, drop interception, API
  constants.ts  types.ts          ids, data shapes, socket protocol
  settings.ts                     world-setting registration + read/write
  state/lootStore.svelte.ts       reactive ($state) singleton the UI reads
  socket/socket.ts                GM-relay: request/response over the module socket
  socket/transactions.ts          GM-side validated deposit/withdraw logic
  lib/                            actor/ownership helpers, entry helpers, the Svelte<->AppV2 mixin, UI actions
  apps/PartyLootApp.svelte.ts     the ApplicationV2 window
  components/                     Svelte 5 UI (root, currency bar, multi-currency modal, list, row, ledger, modals)
styles/party-loot.scss            styling via --nimble-* tokens
```

## Releasing

Releases are automated by `.github/workflows/release.yml`. To cut a version:

1. Bump `version` in `module.json` and `package.json`, commit, push.
2. Tag and create a GitHub Release for that tag (e.g. `v1.2.0`).
3. The workflow builds, stamps the version + URLs into `module.json`, and attaches `module.zip` and `module.json` to the release.

`manifest` points at `releases/latest/download/module.json` so Foundry's auto-updater always finds the newest version. To list the module in Foundry's package browser, submit the repo at <https://foundryvtt.com/creators/submit/>, then add each version on your package admin page (or automate it with the Package Release API).

## API / macros

```js
game.modules.get('nimble-party-loot').api.open();    // open the window
game.modules.get('nimble-party-loot').api.toggle();
```

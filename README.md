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

import { SYSTEM_ID } from '../constants.js';

/** Is the running build operating inside the Nimble system? */
export function isNimble(): boolean {
	return game.system?.id === SYSTEM_ID;
}

/** The single GM responsible for executing relayed writes (lowest-id active GM). */
export function activeGM(): any | null {
	return game.users?.activeGM ?? null;
}

/** Is an active GM connected (required for player-initiated transfers to commit)? */
export function hasActiveGM(): boolean {
	return !!activeGM();
}

/** All `character`-type actors the given user owns. */
export function ownedCharacters(user = game.user): any[] {
	return (game.actors?.contents ?? []).filter(
		(actor: any) => actor.type === 'character' && actor.testUserPermission(user, 'OWNER'),
	);
}

/**
 * Resolve the actor a user should act through by default:
 *  - the user's assigned character, if any;
 *  - otherwise their only owned character;
 *  - otherwise null (caller should prompt with a picker).
 */
export function defaultCharacter(user = game.user): any | null {
	if (user.character) return user.character;
	const owned = ownedCharacters(user);
	return owned.length === 1 ? owned[0] : null;
}

/** Does the user own this actor (OWNER permission)? GMs always do. */
export function ownsActor(actor: any, user = game.user): boolean {
	if (!actor) return false;
	return actor.testUserPermission(user, 'OWNER');
}

/** Read a denomination's value from a character actor's purse. */
export function getCoin(actor: any, denomination: 'cp' | 'sp' | 'gp'): number {
	return Number(actor?.system?.currency?.[denomination]?.value ?? 0) || 0;
}

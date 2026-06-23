import { SOCKET_NAME } from '../constants.js';
import { activeGM, hasActiveGM } from '../lib/actors.js';
import type {
	AdjustCurrencyPayload,
	DepositItemPayload,
	DepositItemSourcePayload,
	LootAction,
	LootRequest,
	LootResponse,
	MultiCurrencyPayload,
	SpendPayload,
	WithdrawItemPayload,
} from '../types.js';
import {
	execAdjustCurrency,
	execClearLog,
	execDepositCurrency,
	execDepositItem,
	execDepositItemSource,
	execSpendCurrency,
	execWithdrawCurrency,
	execWithdrawItem,
	type TxResult,
} from './transactions.js';

const pending = new Map<string, { resolve: (r: TxResult) => void; timer: number }>();
const REQUEST_TIMEOUT_MS = 15000;

/** Register the socket listener once, on init. */
export function registerSocket(): void {
	game.socket.on(SOCKET_NAME, onSocketMessage);
}

function onSocketMessage(message: LootRequest | LootResponse): void {
	if (!message || typeof message !== 'object') return;

	if (message.type === 'request') {
		// Only the single active GM should action a request (avoids double-processing
		// when multiple GMs are connected).
		if (!game.user.isGM) return;
		if (activeGM()?.id !== game.user.id) return;
		void handleRequestAsGM(message);
		return;
	}

	if (message.type === 'response') {
		if (message.toUserId !== game.user.id) return;
		const entry = pending.get(message.requestId);
		if (!entry) return;
		window.clearTimeout(entry.timer);
		pending.delete(message.requestId);
		entry.resolve({ ok: message.ok, error: message.error });
	}
}

async function handleRequestAsGM(request: LootRequest): Promise<void> {
	const result = await dispatch(request.action, request.userId, request.payload);
	const response: LootResponse = {
		type: 'response',
		requestId: request.requestId,
		toUserId: request.userId,
		ok: result.ok,
		error: result.error,
	};
	game.socket.emit(SOCKET_NAME, response);
}

function dispatch(action: LootAction, userId: string, payload: any): Promise<TxResult> {
	switch (action) {
		case 'depositItem':
			return execDepositItem(userId, payload as DepositItemPayload);
		case 'depositItemSource':
			return execDepositItemSource(userId, payload as DepositItemSourcePayload);
		case 'withdrawItem':
			return execWithdrawItem(userId, payload as WithdrawItemPayload);
		case 'depositCurrency':
			return execDepositCurrency(userId, payload as MultiCurrencyPayload);
		case 'withdrawCurrency':
			return execWithdrawCurrency(userId, payload as MultiCurrencyPayload);
		case 'spendCurrency':
			return execSpendCurrency(userId, payload as SpendPayload);
		case 'adjustCurrency':
			return execAdjustCurrency(userId, payload as AdjustCurrencyPayload);
		case 'clearLog':
			return execClearLog(userId);
		default:
			return Promise.resolve({ ok: false, error: 'Unknown action.' });
	}
}

/**
 * Run a transaction. GMs execute locally; players relay to the active GM and
 * await the reply. Returns a structured result (never throws for game-logic
 * failures — only the transport can reject).
 */
export async function requestTransaction(
	action: LootAction,
	payload:
		| DepositItemPayload
		| WithdrawItemPayload
		| MultiCurrencyPayload
		| SpendPayload
		| DepositItemSourcePayload
		| AdjustCurrencyPayload
		| Record<string, never>,
): Promise<TxResult> {
	if (game.user.isGM) {
		return dispatch(action, game.user.id, payload);
	}

	if (!hasActiveGM()) {
		return { ok: false, error: 'A GM must be online to move party loot.' };
	}

	const requestId = foundry.utils.randomID();
	const request: LootRequest = {
		type: 'request',
		requestId,
		userId: game.user.id,
		action,
		payload,
	};

	return new Promise<TxResult>((resolve) => {
		const timer = window.setTimeout(() => {
			pending.delete(requestId);
			resolve({ ok: false, error: 'The request timed out. Is a GM still online?' });
		}, REQUEST_TIMEOUT_MS);
		pending.set(requestId, { resolve, timer });
		game.socket.emit(SOCKET_NAME, request);
	});
}

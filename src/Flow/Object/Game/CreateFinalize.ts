import type { Game } from './CreateRecord.js';
import { CreateGame, UpdateGame } from './CreateRecord.js';
import type { GameCreateFlowState } from './CreateState.js';
import { GameCreateFlowConstants } from './CreateState.js';
import { log } from '../../../Common/Log.js';
import { CreateDescription } from '../Description/Create.js';
import { CreateDescriptionVersion } from '../Description/Update.js';
import { sanitizeDescriptionText } from '../Description/BuildDefinition.js';

export interface GameCreateFinalizationResult {
    success: boolean;
    game?: Game;
    error?: string;
}

/**
 * Persist the configured game using the gathered flow state.
 * @param state GameCreateFlowState Mutable flow state. @example await FinalizeGameCreation(state)
 * @returns Promise<GameCreateFinalizationResult> Outcome describing persistence status.
 */
export async function FinalizeGameCreation(state: GameCreateFlowState): Promise<GameCreateFinalizationResult> {
    const trimmedName = state.gameName.trim();
    if (!trimmedName) {
        return { success: false, error: `Set a name before creating the game.` };
    }
    try {
        const imageUrl = state.imageUrl ?? GameCreateFlowConstants.defaultImageUrl;
        const descriptionText = sanitizeDescriptionText(state.description);

        const created = await CreateGame(trimmedName, imageUrl, state.serverId, undefined, {
            currentTurn: 1,
            description: descriptionText,
        });

        await CreateDescription(`game`, created.uid, descriptionText);
        return { success: true, game: created };
    } catch (error) {
        log.error(`Game creation failed: ${String(error)}`, GameCreateFlowConstants.logSource, `FinalizeGameCreation`);
        return { success: false, error: String(error) };
    }
}

/**
 * Persist updates made to an existing game during the interactive flow.
 * @param state GameCreateFlowState Active flow state containing pending changes. @example await FinalizeGameUpdate(state)
 * @returns Promise<GameCreateFinalizationResult> Outcome describing update status and payload.
 */
export async function FinalizeGameUpdate(state: GameCreateFlowState): Promise<GameCreateFinalizationResult> {
    if (!state.gameUid) {
        return { success: false, error: `Missing game identifier for update.` };
    }

    const trimmedName = state.gameName.trim();
    if (!trimmedName) {
        return { success: false, error: `Set a name before saving the game.` };
    }

    try {
        const imageUrl = state.imageUrl ?? GameCreateFlowConstants.defaultImageUrl;
        const descriptionText = sanitizeDescriptionText(state.description);

        const updated = await UpdateGame(state.gameUid, {
            name: trimmedName,
            image: imageUrl,
            parameters: { description: descriptionText },
        });

        const originalDescription = sanitizeDescriptionText(state.originalDescription);
        const descriptionChanged = descriptionText !== originalDescription;

        if (descriptionChanged) {
            await CreateDescriptionVersion(
                `game`,
                state.gameUid,
                state.organizationUid ?? ``,
                descriptionText,
                state.ownerDiscordId ?? `unknown`,
            );
        }

        return { success: true, game: updated };
    } catch (error) {
        log.error(`Game update failed: ${String(error)}`, GameCreateFlowConstants.logSource, `FinalizeGameUpdate`);
        return { success: false, error: String(error) };
    }
}

import type { Game } from './CreateRecord.js';
import { CreateGame, UpdateGame } from './CreateRecord.js';
import type { GameCreateFlowState } from './CreateState.js';
import { GameCreateFlowConstants } from './CreateState.js';
import { Log } from '../../../Common/Log.js';
import { sanitizeDescriptionText } from '../Description/BuildDefinition.js';
import { SaveScopedDescription } from '../Description/Scope/SaveScopedDescription.js';
import type { DescriptionScope } from '../Description/Scope/Types.js';

export interface GameCreateFinalizationResult {
    success: boolean;
    game?: Game;
    error?: string;
}

/**
 * @brief Persists the configured game using the gathered flow state
 * @param state GameCreateFlowState Mutable flow state @example await FinalizeGameCreation(state)
 * @returns GameCreateFinalizationResult Outcome describing persistence status
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
        const scope = buildDescriptionScope(state.organizationUid ?? null);
        await SaveScopedDescription({
            scope,
            objectType: `game`,
            objectUid: created.uid,
            content: descriptionText,
            createdBy: state.ownerDiscordId ?? `system`,
        });
        return { success: true, game: created };
    } catch(error) {
        Log.error(`Game creation failed: ${String(error)}`, GameCreateFlowConstants.logSource, `FinalizeGameCreation`);
        return { success: false, error: String(error) };
    }
}

/**
 * @brief Persists updates made to an existing game during the interactive flow
 * @param state GameCreateFlowState Active flow state containing pending changes @example await FinalizeGameUpdate(state)
 * @returns GameCreateFinalizationResult Outcome describing update status and payload
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
            const scope = buildDescriptionScope(state.organizationUid ?? null);
            await SaveScopedDescription({
                scope,
                objectType: `game`,
                objectUid: state.gameUid,
                content: descriptionText,
                createdBy: state.ownerDiscordId ?? `unknown`,
            });
        }

        return { success: true, game: updated };
    } catch(error) {
        Log.error(`Game update failed: ${String(error)}`, GameCreateFlowConstants.logSource, `FinalizeGameUpdate`);
        return { success: false, error: String(error) };
    }
}

/**
 * @brief Builds a description scope for game content preferring organization visibility when available
 * @param organizationUid string or null Organization identifier for scoping @example 'org_123'
 * @returns DescriptionScope Scoped descriptor for save operations
 */
function buildDescriptionScope(organizationUid: string | null): DescriptionScope {
    if (organizationUid && organizationUid.length > 0) {
        return {
            scopeType: `organization`,
            scopeUid: organizationUid,
            label: `Organization`,
        };
    }
    return {
        scopeType: `global`,
        scopeUid: null,
        label: `Global`,
    };
}

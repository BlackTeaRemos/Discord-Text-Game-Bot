import type { ButtonInteraction, ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import type { GameCreateFlowState } from '../../../Flow/Object/Game/CreateState.js';
import {
    GameCreateControlService,
    GameCreateSessionStore,
    ExpireGameCreateSession,
    RefreshGameCreateSessionTimeout,
    ResolveGameCreateFlowLabel,
    type GameCreateSession,
} from './GameCreateControls/index.js';

const sessionStore = new GameCreateSessionStore(); // shared store singleton
const controlService = new GameCreateControlService(sessionStore); // orchestrates button interactions

/**
 * Register a newly created game preview as an interactive session.
 * @param options Object containing the originating interaction, flow state, and message identifiers. @example await RegisterGameCreateSession({ interaction, state, previewMessageId, controlsMessageId })
 * @returns Promise<GameCreateSession> Newly tracked session reference. @example const session = await RegisterGameCreateSession(options)
 */
export async function RegisterGameCreateSession(options: {
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    state: GameCreateFlowState;
    previewMessageId: string;
    controlsMessageId: string;
}): Promise<GameCreateSession> {
    const { interaction, state, previewMessageId, controlsMessageId } = options;
    const existing = sessionStore.getByUser(interaction.user.id);
    if (existing) {
        await ExpireGameCreateSession(
            sessionStore,
            existing,
            `A newer ${ResolveGameCreateFlowLabel(existing.state)} session has replaced this one.`,
        );
    }

    const session: GameCreateSession = {
        baseInteraction: interaction,
        state,
        previewMessageId,
        controlsMessageId,
        userId: interaction.user.id,
        expiresAt: Date.now(),
    };

    sessionStore.setSession(session);
    RefreshGameCreateSessionTimeout(sessionStore, session, ExpireGameCreateSession);
    return session;
}

/**
 * Handle button interactions emitted from the game creation controls.
 * @param interaction ButtonInteraction Discord button interaction to process. @example const handled = await HandleGameCreateControlInteraction(interaction)
 * @returns Promise<boolean> True when the interaction has been handled; otherwise false. @example if (await HandleGameCreateControlInteraction(interaction)) return
 */
export async function HandleGameCreateControlInteraction(interaction: ButtonInteraction): Promise<boolean> {
    return await controlService.handleInteraction(interaction);
}

/**
 * Attempt to locate the active session for the provided user identifier.
 * @param userId string Discord user identifier. @example const active = GetGameCreateSessionByUser(userId)
 * @returns GameCreateSession | undefined Session if tracked; otherwise undefined. @example const session = GetGameCreateSessionByUser(userId)
 */
export function GetGameCreateSessionByUser(userId: string): GameCreateSession | undefined {
    return controlService.getSessionByUser(userId);
}

/**
 * Clear all tracked sessions. Intended for test resets.
 * @returns void Sessions cleared. @example ResetGameCreateSessions()
 */
export function ResetGameCreateSessions(): void {
    controlService.resetSessions();
}

export type { GameCreateSession } from './GameCreateControls/GameCreateSessionStore.js';

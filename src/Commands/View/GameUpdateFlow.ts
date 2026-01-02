import { MessageFlags } from 'discord.js';
import type { GameActionContext } from './Types.js';
import { GetGame } from '../../Flow/Object/Game/View.js';
import { createGameUpdateState } from '../../Flow/Object/Game/Create.js';
import { log } from '../../Common/Log.js';
import { BuildGamePreviewEmbed } from '../../SubCommand/Object/Game/Renderers/BuildGamePreviewEmbed.js';
import { BuildControlsContent } from '../../SubCommand/Object/Game/Renderers/BuildControlsContent.js';
import { BuildControlRows } from '../../SubCommand/Object/Game/Renderers/BuildControlRows.js';
import { RegisterGameCreateSession } from '../../SubCommand/Object/Game/GameCreateControls.js';

/**
 * Start the interactive game update flow using the captured context.
 * Creates preview and control messages, then registers the session for button handling.
 * @param context GameActionContext Stored interaction context containing guild, user, and organisation details.
 * @returns Promise<void> Resolves after the flow either starts or reports an error.
 * @example
 * await StartGameUpdateFlow(ctx);
 */
export async function StartGameUpdateFlow(context: GameActionContext): Promise<void> {
    const baseInteraction = context.interaction;

    if (!baseInteraction.guildId) {
        await baseInteraction.followUp({
            content: `Game updates must be started inside a server.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const game = await GetGame(context.gameUid);
    if (!game) {
        await baseInteraction.followUp({
            content: `Game no longer exists.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const state = createGameUpdateState({
        serverId: baseInteraction.guildId,
        ownerDiscordId: baseInteraction.user.id,
        game,
        description: game.description,
        organizationUid: context.orgUid,
        organizationName: context.orgName,
    });

    try {
        const previewMessage = await baseInteraction.followUp({
            content: `Preview how your game will appear after saving changes.`,
            embeds: [BuildGamePreviewEmbed(state)],
            flags: MessageFlags.Ephemeral,
        });
        state.previewMessageId = previewMessage.id;

        const controlsMessage = await baseInteraction.followUp({
            content: BuildControlsContent(state),
            components: BuildControlRows(state),
            flags: MessageFlags.Ephemeral,
        });
        state.controlsMessageId = controlsMessage.id;

        await RegisterGameCreateSession({
            interaction: baseInteraction,
            state,
            previewMessageId: state.previewMessageId,
            controlsMessageId: state.controlsMessageId,
        });
    } catch(error) {
        log.error(`Failed to start game update session: ${String(error)}`, `ViewCommand`, `StartGameUpdateFlow`);
        await baseInteraction.followUp({
            content: `Unable to start game update due to an unexpected error.`,
            flags: MessageFlags.Ephemeral,
        });
    }
}

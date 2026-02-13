import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { GetGame } from '../../Flow/Object/Game/View.js';
import { GetGameCurrentTurn } from '../../Flow/Object/Game/Turn.js';
import { FetchDescriptionForObject } from '../../Flow/Object/Description/FetchForObject.js';
import { log } from '../../Common/Log.js';
import { ResolveViewAccess } from './ResolveViewAccess.js';
import { TranslateFromContext } from '../../Services/I18nService.js';
import { ObjectViewRenderer } from '../../Framework/ObjectViewRenderer.js';
import type { ObjectViewModel } from '../../Framework/ObjectViewTypes.js';

/** Shared renderer instance for game views */
const _gameViewRenderer = new ObjectViewRenderer(`game_view`);

/**
 * View game description immediately
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when view is displayed
 */
export async function ExecuteViewGame(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const serverId = interaction.guildId;
    if (!serverId) {
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.view.game.errors.serverOnly`),
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const games = await ListGamesForServer(serverId);
        const game = games[0];
        if (!game) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.view.game.errors.noGame`),
            });
            return;
        }

        const requestedOrganizationUid = interaction.options.getString(`organization`)?.trim() || null;
        const access = await ResolveViewAccess({
            interaction,
            action: `view`,
            requestedOrganizationUid,
        });
        if (!access) {
            return;
        }

        const gameData = await GetGame(game.uid);
        if (!gameData) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.view.game.errors.loadFailed`),
            });
            return;
        }

        const currentTurn = await GetGameCurrentTurn(game.uid);
        const organizationUidsForScope = access.organizationUid
            ? [access.organizationUid]
            : [];
        const description = await FetchDescriptionForObject({
            objectUid: game.uid,
            objectType: `game`,
            userUid: interaction.user.id,
            organizationUids: organizationUidsForScope,
        });

        const currentTurnLabel = TranslateFromContext(interaction.executionContext, `commands.view.game.labels.currentTurn`);
        const organizationLabel = TranslateFromContext(interaction.executionContext, `commands.view.game.labels.organization`);
        const userLabel = TranslateFromContext(interaction.executionContext, `commands.view.common.user`);
        const noDescription = TranslateFromContext(interaction.executionContext, `commands.view.game.labels.noDescription`);

        const viewModel: ObjectViewModel = {
            id: game.uid,
            objectType: `game`,
            name: gameData.name,
            friendlyName: gameData.friendly_name !== gameData.name ? gameData.friendly_name : undefined,
            thumbnailUrl: gameData.image ?? undefined,
            pages: [{
                description: description?.slice(0, 2048) ?? noDescription,
                fields: [
                    { name: currentTurnLabel, value: String(currentTurn), inline: true },
                    { name: organizationLabel, value: access.organizationName || userLabel, inline: true },
                ],
            }],
        };

        await _gameViewRenderer.RenderInitial(interaction, viewModel);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to view game`, message, `ViewGame`);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.view.game.errors.failed`, {
                params: { message },
            }),
        });
    }
}

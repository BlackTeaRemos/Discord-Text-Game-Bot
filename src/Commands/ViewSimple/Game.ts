import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { GetGame } from '../../Flow/Object/Game/View.js';
import { GetGameCurrentTurn } from '../../Flow/Object/Game/Turn.js';
import { FetchDescriptionForObject } from '../../Flow/Object/Description/FetchForObject.js';
import { FetchObjectDetail } from '../../Flow/Object/FetchObjectDetail.js';
import { ResolveObjectActions } from '../../Flow/Object/ResolveObjectActions.js';
import { log } from '../../Common/Log.js';
import { ResolveViewAccess } from './ResolveViewAccess.js';
import { TranslateFromContext } from '../../Services/I18nService.js';
import { ObjectViewRenderer } from '../../Framework/ObjectViewRenderer.js';
import { BuildDetailPages } from '../../Framework/ObjectDetailPageBuilder.js';
import { CreateNavigationCallback } from '../../Framework/NavigateToObject.js';

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

        const detail = await FetchObjectDetail(game.uid);

        const noDescription = TranslateFromContext(interaction.executionContext, `commands.view.game.labels.noDescription`);
        const actions = ResolveObjectActions(`game`, game.uid);

        const viewModel = BuildDetailPages({
            detail: detail ?? {
                uid: game.uid,
                labels: [`Game`],
                properties: {
                    name: gameData.name,
                    friendly_name: gameData.friendly_name,
                    image: gameData.image,
                },
                parameters: gameData.parameters ?? {},
                relationships: [],
                createdAt: null,
                updatedAt: null,
            },
            objectType: `game`,
            description,
            organizationName: access.organizationName,
            actions,
            noDescriptionLabel: noDescription,
            overviewLabels: {
                type: TranslateFromContext(interaction.executionContext, `commands.view.object.labels.type`),
                organization: TranslateFromContext(interaction.executionContext, `commands.view.game.labels.organization`),
                createdAt: TranslateFromContext(interaction.executionContext, `commands.view.object.detail.createdAt`),
                updatedAt: TranslateFromContext(interaction.executionContext, `commands.view.object.detail.updatedAt`),
                owner: TranslateFromContext(interaction.executionContext, `commands.view.object.detail.owner`),
                userScope: TranslateFromContext(interaction.executionContext, `commands.view.common.user`),
                propertiesTitle: TranslateFromContext(interaction.executionContext, `commands.view.object.detail.propertiesTitle`),
                relationshipsTitle: TranslateFromContext(interaction.executionContext, `commands.view.object.detail.relationshipsTitle`),
                actionsTitle: TranslateFromContext(interaction.executionContext, `commands.view.object.detail.actionsTitle`),
            },
        });

        // Inject current turn into first page fields
        const currentTurnLabel = TranslateFromContext(interaction.executionContext, `commands.view.game.labels.currentTurn`);
        if (viewModel.pages[0]) {
            viewModel.pages[0].fields = viewModel.pages[0].fields ?? [];
            viewModel.pages[0].fields.unshift({ name: currentTurnLabel, value: String(currentTurn), inline: true });
        }

        const onNavigate = CreateNavigationCallback({
            interaction,
            executionContext: interaction.executionContext,
            organizationName: access.organizationName,
            organizationUid: access.organizationUid,
            renderer: _gameViewRenderer,
        });

        await _gameViewRenderer.RenderInitial(interaction, viewModel, true, undefined, undefined, undefined, onNavigate);
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

import { EmbedBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { GetGame } from '../../Flow/Object/Game/View.js';
import { GetGameCurrentTurn } from '../../Flow/Object/Game/Turn.js';
import { FetchDescriptionForObject } from '../../Flow/Object/Description/FetchForObject.js';
import { log } from '../../Common/Log.js';
import {
    ResolveExecutionOrganization,
    ResolveOrganization,
} from '../../Flow/Object/Organization/index.js';
import { resolve } from '../../Common/Permission/index.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

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

        const requestedOrganizationUid = interaction.options.getString(`organization`)?.trim() || null; // optional org override
        const executionOrganization = await ResolveExecutionOrganization(
            interaction.user.id,
            requestedOrganizationUid,
        ); // resolved execution scope

        if (executionOrganization.scopeType === `organization` && executionOrganization.organizationUid) {
            const organizationPermission = await ResolveOrganization({
                context: {
                    organizationUid: executionOrganization.organizationUid,
                    userId: interaction.user.id,
                    action: `view`,
                },
                skipApproval: false,
            });

            if (!organizationPermission.allowed) {
                await interaction.editReply({
                    content: TranslateFromContext(interaction.executionContext, `commands.view.common.permissionDeniedOrg`, {
                        params: { organization: executionOrganization.organizationName },
                    }),
                });
                return;
            }
        } else {
            const resolution = await resolve([`user:${interaction.user.id}:view`], {
                member: await interaction.guild?.members.fetch(interaction.user.id).then(m => {
                    return m ? { id: m.id, guildId: m.guild.id, permissions: m.permissions } as any : null;
                }),
                permissions: {
                    [`user:${interaction.user.id}:view`]: `allowed`,
                },
            });
            if (!resolution.success) {
                await interaction.editReply({
                    content: TranslateFromContext(interaction.executionContext, `commands.view.common.permissionDeniedUser`),
                });
                return;
            }
        }

        const gameData = await GetGame(game.uid);
        if (!gameData) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.view.game.errors.loadFailed`),
            });
            return;
        }

        const currentTurn = await GetGameCurrentTurn(game.uid);
        const description = await FetchDescriptionForObject(game.uid, interaction.user.id);
        const currentTurnLabel = TranslateFromContext(interaction.executionContext, `commands.view.game.labels.currentTurn`);
        const organizationLabel = TranslateFromContext(interaction.executionContext, `commands.view.game.labels.organization`);
        const userLabel = TranslateFromContext(interaction.executionContext, `commands.view.common.user`);
        const noDescription = TranslateFromContext(interaction.executionContext, `commands.view.game.labels.noDescription`);

        const embed = new EmbedBuilder()
            .setTitle(gameData.name)
            .setColor(`Blue`)
            .addFields({ name: currentTurnLabel, value: String(currentTurn), inline: true })
            .addFields({ name: organizationLabel, value: executionOrganization.organizationName || userLabel, inline: true });

        if (gameData.image) {
            embed.setThumbnail(gameData.image);
        }

        if (description) {
            embed.setDescription(description.slice(0, 2048));
        } else {
            embed.setDescription(noDescription);
        }

        await interaction.editReply({ embeds: [embed] });
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

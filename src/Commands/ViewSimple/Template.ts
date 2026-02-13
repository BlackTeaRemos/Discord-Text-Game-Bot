import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { GameObjectTemplateRepository } from '../../Repository/GameObject/GameObjectTemplateRepository.js';
import { log } from '../../Common/Log.js';
import { ResolveViewAccess } from './ResolveViewAccess.js';
import { TranslateFromContext } from '../../Services/I18nService.js';
import { ObjectViewRenderer } from '../../Framework/ObjectViewRenderer.js';
import type { ObjectViewModel, ObjectViewPage, ObjectViewField } from '../../Framework/ObjectViewTypes.js';

/** Maximum number of templates displayed per page */
const MAX_TEMPLATES_PER_PAGE = 10;

/** Shared renderer instance for template list views */
const _templateViewRenderer = new ObjectViewRenderer(`template_view`);

/**
 * List all game object templates registered in the current server's game.
 * Resolves the game context from the server, fetches templates, and
 * renders a paginated embed listing name, description, parameter count and action count.
 *
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when the template list is displayed
 * @example /view template
 */
export async function ExecuteViewTemplate(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const serverId = interaction.guildId;
    if (!serverId) {
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.view.template.errors.serverOnly`),
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const access = await ResolveViewAccess({
            interaction,
            action: `view`,
            requestedOrganizationUid: null,
        });
        if (!access) {
            return;
        }

        const games = await ListGamesForServer(serverId);
        const game = games[0];
        if (!game) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.view.template.errors.noGame`),
            });
            return;
        }

        const templateRepository = new GameObjectTemplateRepository();
        const templates = await templateRepository.ListByGame(game.uid);

        if (templates.length === 0) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.view.template.errors.noTemplates`),
            });
            return;
        }

        const parametersLabel = TranslateFromContext(interaction.executionContext, `commands.view.template.labels.parameters`);
        const actionsLabel = TranslateFromContext(interaction.executionContext, `commands.view.template.labels.actions`);
        const countLabel = TranslateFromContext(interaction.executionContext, `commands.view.template.labels.count`, {
            params: { count: String(templates.length) },
        });
        const titleLabel = TranslateFromContext(interaction.executionContext, `commands.view.template.labels.title`);

        const totalPages = Math.ceil(templates.length / MAX_TEMPLATES_PER_PAGE);
        const pages: ObjectViewPage[] = [];

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            const pageTemplates = templates.slice(
                pageIndex * MAX_TEMPLATES_PER_PAGE,
                (pageIndex + 1) * MAX_TEMPLATES_PER_PAGE,
            );

            const fields: ObjectViewField[] = pageTemplates.map(template => {
                const parameterCount = template.parameters.length;
                const actionCount = template.actions.length;
                const description = template.description
                    ? template.description.slice(0, 100)
                    : `-`;

                const fieldValue = [
                    description,
                    `${parametersLabel}: ${parameterCount} | ${actionsLabel}: ${actionCount}`,
                    `\`${template.uid}\``,
                ].join(`\n`);

                return { name: template.name, value: fieldValue, inline: false };
            });

            pages.push({
                description: countLabel,
                fields,
            });
        }

        const viewModel: ObjectViewModel = {
            id: `template_list`,
            objectType: `template`,
            name: titleLabel,
            pages,
        };

        await _templateViewRenderer.RenderInitial(interaction, viewModel);
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to list templates`, message, `ViewTemplate`);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.view.template.errors.failed`, {
                params: { message },
            }),
        });
    }
}

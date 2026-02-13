import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ListGamesForServer } from '../../Flow/Object/Game/ListGamesForServer.js';
import { GameObjectTemplateRepository } from '../../Repository/GameObject/GameObjectTemplateRepository.js';
import { GameObjectRepository } from '../../Repository/GameObject/GameObjectRepository.js';
import { log } from '../../Common/Log.js';
import { ResolveViewAccess } from './ResolveViewAccess.js';
import { TranslateFromContext } from '../../Services/I18nService.js';
import { ObjectViewRenderer } from '../../Framework/ObjectViewRenderer.js';
import type { ObjectViewModel, ObjectViewPage, ObjectViewField } from '../../Framework/ObjectViewTypes.js';

/** Maximum number of objects displayed per page */
const MAX_OBJECTS_PER_PAGE = 10;

/** Shared renderer instance for object list views */
const _objectListViewRenderer = new ObjectViewRenderer(`objlist_view`);

/**
 * List game object instances for the current server's game.
 * Supports optional filtering by template name and scopes results to the user's
 * resolved organization context. Renders a paginated embed with object name,
 * template type, organization, and key parameter values.
 *
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when the object list is displayed
 * @example /view objects
 * @example /view objects template:Factory
 */
export async function ExecuteViewObjectList(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const serverId = interaction.guildId;
    if (!serverId) {
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.view.objectList.errors.serverOnly`),
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
                content: TranslateFromContext(interaction.executionContext, `commands.view.objectList.errors.noGame`),
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

        const templateFilterName = interaction.options.getString(`template`)?.trim() || null;
        let resolvedTemplateUid: string | undefined;

        if (templateFilterName) {
            const templateRepository = new GameObjectTemplateRepository();
            const matchedTemplate = await templateRepository.FindByName(game.uid, templateFilterName);
            if (!matchedTemplate) {
                await interaction.editReply({
                    content: TranslateFromContext(interaction.executionContext, `commands.view.objectList.errors.templateNotFound`, {
                        params: { name: templateFilterName },
                    }),
                });
                return;
            }
            resolvedTemplateUid = matchedTemplate.uid;
        }

        const objectRepository = new GameObjectRepository();
        const objects = await objectRepository.ListByGame(game.uid, {
            organizationUid: access.organizationUid || undefined,
            templateUid: resolvedTemplateUid,
        });

        if (objects.length === 0) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.view.objectList.errors.noObjects`),
            });
            return;
        }

        const templateRepository = new GameObjectTemplateRepository();
        const templateNameCache = new Map<string, string>();

        const titleLabel = TranslateFromContext(interaction.executionContext, `commands.view.objectList.labels.title`);
        const templateLabel = TranslateFromContext(interaction.executionContext, `commands.view.objectList.labels.template`);
        const countLabel = TranslateFromContext(interaction.executionContext, `commands.view.objectList.labels.count`, {
            params: { count: String(objects.length) },
        });

        const totalPages = Math.ceil(objects.length / MAX_OBJECTS_PER_PAGE);
        const pages: ObjectViewPage[] = [];

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            const pageObjects = objects.slice(
                pageIndex * MAX_OBJECTS_PER_PAGE,
                (pageIndex + 1) * MAX_OBJECTS_PER_PAGE,
            );

            const fields: ObjectViewField[] = [];
            for (const gameObject of pageObjects) {
                let templateName = templateNameCache.get(gameObject.templateUid);
                if (!templateName) {
                    const objectTemplate = await templateRepository.GetByUid(gameObject.templateUid);
                    templateName = objectTemplate?.name ?? `Unknown`;
                    templateNameCache.set(gameObject.templateUid, templateName);
                }

                const keyParameterValues = gameObject.parameters
                    .slice(0, 3)
                    .map(parameterValue => {
                        return `${parameterValue.key}: ${parameterValue.value}`;
                    })
                    .join(` | `);

                const fieldValue = [
                    `${templateLabel}: ${templateName}`,
                    keyParameterValues || `-`,
                    `\`${gameObject.uid}\``,
                ].join(`\n`);

                fields.push({ name: gameObject.name, value: fieldValue, inline: false });
            }

            const pageDescription = templateFilterName
                ? `${countLabel} | ${templateLabel}: ${templateFilterName}`
                : countLabel;

            pages.push({
                description: pageDescription,
                fields,
            });
        }

        const viewModel: ObjectViewModel = {
            id: `object_list`,
            objectType: `building`,
            name: titleLabel,
            pages,
        };

        await _objectListViewRenderer.RenderInitial(interaction, viewModel);
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to list objects`, message, `ViewObjectList`);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.view.objectList.errors.failed`, {
                params: { message },
            }),
        });
    }
}

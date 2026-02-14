import { MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ResolveObjectByUid } from '../../Flow/Object/ResolveByUid.js';
import { FetchDescriptionForObject } from '../../Flow/Object/Description/FetchForObject.js';
import { FetchObjectDetail } from '../../Flow/Object/FetchObjectDetail.js';
import { ResolveObjectActions } from '../../Flow/Object/ResolveObjectActions.js';
import { log } from '../../Common/Log.js';
import { ResolveViewAccess } from './ResolveViewAccess.js';
import { TranslateFromContext } from '../../Services/I18nService.js';
import { ObjectViewRenderer } from '../../Framework/ObjectViewRenderer.js';
import { BuildDetailPages } from '../../Framework/ObjectDetailPageBuilder.js';

/** Shared renderer instance for generic object views */
const _objectViewRenderer = new ObjectViewRenderer(`object_view`);

/**
 * View description for any object by id
 * @param interaction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Discord interaction
 * @returns Promise<void> Resolves when view is displayed
 */
export async function ExecuteViewObject(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const objectId = interaction.options.getString(`id`, true);
    if (!objectId.trim()) {
        await interaction.reply({
            content: TranslateFromContext(interaction.executionContext, `commands.view.object.errors.emptyId`),
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    try {
        const objectInfo = await ResolveObjectByUid(objectId.trim());
        if (!objectInfo) {
            await interaction.editReply({
                content: TranslateFromContext(interaction.executionContext, `commands.view.object.errors.notFound`, {
                    params: { id: objectId },
                }),
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

        const organizationUidsForScope = access.organizationUid
            ? [access.organizationUid]
            : [];
        const description = await FetchDescriptionForObject({
            objectUid: objectInfo.uid,
            objectType: objectInfo.type,
            userUid: interaction.user.id,
            organizationUids: organizationUidsForScope,
        });

        const detail = await FetchObjectDetail(objectInfo.uid);

        const typeLabel = TranslateFromContext(interaction.executionContext, `objectRegistry.types.${objectInfo.type}`, {
            defaultValue: objectInfo.type,
        });
        const noDescription = TranslateFromContext(interaction.executionContext, `commands.view.object.labels.noDescription`);

        const actions = ResolveObjectActions(objectInfo.type, objectInfo.uid);

        const viewModel = BuildDetailPages({
            detail: detail ?? {
                uid: objectInfo.uid,
                labels: [],
                properties: { name: objectInfo.name },
                parameters: {},
                relationships: [],
                createdAt: null,
                updatedAt: null,
            },
            objectType: typeLabel,
            description,
            organizationName: access.organizationName,
            actions,
            noDescriptionLabel: noDescription,
            overviewLabels: {
                type: TranslateFromContext(interaction.executionContext, `commands.view.object.labels.type`),
                organization: TranslateFromContext(interaction.executionContext, `commands.view.object.labels.organization`),
                createdAt: TranslateFromContext(interaction.executionContext, `commands.view.object.detail.createdAt`),
                updatedAt: TranslateFromContext(interaction.executionContext, `commands.view.object.detail.updatedAt`),
                owner: TranslateFromContext(interaction.executionContext, `commands.view.object.detail.owner`),
                userScope: TranslateFromContext(interaction.executionContext, `commands.view.common.user`),
                propertiesTitle: TranslateFromContext(interaction.executionContext, `commands.view.object.detail.propertiesTitle`),
                relationshipsTitle: TranslateFromContext(interaction.executionContext, `commands.view.object.detail.relationshipsTitle`),
                actionsTitle: TranslateFromContext(interaction.executionContext, `commands.view.object.detail.actionsTitle`),
            },
        });

        await _objectViewRenderer.RenderInitial(interaction, viewModel);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to view object`, message, `ViewObject`);
        await interaction.editReply({
            content: TranslateFromContext(interaction.executionContext, `commands.view.object.errors.failed`, {
                params: { message },
            }),
        });
    }
}

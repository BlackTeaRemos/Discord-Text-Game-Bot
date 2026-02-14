import type { ChatInputCommandInteraction } from 'discord.js';
import { FetchObjectDetail } from '../Flow/Object/FetchObjectDetail.js';
import { ResolveObjectActions } from '../Flow/Object/ResolveObjectActions.js';
import { FetchDescriptionForObject } from '../Flow/Object/Description/FetchForObject.js';
import { ResolveObjectByUid } from '../Flow/Object/ResolveByUid.js';
import { BuildDetailPages } from './ObjectDetailPageBuilder.js';
import { ObjectViewRenderer } from './ObjectViewRenderer.js';
import type { NavigationCallback } from './ObjectViewTypes.js';
import type { ExecutionContext } from '../Domain/Command.js';
import { TranslateFromContext } from '../Services/I18nService.js';

/**
 * Options for creating a navigation callback
 * @property interaction ChatInputCommandInteraction Original user interaction for follow-up replies
 * @property executionContext ExecutionContext Locale and context for translations
 * @property organizationName string | null Display name of current organization scope
 * @property organizationUid string | null Current organization uid for description scoping
 * @property renderer ObjectViewRenderer Renderer instance to display the navigated object
 */
export interface CreateNavigationCallbackOptions {
    interaction: ChatInputCommandInteraction;
    executionContext: ExecutionContext;
    organizationName: string | null;
    organizationUid: string | null;
    renderer: ObjectViewRenderer;
}

/**
 * Create a NavigationCallback that fetches and renders the selected object as a follow-up
 * The returned callback captures the interaction context via closure
 *
 * @param options CreateNavigationCallbackOptions Context needed for navigation
 * @returns NavigationCallback Callback to pass to ObjectViewRenderer.RenderInitial
 *
 * @example
 * const onNavigate = CreateNavigationCallback({ interaction, executionContext, ... });
 * await renderer.RenderInitial(interaction, viewModel, true, undefined, undefined, undefined, onNavigate);
 */
export function CreateNavigationCallback(options: CreateNavigationCallbackOptions): NavigationCallback {
    const { interaction, executionContext, organizationName, organizationUid, renderer } = options;

    return async (targetUid: string): Promise<void> => {
        const objectInfo = await ResolveObjectByUid(targetUid);
        if (!objectInfo) {
            return;
        }

        const detail = await FetchObjectDetail(objectInfo.uid);
        if (!detail) {
            return;
        }

        const organizationUidsForScope = organizationUid ? [organizationUid] : [];
        const description = await FetchDescriptionForObject({
            objectUid: objectInfo.uid,
            objectType: objectInfo.type,
            userUid: interaction.user.id,
            organizationUids: organizationUidsForScope,
        });

        const typeLabel = TranslateFromContext(executionContext, `objectRegistry.types.${objectInfo.type}`, {
            defaultValue: objectInfo.type,
        });
        const noDescription = TranslateFromContext(executionContext, `commands.view.object.labels.noDescription`);
        const actions = ResolveObjectActions(objectInfo.type, objectInfo.uid);

        const viewModel = BuildDetailPages({
            detail,
            objectType: typeLabel,
            description,
            organizationName,
            actions,
            noDescriptionLabel: noDescription,
            overviewLabels: {
                type: TranslateFromContext(executionContext, `commands.view.object.labels.type`),
                organization: TranslateFromContext(executionContext, `commands.view.object.labels.organization`),
                createdAt: TranslateFromContext(executionContext, `commands.view.object.detail.createdAt`),
                updatedAt: TranslateFromContext(executionContext, `commands.view.object.detail.updatedAt`),
                owner: TranslateFromContext(executionContext, `commands.view.object.detail.owner`),
                userScope: TranslateFromContext(executionContext, `commands.view.common.user`),
                propertiesTitle: TranslateFromContext(executionContext, `commands.view.object.detail.propertiesTitle`),
                relationshipsTitle: TranslateFromContext(executionContext, `commands.view.object.detail.relationshipsTitle`),
                actionsTitle: TranslateFromContext(executionContext, `commands.view.object.detail.actionsTitle`),
            },
        });

        // Recursive navigation: navigated objects also get select menus
        const recursiveNavigate = CreateNavigationCallback(options);
        await renderer.RenderInitial(
            interaction,
            viewModel,
            true,
            undefined,
            undefined,
            undefined,
            recursiveNavigate,
        );
    };
}

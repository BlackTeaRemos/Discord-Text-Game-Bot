import type { ButtonInteraction, ChatInputCommandInteraction, Message, EmbedBuilder } from 'discord.js';
import { MessageFlags } from 'discord.js';
import type { DescriptionViewerOptions, DescriptionViewerResult, DescriptionViewerState } from './Types.js';
import type { DescriptionScope } from '../../../Flow/Object/Description/Scope/Types.js';
import { GetVisibleScopes } from '../../../Flow/Object/Description/Scope/GetVisibleScopes.js';
import { CanViewScope } from '../../../Flow/Object/Description/Scope/ScopeAccessCheck.js';
import { BuildScopeSelectorComponent } from '../Editor/ScopeSelectorComponent.js';
import { CreateViewerState } from './ViewerState.js';
import { HandleViewerFlowLoop, LoadViewerDescriptionForScope } from './ViewerScopeHandler.js';
import { HandleViewerPreviewLoop } from './ViewerNavigationHandler.js';
import { BuildViewerPreview } from './ViewerPreview.js';
import { GLOBAL_ORGANIZATION_UID } from '../../../Flow/Object/Organization/Global/Constants.js';
import { ResolveExecutionOrganization } from '../../../Flow/Object/Organization/index.js';
import { TranslateFromContext } from '../../../Services/I18nService.js';

/**
 * Filter scopes by user permission to view
 * @param scopes DescriptionScope array Raw scope list
 * @param options DescriptionViewerOptions Options containing permissions
 * @returns Promise of DescriptionScope array Scopes user can view
 */
async function __FilterScopesByPermission(
    scopes: DescriptionScope[],
    options: DescriptionViewerOptions,
): Promise<DescriptionScope[]> {
    if (!options.permissions) {
        return scopes;
    }

    const filtered: DescriptionScope[] = [];
    for (const scope of scopes) {
        const canView = CanViewScope(scope.scopeType, options.permissions);
        if (canView) {
            filtered.push(scope);
        }
    }
    return filtered;
}

/**
 * Run the description viewer flow
 * Handles scope selection and paginated viewing
 * Optionally triggers edit callback when edit button is clicked
 * @param interaction ChatInputCommandInteraction or ButtonInteraction The triggering interaction
 * @param options DescriptionViewerOptions Configuration for the viewer flow
 * @returns Promise of DescriptionViewerResult Result containing completion status and final state
 *
 * @example await RunDescriptionViewerFlow(interaction, { objectType: 'vehicle', showEditButton: false, ... });
 */
export async function RunDescriptionViewerFlow(
    interaction: ChatInputCommandInteraction | ButtonInteraction,
    options: DescriptionViewerOptions,
): Promise<DescriptionViewerResult> {
    const rawScopes = await GetVisibleScopes({
        userUid: options.userUid,
        canEditGlobal: options.canEditGlobal,
    });

    const availableScopes = await __FilterScopesByPermission(rawScopes, options);

    if (availableScopes.length === 0) {
        await interaction.reply({
            content: TranslateFromContext((interaction as any).executionContext, `descriptionViewer.noScopes`),
            flags: MessageFlags.Ephemeral,
        });
        return {
            completed: false,
            finalState: CreateViewerState(options, []),
        };
    }

    const state: DescriptionViewerState = CreateViewerState(options, availableScopes);

    // If only one scope is available skip selection logic and pick it
    if (availableScopes.length === 1) {
        state.selectedScope = availableScopes[0];
        await LoadViewerDescriptionForScope(state);
        const preview = BuildViewerPreview(state, { showEditButton: options.showEditButton });
        const scopeSelector = BuildScopeSelectorComponent(availableScopes, state.selectedScope?.scopeUid ?? null);

        const reply = await __SendInitialReply(interaction, {
            embeds: [preview.embed],
            components: [scopeSelector, ...preview.components],
        });

        const finalState = await HandleViewerPreviewLoop(reply, state, options.showEditButton, options.onEditRequest);
        return { completed: true, finalState };
    }

    let preferredScope: DescriptionScope | null = null;
    if (options.organizationUid) {
        if (options.organizationUid === GLOBAL_ORGANIZATION_UID) {
            preferredScope = availableScopes.find(s => {
                return s.scopeType === `global`;
            }) ?? null;
        } else {
            preferredScope = availableScopes.find(s => {
                return s.scopeType === `organization` && s.scopeUid === options.organizationUid;
            }) ?? null;
        }
    }

    if (!preferredScope) {
        // Prefer the users default organization selected via organization select when available
        try {
            const execOrg = await ResolveExecutionOrganization(options.userUid, null);
            if (execOrg.scopeType === `organization` && execOrg.organizationUid) {
                preferredScope = availableScopes.find(s => {
                    return s.scopeType === `organization` && s.scopeUid === execOrg.organizationUid;
                }) ?? null;
            }
        } catch {
            // ignore resolution errors and fallback to user scope
        }
    }

    if (!preferredScope) {
        preferredScope = availableScopes.find(s => {
            return s.scopeType === `user` && s.scopeUid === options.userUid;
        }) ?? null;
    }

    if (preferredScope) {
        state.selectedScope = preferredScope;
        await LoadViewerDescriptionForScope(state);
        const preview = BuildViewerPreview(state, { showEditButton: options.showEditButton });
        const scopeSelector = BuildScopeSelectorComponent(availableScopes, state.selectedScope?.scopeUid ?? null);

        const reply = await __SendInitialReply(interaction, {
            embeds: [preview.embed],
            components: [scopeSelector, ...preview.components],
        });

        const finalState = await HandleViewerPreviewLoop(reply, state, options.showEditButton, options.onEditRequest);
        return { completed: true, finalState };
    }

    const scopeSelector = BuildScopeSelectorComponent(availableScopes, null);

    const reply = await __SendInitialReply(interaction, {
        content: TranslateFromContext((interaction as any).executionContext, `descriptionViewer.selectScopePrompt`),
        components: [scopeSelector],
    });

    const finalState = await HandleViewerFlowLoop(
        reply,
        state,
        options.showEditButton,
        options.onEditRequest,
    );

    return {
        completed: true,
        finalState,
    };
}

/**
 * Send the initial message for the description viewer
 * Supports interactions that are already deferred or replied
 * @param interaction ChatInputCommandInteraction or ButtonInteraction Triggering interaction
 * @param payload object Discord reply payload
 * @returns Promise of Message The created or edited message
 */
async function __SendInitialReply(
    interaction: ChatInputCommandInteraction | ButtonInteraction,
    payload: { content?: string; embeds?: EmbedBuilder[]; components: any[] },
): Promise<Message> {
    if (interaction.deferred) {
        await interaction.editReply({
            content: payload.content,
            embeds: payload.embeds,
            components: payload.components,
        });
        return await interaction.fetchReply() as Message;
    }

    if (interaction.replied) {
        const resp = await interaction.followUp({
            content: payload.content,
            embeds: payload.embeds,
            components: payload.components,
            flags: MessageFlags.Ephemeral,
            withResponse: true,
        }) as any;
        return (resp?.resource?.message ?? (await interaction.fetchReply())) as Message;
    }

    const resp = await interaction.reply({
        content: payload.content,
        embeds: payload.embeds,
        components: payload.components,
        flags: MessageFlags.Ephemeral,
        withResponse: true,
    }) as any;
    return (resp?.resource?.message ?? (await interaction.fetchReply())) as Message;
}

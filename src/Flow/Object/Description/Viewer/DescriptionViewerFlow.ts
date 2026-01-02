import type { ButtonInteraction, ChatInputCommandInteraction, Message } from 'discord.js';
import type { DescriptionViewerOptions, DescriptionViewerResult, DescriptionViewerState } from './Types.js';
import type { DescriptionScope } from '../Scope/Types.js';
import { GetVisibleScopes } from '../Scope/GetVisibleScopes.js';
import { CanViewScope } from '../Scope/ScopeAccessCheck.js';
import { BuildScopeSelectorComponent } from '../Editor/ScopeSelectorComponent.js';
import { CreateViewerState } from './ViewerState.js';
import { HandleViewerFlowLoop } from './ViewerScopeHandler.js';

/**
 * Filter scopes by user permission to view.
 * @param scopes DescriptionScope[] Raw scope list.
 * @param options DescriptionViewerOptions Options containing permissions.
 * @returns Promise<DescriptionScope[]> Scopes user can view.
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
 * Run the description viewer flow.
 * Handles scope selection and paginated viewing.
 * Optionally triggers edit callback when edit button is clicked.
 * @param interaction ChatInputCommandInteraction | ButtonInteraction The triggering interaction.
 * @param options DescriptionViewerOptions Configuration for the viewer flow.
 * @returns Promise<DescriptionViewerResult> Result containing completion status and final state.
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
        await interaction.reply({ content: `No description scopes available.`, ephemeral: true });
        return {
            completed: false,
            finalState: CreateViewerState(options, []),
        };
    }

    const state: DescriptionViewerState = CreateViewerState(options, availableScopes);
    const scopeSelector = BuildScopeSelectorComponent(availableScopes, null);

    const reply = await __SendInitialReply(interaction, {
        content: `Select a description scope to view:`,
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
 * Send the initial message for the description viewer.
 * Supports interactions that are already deferred or replied.
 * @param interaction ChatInputCommandInteraction | ButtonInteraction Triggering interaction.
 * @param payload object Discord reply payload.
 * @returns Promise<Message> The created/edited message.
 */
async function __SendInitialReply(
    interaction: ChatInputCommandInteraction | ButtonInteraction,
    payload: { content: string; components: any[] },
): Promise<Message> {
    if (interaction.deferred) {
        await interaction.editReply({
            content: payload.content,
            components: payload.components,
        });
        return await interaction.fetchReply() as unknown as Message;
    }

    if (interaction.replied) {
        return await interaction.followUp({
            content: payload.content,
            components: payload.components,
            ephemeral: true,
            fetchReply: true,
        }) as unknown as Message;
    }

    return await interaction.reply({
        content: payload.content,
        components: payload.components,
        ephemeral: true,
        fetchReply: true,
    }) as unknown as Message;
}

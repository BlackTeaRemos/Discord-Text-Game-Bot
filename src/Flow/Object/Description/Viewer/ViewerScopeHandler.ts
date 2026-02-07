import type { Message, StringSelectMenuInteraction } from 'discord.js';
import { ComponentType } from 'discord.js';
import type { DescriptionViewerState, ViewerEditCallback } from './Types.js';
import { CalculatePageCount } from '../Scope/Types.js';
import { GetScopedDescription } from '../Scope/GetScopedDescription.js';
import { BuildScopeSelectorComponent, ResolveScopeFromSelection, SCOPE_SELECTOR_CUSTOM_ID } from '../Editor/ScopeSelectorComponent.js';
import { BuildViewerPreview } from './ViewerPreview.js';
import { HandleViewerPreviewLoop } from './ViewerNavigationHandler.js';
import { TranslateFromContext } from '../../../../Services/I18nService.js';

/** Timeout for component interactions in milliseconds. */
export const VIEWER_INTERACTION_TIMEOUT_MS = 300000;

/**
 * Main interaction loop for the description viewer.
 * Waits for initial scope selection.
 * @param message Message The message with components.
 * @param state DescriptionViewerState Mutable viewer state.
 * @param showEditButton boolean Whether edit button is displayed.
 * @param onEditRequest ViewerEditCallback | undefined Callback for edit button.
 * @returns Promise<DescriptionViewerState> Final state when loop ends.
 */
export async function HandleViewerFlowLoop(
    message: Message,
    state: DescriptionViewerState,
    showEditButton: boolean,
    onEditRequest?: ViewerEditCallback,
): Promise<DescriptionViewerState> {
    try {
        const collected = await message.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: VIEWER_INTERACTION_TIMEOUT_MS,
        }) as StringSelectMenuInteraction;

        if (collected.customId === SCOPE_SELECTOR_CUSTOM_ID) {
            return await HandleViewerScopeSelection(
                collected,
                message,
                state,
                showEditButton,
                onEditRequest,
            );
        }

        return state;
    } catch {
        await __DisableViewerComponents(message);
        return state;
    }
}

/**
 * Handle scope selection from the select menu.
 * @param interaction StringSelectMenuInteraction The select interaction.
 * @param message Message The message to update.
 * @param state DescriptionViewerState Mutable viewer state.
 * @param showEditButton boolean Whether edit button is displayed.
 * @param onEditRequest ViewerEditCallback | undefined Callback for edit button.
 * @returns Promise<DescriptionViewerState> Updated state after selection.
 */
export async function HandleViewerScopeSelection(
    interaction: StringSelectMenuInteraction,
    message: Message,
    state: DescriptionViewerState,
    showEditButton: boolean,
    onEditRequest?: ViewerEditCallback,
): Promise<DescriptionViewerState> {
    const selectedValue = interaction.values[0];
    const selectedScope = ResolveScopeFromSelection(state.availableScopes, selectedValue);

    if (!selectedScope) {
        await interaction.reply({
            content: TranslateFromContext((interaction as any).executionContext, `descriptionViewer.invalidScope`),
            flags: MessageFlags.Ephemeral,
        });
        return state;
    }

    state.selectedScope = selectedScope;
    await LoadViewerDescriptionForScope(state);

    const preview = BuildViewerPreview(state, { showEditButton });
    const scopeSelector = BuildScopeSelectorComponent(state.availableScopes, selectedScope.scopeUid);

    await interaction.update({
        content: null,
        embeds: [preview.embed],
        components: [scopeSelector, ...preview.components],
    });

    return await HandleViewerPreviewLoop(message, state, showEditButton, onEditRequest);
}

/**
 * Load description content for currently selected scope.
 * @param state DescriptionViewerState State to update with loaded content.
 */
export async function LoadViewerDescriptionForScope(state: DescriptionViewerState): Promise<void> {
    if (!state.selectedScope) {
        state.currentContent = ``;
        state.currentPage = 0;
        state.totalPages = 1;
        return;
    }

    const description = await GetScopedDescription({
        objectType: state.objectReference.objectType,
        objectUid: state.objectReference.objectUid,
        scope: state.selectedScope,
    });

    state.currentContent = description?.content ?? ``;
    state.currentPage = 0;
    state.totalPages = CalculatePageCount(state.currentContent);
}

/**
 * Disable all components on timeout.
 * @param message Message The message to update.
 */
async function __DisableViewerComponents(message: Message): Promise<void> {
    try {
        await message.edit({ components: [] });
    } catch {
        // Message may have been deleted
    }
}

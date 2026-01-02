import type { Message, ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import type { DescriptionViewerState, ViewerEditCallback } from './Types.js';
import { BuildScopeSelectorComponent, SCOPE_SELECTOR_CUSTOM_ID } from '../Editor/ScopeSelectorComponent.js';
import {
    BuildViewerPreview,
    VIEWER_PAGE_PREV_BUTTON_ID,
    VIEWER_PAGE_NEXT_BUTTON_ID,
    VIEWER_EDIT_BUTTON_ID,
} from './ViewerPreview.js';
import { HandleViewerScopeSelection, VIEWER_INTERACTION_TIMEOUT_MS } from './ViewerScopeHandler.js';

/**
 * Handle button and select menu interactions for viewer preview.
 * @param message Message The message with components.
 * @param state DescriptionViewerState Mutable viewer state.
 * @param showEditButton boolean Whether edit button is displayed.
 * @param onEditRequest ViewerEditCallback | undefined Callback for edit button.
 * @returns Promise<DescriptionViewerState> Final state when loop ends.
 */
export async function HandleViewerPreviewLoop(
    message: Message,
    state: DescriptionViewerState,
    showEditButton: boolean,
    onEditRequest?: ViewerEditCallback,
): Promise<DescriptionViewerState> {
    try {
        const collected = await message.awaitMessageComponent({
            time: VIEWER_INTERACTION_TIMEOUT_MS,
        });

        if (collected.isStringSelectMenu() && collected.customId === SCOPE_SELECTOR_CUSTOM_ID) {
            return await HandleViewerScopeSelection(
                collected as StringSelectMenuInteraction,
                message,
                state,
                showEditButton,
                onEditRequest,
            );
        }

        if (collected.isButton()) {
            return await HandleViewerButtonInteraction(
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
 * Handle button interactions for navigation and edit trigger.
 * @param interaction ButtonInteraction The button interaction.
 * @param message Message The message to update.
 * @param state DescriptionViewerState Mutable viewer state.
 * @param showEditButton boolean Whether edit button is displayed.
 * @param onEditRequest ViewerEditCallback | undefined Callback for edit button.
 * @returns Promise<DescriptionViewerState> Updated state after button handling.
 */
export async function HandleViewerButtonInteraction(
    interaction: ButtonInteraction,
    message: Message,
    state: DescriptionViewerState,
    showEditButton: boolean,
    onEditRequest?: ViewerEditCallback,
): Promise<DescriptionViewerState> {
    switch (interaction.customId) {
        case VIEWER_PAGE_PREV_BUTTON_ID:
            state.currentPage = Math.max(0, state.currentPage - 1);
            await UpdateViewerPreview(interaction, state, showEditButton);
            return await HandleViewerPreviewLoop(message, state, showEditButton, onEditRequest);

        case VIEWER_PAGE_NEXT_BUTTON_ID:
            state.currentPage = Math.min(state.totalPages - 1, state.currentPage + 1);
            await UpdateViewerPreview(interaction, state, showEditButton);
            return await HandleViewerPreviewLoop(message, state, showEditButton, onEditRequest);

        case VIEWER_EDIT_BUTTON_ID:
            if (onEditRequest) {
                const updatedState = await onEditRequest(state, interaction);
                const refreshedMessage = await __RefreshViewerAfterEdit(
                    message,
                    updatedState,
                    showEditButton,
                    interaction,
                );
                return await HandleViewerPreviewLoop(refreshedMessage, updatedState, showEditButton, onEditRequest);
            }
            await interaction.deferUpdate();
            return await HandleViewerPreviewLoop(message, state, showEditButton, onEditRequest);

        default:
            await interaction.deferUpdate();
            return await HandleViewerPreviewLoop(message, state, showEditButton, onEditRequest);
    }
}

/**
 * Update the preview embed after pagination change.
 * @param interaction ButtonInteraction The triggering interaction.
 * @param state DescriptionViewerState Current viewer state.
 * @param showEditButton boolean Whether edit button is displayed.
 */
export async function UpdateViewerPreview(
    interaction: ButtonInteraction,
    state: DescriptionViewerState,
    showEditButton: boolean,
): Promise<void> {
    const preview = BuildViewerPreview(state, { showEditButton });
    const scopeSelector = BuildScopeSelectorComponent(
        state.availableScopes,
        state.selectedScope?.scopeUid ?? null,
    );

    await interaction.update({
        embeds: [preview.embed],
        components: [scopeSelector, ...preview.components],
    });
}

/**
 * Refresh viewer display after edit callback completes.
 * Returns a fresh message reference to ensure component collectors work properly.
 * @param message Message The message to update.
 * @param state DescriptionViewerState Updated viewer state.
 * @param showEditButton boolean Whether edit button is displayed.
 * @param interaction ButtonInteraction The deferred button interaction for editing.
 * @returns Promise<Message> Fresh message reference after edit.
 */
async function __RefreshViewerAfterEdit(
    message: Message,
    state: DescriptionViewerState,
    showEditButton: boolean,
    interaction: ButtonInteraction,
): Promise<Message> {
    const preview = BuildViewerPreview(state, { showEditButton });
    const scopeSelector = BuildScopeSelectorComponent(
        state.availableScopes,
        state.selectedScope?.scopeUid ?? null,
    );

    // Use interaction.editReply since the interaction was deferred with deferUpdate
    await interaction.editReply({
        embeds: [preview.embed],
        components: [scopeSelector, ...preview.components],
    });

    // Fetch fresh message reference for component collector
    return await interaction.fetchReply() as Message;
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

import { MessageFlags, type ButtonInteraction, type ChatInputCommandInteraction } from 'discord.js';
import { log } from '../../../Common/Log.js';
import { BuildGamePreviewEmbed } from './Renderers/BuildGamePreviewEmbed.js';
import { BuildControlsContent } from './Renderers/BuildControlsContent.js';
import { BuildControlRows } from './Renderers/BuildControlRows.js';
import { AwaitTextInput } from '../../Prompt/TextAsync.js';
import { AwaitImageInput } from '../../Prompt/ImageAsync.js';
import { GameCreateFlowConstants, type GameCreateFlowState } from '../../../Flow/Object/Game/CreateState.js';
import { sanitizeDescriptionText } from '../../../Flow/Object/Description/BuildDefinition.js';
import { FinalizeGameCreation, FinalizeGameUpdate } from '../../../Flow/Object/Game/CreateFinalize.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';

/**
 * Runtime data for an active game create/update session.
 * @property baseInteraction InteractionExecutionContextCarrier<ChatInputCommandInteraction> Original slash command interaction used for replies. @example session.baseInteraction.webhook.editMessage(id, options)
 * @property state GameCreateFlowState Mutable flow state reflected in the preview and controls.
 * @property previewMessageId string Discord message id that renders the preview embed.
 * @property controlsMessageId string Discord message id containing the control buttons.
 * @property userId string Discord user identifier who owns the session.
 * @property timeoutHandle NodeJS.Timeout | undefined Timer reference for session expiry.
 * @property expiresAt number Epoch timestamp in milliseconds when the session will expire without interaction.
 */
interface GameCreateSession {
    baseInteraction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    state: GameCreateFlowState;
    previewMessageId: string;
    controlsMessageId: string;
    userId: string;
    timeoutHandle?: NodeJS.Timeout;
    expiresAt: number;
}

const sessionsByControlMessage = new Map<string, GameCreateSession>();
const sessionsByUser = new Map<string, GameCreateSession>();

const NAME_CANCEL_MESSAGE = `Name unchanged. Send a new value using the button when ready.`;
const DESCRIPTION_CANCEL_MESSAGE = `Description unchanged. Press the button again when you want to update it.`;
const IMAGE_CANCEL_MESSAGE = `Image left as-is. Use the button again to try another file or URL.`;
const IMAGE_TIMEOUT_MESSAGE = `No image received. Press the button when you are ready to provide an image.`;
const GENERIC_ERROR_MESSAGE = `Something went wrong while updating the game. Please try again.`;

/**
 * Register a newly created game preview as an interactive session.
 * Ensures prior sessions owned by the same user are cancelled and schedules timeout handling.
 * @param options Object containing the originating interaction, flow state, and message identifiers.
 * @returns Promise<GameCreateSession> Newly tracked session reference.
 * @example await RegisterGameCreateSession({ interaction, state, previewMessageId, controlsMessageId });
 */
export async function RegisterGameCreateSession(options: {
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    state: GameCreateFlowState;
    previewMessageId: string;
    controlsMessageId: string;
}): Promise<GameCreateSession> {
    const { interaction, state, previewMessageId, controlsMessageId } = options;
    const existing = sessionsByUser.get(interaction.user.id);
    if (existing) {
        await expireSession(existing, `A newer ${resolveFlowLabel(existing.state)} session has replaced this one.`);
    }

    const session: GameCreateSession = {
        baseInteraction: interaction,
        state,
        previewMessageId,
        controlsMessageId,
        userId: interaction.user.id,
        expiresAt: Date.now(),
    };

    sessionsByControlMessage.set(controlsMessageId, session);
    sessionsByUser.set(interaction.user.id, session);
    refreshSessionTimeout(session);
    return session;
}

/**
 * Handle button interactions emitted from the game creation controls.
 * @param interaction ButtonInteraction Discord button interaction to process.
 * @returns Promise<boolean> True when the interaction has been handled; otherwise false.
 * @example if (await HandleGameCreateControlInteraction(interaction)) return;
 */
export async function HandleGameCreateControlInteraction(interaction: ButtonInteraction): Promise<boolean> {
    const controlMessageId = interaction.message?.id;
    if (!controlMessageId) {
        return false;
    }

    const session = sessionsByControlMessage.get(controlMessageId);
    if (!session) {
        return false;
    }

    if (session.state.controlsLocked) {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: `This game creation session is no longer active. Start the command again to make changes.`,
                flags: MessageFlags.Ephemeral,
            });
        }
        return true;
    }

    await interaction.deferUpdate();

    switch (interaction.customId) {
        case GameCreateFlowConstants.changeNameId:
            await handleChangeName(session);
            return true;
        case GameCreateFlowConstants.changeDescriptionId:
            await handleChangeDescription(session);
            return true;
        case GameCreateFlowConstants.changeImageId:
            await handleChangeImage(session);
            return true;
        case GameCreateFlowConstants.cancelCreateId:
            await expireSession(
                session,
                `${capitalize(resolveFlowLabel(session.state))} cancelled. Run the command again to start over.`,
            );
            return true;
        case GameCreateFlowConstants.confirmCreateId:
            await handleConfirmAction(session);
            return true;
        default:
            return false;
    }
}

/**
 * Attempt to locate the active session for the provided user identifier.
 * Primarily exposed for diagnostic or testing scenarios.
 * @param userId string Discord user identifier.
 * @returns GameCreateSession | undefined Session if tracked; otherwise undefined.
 * @example const active = GetGameCreateSessionByUser(userId);
 */
export function GetGameCreateSessionByUser(userId: string): GameCreateSession | undefined {
    return sessionsByUser.get(userId);
}

/**
 * Clear all tracked sessions. Intended for test resets.
 * @returns void
 * @example ResetGameCreateSessions();
 */
export function ResetGameCreateSessions(): void {
    sessionsByControlMessage.clear();
    sessionsByUser.clear();
}

async function handleChangeName(session: GameCreateSession): Promise<void> {
    clearSessionTimeout(session);
    session.state.awaitingName = true;
    await updateControls(session);

    try {
        const newName = await AwaitTextInput({
            interaction: session.baseInteraction,
            prompt: `Send the game title you want to use. Type **cancel** to keep the current name.`,
            minLength: 1,
            maxLength: 100,
            cancelWords: [`cancel`],
        });
        const trimmed = newName.trim();
        if (trimmed) {
            session.state.gameName = trimmed;
            await updatePreview(session);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : GENERIC_ERROR_MESSAGE;
        const normalized = normalizePromptErrorMessage(message, NAME_CANCEL_MESSAGE);
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingName = false;
        await updateControls(session);
        refreshSessionTimeout(session);
    }
}

/**
 * Prompt for a new game description and update the preview when provided.
 * @param session GameCreateSession Active game creation session tracking Discord state. @example await handleChangeDescription(session)
 * @returns Promise<void> Resolves after the description workflow finishes. @example await handleChangeDescription(session)
 */
async function handleChangeDescription(session: GameCreateSession): Promise<void> {
    clearSessionTimeout(session);
    session.state.awaitingDescription = true;
    await updateControls(session);

    try {
        const newDescription = await AwaitTextInput({
            interaction: session.baseInteraction,
            prompt: `Send the full game description text. Type **cancel** to keep the current description.`,
            minLength: 1,
            maxLength: 1024,
            cancelWords: [`cancel`],
            validator: value => {
                return value.trim().length > 0 ? true : `Provide at least one non-whitespace character.`;
            },
        });

        session.state.description = sanitizeDescriptionText(newDescription);
        await updatePreview(session);
    } catch (error) {
        const message = error instanceof Error ? error.message : GENERIC_ERROR_MESSAGE;
        const normalized = normalizePromptErrorMessage(message, DESCRIPTION_CANCEL_MESSAGE);
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingDescription = false;
        await updateControls(session);
        refreshSessionTimeout(session);
    }
}

/**
 * Prompt for a new image via attachment or direct URL and update the preview when successful.
 * @param session GameCreateSession Active game creation session. @example await handleChangeImage(session)
 * @returns Promise<void> Resolves after the image workflow completes. @example await handleChangeImage(session)
 */
async function handleChangeImage(session: GameCreateSession): Promise<void> {
    clearSessionTimeout(session);
    session.state.awaitingImage = true;
    session.state.uploadInProgress = true;
    await updateControls(session);

    try {
        const result = await AwaitImageInput({
            interaction: session.baseInteraction,
            prompt: `Upload the game image or paste a direct image URL. Type **cancel** to keep the current image.`,
            cancelWords: [`cancel`],
            maxFileSizeBytes: 5 * 1024 * 1024,
        });
        session.state.imageUrl = result.url;
        await updatePreview(session);
    } catch (error) {
        const message = error instanceof Error ? error.message : GENERIC_ERROR_MESSAGE;
        const normalized = normalizePromptErrorMessage(message, IMAGE_CANCEL_MESSAGE, IMAGE_TIMEOUT_MESSAGE, message);
        await session.baseInteraction.followUp({ content: normalized, flags: MessageFlags.Ephemeral });
    } finally {
        session.state.awaitingImage = false;
        session.state.uploadInProgress = false;
        await updateControls(session);
        refreshSessionTimeout(session);
    }
}

/**
 * Persist the configured game changes, providing user feedback on success or failure.
 * @param session GameCreateSession Active game session. @example await handleConfirmAction(session)
 * @returns Promise<void> Resolves once the finalization handling completes. @example await handleConfirmAction(session)
 */
async function handleConfirmAction(session: GameCreateSession): Promise<void> {
    clearSessionTimeout(session);
    session.state.finalizing = true;
    await updateControls(session);

    try {
        const result =
            session.state.mode === `update`
                ? await FinalizeGameUpdate(session.state)
                : await FinalizeGameCreation(session.state);
        if (!result.success || !result.game) {
            session.state.finalizing = false;
            await updateControls(session);
            refreshSessionTimeout(session);
            await session.baseInteraction.followUp({
                content: `${resolveFlowLabel(session.state, `title`)} did not complete.${
                    result.error ? ` Reason: ${result.error}` : ``
                }`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await expireSession(session, resolveSuccessMessage(session.state, result.game.name));
    } catch (error) {
        session.state.finalizing = false;
        await updateControls(session);
        refreshSessionTimeout(session);
        const message = error instanceof Error ? error.message : GENERIC_ERROR_MESSAGE;
        await session.baseInteraction.followUp({
            content: `Failed to finalize ${resolveFlowLabel(session.state)}: ${message}`,
            flags: MessageFlags.Ephemeral,
        });
    }
}

async function updatePreview(session: GameCreateSession): Promise<void> {
    try {
        await session.baseInteraction.webhook.editMessage(session.previewMessageId, {
            content: resolvePreviewHeading(session.state),
            embeds: [BuildGamePreviewEmbed(session.state)],
        });
    } catch (error) {
        log.error(
            `Failed to update game preview for user ${session.userId}: ${error instanceof Error ? error.message : String(error)}`,
            GameCreateFlowConstants.logSource,
        );
    }
}

async function updateControls(session: GameCreateSession): Promise<void> {
    try {
        await session.baseInteraction.webhook.editMessage(session.controlsMessageId, {
            content: BuildControlsContent(session.state),
            components: BuildControlRows(session.state),
        });
    } catch (error) {
        log.error(
            `Failed to update game controls for user ${session.userId}: ${error instanceof Error ? error.message : String(error)}`,
            GameCreateFlowConstants.logSource,
        );
    }
}

async function expireSession(session: GameCreateSession, message?: string): Promise<void> {
    if (session.state.controlsLocked) {
        return;
    }

    session.state.controlsLocked = true;
    clearSessionTimeout(session);

    await updateControls(session);

    sessionsByControlMessage.delete(session.controlsMessageId);
    sessionsByUser.delete(session.userId);

    if (message) {
        try {
            await session.baseInteraction.followUp({ content: message, flags: MessageFlags.Ephemeral });
        } catch (error) {
            log.error(
                `Failed to send expiration notice for user ${session.userId}: ${error instanceof Error ? error.message : String(error)}`,
                GameCreateFlowConstants.logSource,
            );
        }
    }
}

function refreshSessionTimeout(session: GameCreateSession): void {
    clearSessionTimeout(session);
    const timeoutMs = GameCreateFlowConstants.controlsTimeoutMs ?? 5 * 60 * 1000;
    session.expiresAt = Date.now() + timeoutMs;
    session.timeoutHandle = setTimeout(() => {
        void expireSession(
            session,
            `${capitalize(resolveFlowLabel(session.state))} timed out. Start the command again to continue.`,
        );
    }, timeoutMs);
}

function clearSessionTimeout(session: GameCreateSession): void {
    if (session.timeoutHandle) {
        clearTimeout(session.timeoutHandle);
        session.timeoutHandle = undefined;
    }
}

function normalizePromptErrorMessage(
    message: string,
    cancelMessage: string,
    timeoutMessage?: string,
    defaultMessage: string = GENERIC_ERROR_MESSAGE,
): string {
    if (
        message === `User cancelled the text prompt.` ||
        message === `User cancelled the file prompt.` ||
        message === `User cancelled the image prompt.`
    ) {
        return cancelMessage;
    }
    if (
        message === `User response timeout reached while waiting for text input.` ||
        message === `User response timeout reached while waiting for file input.` ||
        message === `User response timeout reached while waiting for image input.`
    ) {
        return timeoutMessage ?? `No response received. Please press the button again when ready.`;
    }
    return defaultMessage;
}

function resolveFlowLabel(state: GameCreateFlowState, mode: `sentence` | `title` = `sentence`): string {
    const base = state.mode === `update` ? `game update` : `game creation`;
    if (mode === `title`) {
        return state.mode === `update` ? `Game update` : `Game creation`;
    }
    return base;
}

function resolvePreviewHeading(state: GameCreateFlowState): string {
    return state.mode === `update`
        ? `Preview how your game will appear after saving changes.`
        : `Preview how your game will appear once created.`;
}

function resolveSuccessMessage(state: GameCreateFlowState, gameName: string): string {
    const action = state.mode === `update` ? `updated` : `created`;
    return `Game ${gameName} ${action} successfully.`;
}

function capitalize(value: string): string {
    if (!value) {
        return value;
    }
    return value[0].toUpperCase() + value.slice(1);
}

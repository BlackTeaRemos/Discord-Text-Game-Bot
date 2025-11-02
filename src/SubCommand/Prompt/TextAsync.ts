import { ChatInputCommandInteraction, Message, MessageFlags } from 'discord.js';
import { ValidateTextInput } from './Text.js';
import { MAIN_EVENT_BUS } from '../../Events/MainEventBus.js';
import { log } from '../../Common/Log.js';

/**
 * Configuration for awaiting user-provided text input via Discord messages.
 * @property interaction ChatInputCommandInteraction Base interaction used to communicate with the user.
 * @property prompt string Instructional text explaining what the user should send.
 * @property timeoutMs number Optional timeout before aborting (default 2 minutes).
 * @property minLength number Optional minimum character count.
 * @property maxLength number Optional maximum character count.
 * @property cancelWords string[] Optional cancellation keywords (case-insensitive).
 * @property validator (value: string) => boolean | string Optional custom validation hook.
 */
export interface AwaitTextInputOptions {
    interaction: ChatInputCommandInteraction;
    prompt: string;
    timeoutMs?: number;
    minLength?: number;
    maxLength?: number;
    cancelWords?: string[];
    validator?: (value: string) => boolean | string;
}

/** Timeout error message raised when no response is received in time. */
const TIMEOUT_ERROR_MESSAGE = `User response timeout reached while waiting for text input.`;

/** Cancellation error message raised when the user requests to cancel the prompt. */
const CANCELLATION_ERROR_MESSAGE = `User cancelled the text prompt.`;

/** Default error message used when validation fails without a custom message. */
const GENERIC_VALIDATION_MESSAGE = `Provided text does not meet the required criteria. Please try again.`;

/** Default timeout (in milliseconds) applied when options.timeoutMs is not defined. */
const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Prompt a user for textual input and wait for their response within the active channel.
 * Sends the instruction using an ephemeral reply/follow-up and listens for the author's next
 * message until the value satisfies validation rules, is cancelled, or times out.
 *
 * @param options AwaitTextInputOptions Prompt configuration and validation metadata.
 * @returns Promise<string> Resolved with the validated user input.
 * @throws Error When the channel is unavailable, the user cancels, or the timeout elapses.
 */
export async function AwaitTextInput(options: AwaitTextInputOptions): Promise<string> {
    const {
        interaction,
        prompt,
        timeoutMs = DEFAULT_TIMEOUT_MS,
        minLength,
        maxLength,
        cancelWords,
        validator,
    } = options;

    const payload = { content: prompt, flags: MessageFlags.Ephemeral } as const;
    const promptResponse = (await (interaction.replied || interaction.deferred
        ? interaction.followUp(payload)
        : interaction.reply(payload))) as Message;

    const channelId = interaction.channelId;
    if (!channelId) {
        throw new Error(`Unable to determine channel for text input.`);
    }

    const reportIssue = async (message: string): Promise<void> => {
        try {
            await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
        } catch {
            // Ignore follow-up failures; the user already saw the initial prompt.
        }
    };

    return await new Promise<string>((resolve, reject) => {
        let timeoutHandle: NodeJS.Timeout | undefined;
        let settled = false;

        const cleanup = () => {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
                timeoutHandle = undefined;
            }
            MAIN_EVENT_BUS.off(`discord:message:raw`, onMessage);
        };

        const resolveWith = async (value: string, sourceMessage: Message) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();

            try {
                await interaction.webhook.deleteMessage(promptResponse.id);
            } catch (error) {
                log.warning(
                    `Failed to delete prompt message ${promptResponse.id}: ${error instanceof Error ? error.message : String(error)}`,
                    `Prompt/TextAsync`,
                );
            }

            try {
                await sourceMessage.delete();
            } catch (error) {
                log.warning(
                    `Failed to delete user response ${sourceMessage.id}: ${error instanceof Error ? error.message : String(error)}`,
                    `Prompt/TextAsync`,
                );
            }

            resolve(value);
        };

        const rejectWith = async (error: Error) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();

            try {
                await interaction.webhook.deleteMessage(promptResponse.id);
            } catch (deleteError) {
                log.warning(
                    `Failed to delete prompt message ${promptResponse.id}: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`,
                    `Prompt/TextAsync`,
                );
            }

            reject(error);
        };

        const onMessage = async (message: Message) => {
            if (settled) {
                return;
            }
            if (!message.author || message.author.bot) {
                return;
            }
            if (message.author.id !== interaction.user.id) {
                return;
            }
            if (message.channelId !== channelId) {
                return;
            }

            const content = message.content?.trim() ?? ``;
            const validation = ValidateTextInput({
                value: content,
                minLength,
                maxLength,
                validator,
                cancelWords,
            });

            if (validation.status === `cancel`) {
                await rejectWith(new Error(CANCELLATION_ERROR_MESSAGE));
                return;
            }

            if (validation.status === `error`) {
                await reportIssue(validation.errorMessage ?? GENERIC_VALIDATION_MESSAGE);
                return;
            }

            if (validation.value) {
                await resolveWith(validation.value, message);
            }
        };

        timeoutHandle = setTimeout(
            () => {
                void rejectWith(new Error(TIMEOUT_ERROR_MESSAGE));
            },
            Math.max(0, timeoutMs),
        );

        MAIN_EVENT_BUS.on(`discord:message:raw`, onMessage);
    });
}

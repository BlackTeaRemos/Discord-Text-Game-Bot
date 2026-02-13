import { ChatInputCommandInteraction, Message, MessageFlags } from 'discord.js';
import { ValidateTextInput } from './Text.js';
import { MAIN_EVENT_BUS } from '../../Events/MainEventBus.js';
import { log } from '../../Common/Log.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { TranslateFromContext } from '../../Services/I18nService.js';

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
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>;
    prompt: string;
    timeoutMs?: number;
    minLength?: number;
    maxLength?: number;
    cancelWords?: string[];
    validator?: (value: string) => boolean | string;
}

const TIMEOUT_ERROR_KEY = `prompt.text.timeout`;
const CANCELLATION_ERROR_KEY = `prompt.text.cancelled`;
const GENERIC_VALIDATION_KEY = `prompt.text.genericValidation`;

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
export async function PromptText(options: AwaitTextInputOptions): Promise<string> {
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
        } catch {}
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
                await rejectWith(new Error(TranslateFromContext(interaction.executionContext, CANCELLATION_ERROR_KEY)));
                return;
            }

            if (validation.status === `error`) {
                await reportIssue(
                    validation.errorMessage ?? TranslateFromContext(interaction.executionContext, GENERIC_VALIDATION_KEY),
                );
                return;
            }

            if (validation.value) {
                await resolveWith(validation.value, message);
            }
        };

        timeoutHandle = setTimeout(
            () => {
                void rejectWith(new Error(TranslateFromContext(interaction.executionContext, TIMEOUT_ERROR_KEY)));
            },
            Math.max(0, timeoutMs),
        );

        MAIN_EVENT_BUS.on(`discord:message:raw`, onMessage);
    });
}

import { ChatInputCommandInteraction, Message, MessageFlags } from 'discord.js';
import { ValidateTextInput } from './Text.js';
import { MAIN_EVENT_BUS } from '../../Events/MainEventBus.js';

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

    const channel = interaction.channel;
    if (!channel || !(`isTextBased` in channel) || !channel.isTextBased()) {
        throw new Error(`Cannot prompt for text input: channel is missing or not text-based.`);
    }

    const promptResponse = (await (async () => {
        const payload = { content: prompt, flags: MessageFlags.Ephemeral } as const;
        if (interaction.replied || interaction.deferred) {
            return await interaction.followUp(payload);
        }
        return await interaction.reply(payload);
    })()) as Message;

    const channelId = interaction.channelId;
    const deadline = Date.now() + timeoutMs;

    const reportIssue = async (message: string): Promise<void> => {
        try {
            await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
        } catch {
            // Follow-up errors are ignored because the original prompt already informed the user.
        }
    };

    return await new Promise<string>((resolve, reject) => {
        let timeoutHandle: NodeJS.Timeout | undefined;

        const cleanup = async () => {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
            MAIN_EVENT_BUS.off(`discord:message:raw`, onMessage);
            try {
                await promptResponse.delete();
            } catch {
                // Prompt cleanup failures are non-critical.
            }
        };

        const rejectWith = (error: Error) => {
            void cleanup().finally(() => {
                reject(error);
            });
        };

        const resolveWith = async (value: string, sourceMessage: Message) => {
            await cleanup();
            try {
                if (sourceMessage.deletable) {
                    await sourceMessage.delete();
                }
            } catch {
                // User message cleanup best-effort only.
            }
            resolve(value);
        };

        const onMessage = async (message: Message) => {
            if (message.author?.id !== interaction.user.id) {
                return;
            }
            if (message.author.bot) {
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
                rejectWith(new Error(CANCELLATION_ERROR_MESSAGE));
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
                rejectWith(new Error(TIMEOUT_ERROR_MESSAGE));
            },
            Math.max(0, deadline - Date.now()),
        );

        MAIN_EVENT_BUS.on(`discord:message:raw`, onMessage);
    });
}

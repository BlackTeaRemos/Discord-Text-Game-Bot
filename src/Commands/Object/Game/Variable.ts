import { ChatInputCommandInteraction, MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import { CreateGameVariable } from '../../../Flow/Object/Game/Variable/CreateGameVariable.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`variable`)
    .setDescription(`Create or update JSON variables for an existing game`)
    .addStringOption(option => {
        return option
            .setName(`game_uid`)
            .setDescription(`Unique identifier of the game to update`)
            .setRequired(true)
            .setMinLength(5)
            .setMaxLength(128);
    })
    .addStringOption(option => {
        return option
            .setName(`payload_json`)
            .setDescription(`JSON object describing variables to store`)
            .setRequired(true)
            .setMaxLength(2000);
    });

export const permissionTokens = `object:game:variable`;

/**
 * Store game variables provided as a JSON object through the slash command.
 * @param interaction ChatInputCommandInteraction Discord subcommand interaction. @example await execute(interaction)
 * @returns Promise<void> Resolves once the payload is stored or an error message is sent. @example await execute(interaction)
 */
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const gameUidInput = interaction.options.getString(`game_uid`, true).trim();
    const payloadInput = interaction.options.getString(`payload_json`, true).trim();

    if (!gameUidInput) {
        await interaction.reply({ content: `Provide a valid game uid.`, flags: MessageFlags.Ephemeral });
        return;
    }

    if (!payloadInput.startsWith(`{`) || !payloadInput.endsWith(`}`)) {
        await interaction.reply({ content: `Payload must be a JSON object.`, flags: MessageFlags.Ephemeral });
        return;
    }

    let payload: Record<string, unknown>;
    try {
        const parsed = JSON.parse(payloadInput);
        if (parsed === null || Array.isArray(parsed) || typeof parsed !== `object`) {
            throw new Error(`Payload must be a JSON object.`);
        }
        payload = parsed as Record<string, unknown>;
    } catch (error) {
        await interaction.reply({
            content: `Invalid JSON payload: ${(error as Error).message}`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    try {
        await CreateGameVariable({ gameUid: gameUidInput, payload });
    } catch (error) {
        await interaction.reply({
            content: `Failed to store variables: ${String(error)}`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    await interaction.reply({
        content: `Stored variables for game ${gameUidInput}.`,
        flags: MessageFlags.Ephemeral,
    });
}

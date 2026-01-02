import { MessageFlags, SlashCommandSubcommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { log } from '../../../Common/Log.js';
import type { InteractionExecutionContextCarrier } from '../../../Common/Type/Interaction.js';
import { CreateTaggedParameter } from '../../../Flow/Object/Parameter/index.js';

export const data = new SlashCommandSubcommandBuilder()
    .setName(`create`)
    .setDescription(`Attach JSON parameters to an object using a tag`)
    .addStringOption(option => {
        return option
            .setName(`type`)
            .setDescription(`Object type`)
            .setRequired(true)
            .addChoices(
                { name: `Game`, value: `game` },
                { name: `Organization`, value: `organization` },
                { name: `User`, value: `user` },
                { name: `Factory`, value: `building` },
            );
    })
    .addStringOption(option => {
        return option
            .setName(`uid`)
            .setDescription(`Object uid (example: game_123)`)
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(128);
    })
    .addStringOption(option => {
        return option
            .setName(`tag`)
            .setDescription(`Parameter tag (example: sheet.character)`)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(64);
    })
    .addStringOption(option => {
        return option
            .setName(`payload_json`)
            .setDescription(`Raw JSON payload`)
            .setRequired(true)
            .setMaxLength(2000);
    });

/**
 * Create a tagged parameter record for a given object.
 * @param interaction ChatInputCommandInteraction Discord interaction.
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    try {
        const type = interaction.options.getString(`type`, true) as any;
        const uid = interaction.options.getString(`uid`, true);
        const tag = interaction.options.getString(`tag`, true);
        const payloadJsonRaw = interaction.options.getString(`payload_json`, true);

        let parsed: unknown;
        try {
            parsed = JSON.parse(payloadJsonRaw);
        } catch {
            await interaction.reply({
                content: `Invalid JSON payload.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const payloadJson = JSON.stringify(parsed);

        const created = await CreateTaggedParameter({
            objectType: type,
            objectUid: uid,
            tag,
            payloadJson,
            createdBy: interaction.user.id,
        });

        await interaction.reply({
            content: `Parameter saved. Tag: ${created.tag}.`,
            flags: MessageFlags.Ephemeral,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Failed to create parameter`, message, `ObjectParameterCreate`);
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: `Failed: ${message}`, flags: MessageFlags.Ephemeral });
            return;
        }
        await interaction.reply({ content: `Failed: ${message}`, flags: MessageFlags.Ephemeral });
    }
}

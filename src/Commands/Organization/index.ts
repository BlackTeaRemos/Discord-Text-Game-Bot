import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { TokenSegmentInput } from '../../Common/Permission/index.js';
import type { InteractionExecutionContextCarrier } from '../../Common/Type/Interaction.js';
import { ExecuteOrganizationCreate } from './Create.js';
import { ExecuteOrganizationView } from './View.js';
import { ExecuteOrganizationSetParent } from './SetParent.js';
import { ExecuteOrganizationSelect } from './Select.js';

export const data = new SlashCommandBuilder()
    .setName(`organization`)
    .setDescription(`Manage organizations and hierarchy`)
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`create`)
            .setDescription(`Create a new organization`)
            .addStringOption(option => {
                return option
                    .setName(`name`)
                    .setDescription(`Organization name (used in permission tokens)`)
                    .setRequired(true);
            })
            .addStringOption(option => {
                return option
                    .setName(`display_name`)
                    .setDescription(`Friendly display name for the organization`)
                    .setRequired(false);
            })
            .addStringOption(option => {
                return option
                    .setName(`parent`)
                    .setDescription(`Parent organization UID for hierarchy`)
                    .setRequired(false);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`view`)
            .setDescription(`View organization details and hierarchy`)
            .addStringOption(option => {
                return option
                    .setName(`id`)
                    .setDescription(`Organization UID to view (use 'global' for shared org)`)
                    .setRequired(true);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`set_parent`)
            .setDescription(`Change organization parent (hierarchy)`)
            .addStringOption(option => {
                return option
                    .setName(`id`)
                    .setDescription(`Organization UID to modify`)
                    .setRequired(true);
            })
            .addStringOption(option => {
                return option
                    .setName(`parent`)
                    .setDescription(`New parent organization UID (leave empty to make root)`)
                    .setRequired(false);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName(`select`)
            .setDescription(`Select default organization for commands`);
    });

export const permissionTokens: TokenSegmentInput[][] = [[`organization`]];

/**
 * Route /organization subcommands to respective handlers.
 * @param interaction Discord interaction instance.
 * @returns Promise<void> Resolves when handler completes.
 */
export async function execute(
    interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>,
): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case `create`:
            await ExecuteOrganizationCreate(interaction);
            break;
        case `view`:
            await ExecuteOrganizationView(interaction);
            break;
        case `set_parent`:
            await ExecuteOrganizationSetParent(interaction);
            break;
        case `select`:
            await ExecuteOrganizationSelect(interaction);
            break;
        default:
            await interaction.reply({
                content: `Unknown subcommand: ${subcommand}`,
                flags: MessageFlags.Ephemeral,
            });
    }
}

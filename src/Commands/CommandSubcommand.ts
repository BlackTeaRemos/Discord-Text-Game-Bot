import type { SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../Common/Type/Interaction.js';
import { ExecuteFilesAndCollectExports, DepthMode } from '../Execution/Direct/ExecuteFilesAndCollectExports.js';
import { Log } from '../Common/Log.js';

/**
 * @brief Command builder type accepted by subcommand appenders
 * @example const builder: CommandBuilder = new SlashCommandBuilder()
 */
export type CommandBuilder = SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;

/**
 * @brief Command subcommand contract defining name and execution hooks
 */
export interface CommandSubcommand {
    subcommandName: string; // slash command subcommand identifier
    groupName?: string; // optional group this subcommand belongs to
    groupDescription?: string; // optional description for the group
    BuildSubcommand: (subcommand: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder; // builder hook for subcommand options
    Execute: (interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>) => Promise<void>; // async execution handler
}

/**
 * @brief Index of command subcommands organized by grouping
 */
export interface CommandSubcommandIndex {
    grouped: Map<string, Map<string, CommandSubcommand>>; // grouped subcommands by group name
    ungrouped: Map<string, CommandSubcommand>; // ungrouped subcommands by name
    groupDescriptions: Map<string, string>; // optional descriptions for groups
}

/**
 * @brief Load command subcommand modules by scanning a folder
 * @param rootPath string Directory path to scan
 * @returns CommandSubcommand array Loaded subcommand modules
 */
export async function LoadCommandSubcommands(rootPath: string): Promise<CommandSubcommand[]> {
    try {
        const modules = await ExecuteFilesAndCollectExports(
            rootPath,
            [/index\.js$/, /index\.ts$/],
            1,
            DepthMode.ExactDepth,
        );
        return __CollectCommandSubcommands(modules);
    } catch(error) {
        const message = error instanceof Error ? error.message : String(error);
        Log.error(`Failed to load command subcommands`, message, `CommandSubcommandLoader`);
        return [];
    } finally {
        // noop
    }
}

/**
 * @brief Build a subcommand name to module lookup table
 * @param subcommands CommandSubcommand array Subcommand modules to index
 * @returns CommandSubcommandIndex Lookup structure indexed by subcommand name
 */
export function BuildCommandSubcommandIndex(
    subcommands: CommandSubcommand[],
): CommandSubcommandIndex {
    const grouped = new Map<string, Map<string, CommandSubcommand>>(); // group to subcommands map
    const ungrouped = new Map<string, CommandSubcommand>(); // ungrouped subcommands
    const groupDescriptions = new Map<string, string>(); // group descriptions

    for (const subcommand of subcommands) {
        const subcommandKey = subcommand.subcommandName.toLowerCase(); // normalized subcommand name
        const groupKey = subcommand.groupName?.toLowerCase(); // normalized group name

        if (groupKey) {
            const groupMap = grouped.get(groupKey) ?? new Map<string, CommandSubcommand>();
            if (!groupMap.has(subcommandKey)) {
                groupMap.set(subcommandKey, subcommand);
            }
            grouped.set(groupKey, groupMap);

            if (subcommand.groupDescription && !groupDescriptions.has(groupKey)) {
                groupDescriptions.set(groupKey, subcommand.groupDescription);
            }
            continue;
        }

        if (!ungrouped.has(subcommandKey)) {
            ungrouped.set(subcommandKey, subcommand);
        }
    }

    return { grouped, ungrouped, groupDescriptions };
}

/**
 * @brief Collect command subcommands from dynamically loaded modules
 * @param modules any array Module exports to scan
 * @returns CommandSubcommand array Collected subcommand modules
 */
function __CollectCommandSubcommands(modules: any[]): CommandSubcommand[] {
    const subcommands: CommandSubcommand[] = []; // resolved subcommand modules

    for (const moduleExports of modules) {
        const values = Object.values(moduleExports ?? {});
        for (const value of values) {
            if (__IsCommandSubcommand(value)) {
                subcommands.push(value);
            }
        }
    }

    return subcommands;
}

/**
 * @brief Check whether a module export matches CommandSubcommand shape
 * @param value unknown Value to validate
 * @returns boolean True when value matches the contract
 */
function __IsCommandSubcommand(value: unknown): value is CommandSubcommand {
    const candidate = value as CommandSubcommand | null;
    return !!candidate
        && typeof candidate.subcommandName === `string`
        && typeof candidate.BuildSubcommand === `function`
        && typeof candidate.Execute === `function`;
}

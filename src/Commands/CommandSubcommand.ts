import type { SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { InteractionExecutionContextCarrier } from '../Common/Type/Interaction.js';
import { ExecuteFilesAndCollectExports, DepthMode } from '../Execution/Direct/ExecuteFilesAndCollectExports.js';
import { log } from '../Common/Log.js';

/**
 * Command builder type accepted by subcommand appenders.
 * @example const builder: CommandBuilder = new SlashCommandBuilder()
 */
export type CommandBuilder = SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;

/**
 * Command subcommand contract.
 * @property subcommandName string Subcommand name used in the slash command. @example 'create'
 * @property AppendToCommand (command: SlashCommandBuilder) => SlashCommandBuilder Builder append hook. @example AppendCreateSubcommand(command)
 * @property Execute (interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>) => Promise<void> Execution hook. @example await ExecuteCreateSubcommand(interaction)
 */
export interface CommandSubcommand {
    subcommandName: string;
    groupName?: string;
    groupDescription?: string;
    BuildSubcommand: (subcommand: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder;
    Execute: (interaction: InteractionExecutionContextCarrier<ChatInputCommandInteraction>) => Promise<void>;
}

/**
 * Index of command subcommands by grouping.
 * @property grouped Map<string, Map<string, CommandSubcommand>> Grouped subcommands by group name.
 * @property ungrouped Map<string, CommandSubcommand> Ungrouped subcommands by name.
 * @property groupDescriptions Map<string, string> Optional descriptions for groups.
 */
export interface CommandSubcommandIndex {
    grouped: Map<string, Map<string, CommandSubcommand>>;
    ungrouped: Map<string, CommandSubcommand>;
    groupDescriptions: Map<string, string>;
}

/**
 * Load command subcommand modules by folder.
 * @param rootPath string Directory path to scan. @example await LoadCommandSubcommands('.../Subcommands')
 * @returns Promise<CommandSubcommand[]> Loaded subcommand modules. @example const subs = await LoadCommandSubcommands(path)
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
        log.error(`Failed to load command subcommands`, message, `CommandSubcommandLoader`);
        return [];
    } finally {
        // no-op
    }
}

/**
 * Build a subcommand name to module lookup table.
 * @param subcommands CommandSubcommand[] Subcommand modules. @example const map = BuildCommandSubcommandMap(subs)
 * @returns Map<string, CommandSubcommand> Lookup by subcommand name. @example const map = BuildCommandSubcommandMap(subs)
 */
export function BuildCommandSubcommandIndex(
    subcommands: CommandSubcommand[],
): CommandSubcommandIndex {
    const grouped = new Map<string, Map<string, CommandSubcommand>>(); // group -> subcommands
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
 * Collect command subcommands from dynamically loaded modules.
 * @param modules any[] Module exports to scan. @example const subs = __CollectCommandSubcommands(modules)
 * @returns CommandSubcommand[] Collected subcommand modules. @example const subs = __CollectCommandSubcommands(modules)
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
 * Check whether a module export matches CommandSubcommand shape.
 * @param value unknown Value to validate. @example const ok = __IsCommandSubcommand(candidate)
 * @returns boolean True when value matches the contract. @example const ok = __IsCommandSubcommand(candidate)
 */
function __IsCommandSubcommand(value: unknown): value is CommandSubcommand {
    const candidate = value as CommandSubcommand | null;
    return !!candidate
        && typeof candidate.subcommandName === `string`
        && typeof candidate.BuildSubcommand === `function`
        && typeof candidate.Execute === `function`;
}

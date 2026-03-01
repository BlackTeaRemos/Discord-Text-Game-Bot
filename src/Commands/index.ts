import { ChatInputCommandInteraction } from 'discord.js';
import { resolve, dirname } from 'path';
import { ExecuteFilesAndCollectExports, DepthMode } from '../Execution/Direct/ExecuteFilesAndCollectExports.js';
import { fileURLToPath } from 'url';
import { Log } from '../Common/Log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const commandsRoot = resolve(__dirname);

/**
 * @brief Interface representing a bot command with slash command data and an execution handler
 */
export interface BotCommand {
    /** Slash command builder instance defining this command */
    data: any;
    /**
     * @brief Execute logic for this command when a ChatInputCommandInteraction is received
     * @param interaction ChatInputCommandInteraction The interaction triggered by the command
     */
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
    /** Permission token templates for this command */
    permissionTokens?: any;
    /** Optional autocomplete handler for this command */
    autocomplete?: (interaction: any) => Promise<void>;
}

export interface BotCommandsMap {
    [key: string]: BotCommand;
}

const commands: BotCommandsMap = {};

export const commandsReady: Promise<void> = (async() => {
    let modules: any[];
    try {
        // load all commands in root without subdirectories
        const rootModules = await ExecuteFilesAndCollectExports(
            commandsRoot,
            [/\.js$/, /\.ts$/],
            0,
            DepthMode.UpToDepth,
        );
        // load only group index files one level down
        const groupModules = await ExecuteFilesAndCollectExports(
            commandsRoot,
            [/index\.js$/, /index\.ts$/],
            1,
            DepthMode.ExactDepth,
        );
        modules = [...rootModules, ...groupModules];
    } catch(err) {
        Log.error(`Error scanning command files`, `[commands/index]`);
        return;
    }
    for (const mod of modules) {
        try {
            let inst;
            if (typeof mod === `function`) {
                try {
                    inst = new (mod as any)();
                    if (inst.data && typeof inst.execute === `function`) {
                        commands[inst.data.name] = {
                            data: inst.data,
                            execute: inst.execute.bind(inst),
                            permissionTokens: inst.permissionTokens ?? (mod as any).permissionTokens,
                            autocomplete: typeof inst.autocomplete === `function` ? inst.autocomplete.bind(inst) : undefined,
                        };
                        continue;
                    }
                } catch {}
            }
        } catch(err) {
            Log.error(`Error loading module`, `[commands/index]`);
            continue;
        }
        const moduleExports = mod as any;
        // named export data and execute
        if (moduleExports.data && typeof moduleExports.execute === `function`) {
            commands[moduleExports.data.name] = {
                data: moduleExports.data,
                execute: moduleExports.execute,
                permissionTokens: moduleExports.permissionTokens,
                autocomplete: typeof moduleExports.autocomplete === `function` ? moduleExports.autocomplete : undefined,
            };
            continue;
        }
        // other named exports as classes
        for (const Ex of Object.values(moduleExports)) {
            if (typeof Ex === `function`) {
                try {
                    const inst = new (Ex as any)();
                    if (inst.data && typeof inst.execute === `function`) {
                        commands[inst.data.name] = {
                            data: inst.data,
                            execute: inst.execute.bind(inst),
                            permissionTokens: inst.permissionTokens ?? (Ex as any).permissionTokens,
                            autocomplete: typeof inst.autocomplete === `function` ? inst.autocomplete.bind(inst) : undefined,
                        };
                    }
                } catch {}
            }
        }
    }
})();

export { commands };

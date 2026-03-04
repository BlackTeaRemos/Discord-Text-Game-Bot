import type { MainEventBus } from '../Events/MainEventBus.js';
import { EVENT_NAMES } from '../Domain/index.js';
import { LoadConfig } from '../Config.js';
import type { ValidatedConfig } from '../Types/Config.js';
import type { Neo4jConfig } from '../Repository/Neo4jClient.js';
import Joi from 'joi';
import { resolve } from 'path';

/**
 * Service responsible for loading and validating application configuration
 */
export class ConfigService {
    /** Event bus for emitting config related events */
    private _eventBus: MainEventBus;

    /**
     * Constructs a ConfigService
     * @param eventBus EventEmitter Event bus used for emitting config loaded
     */
    constructor(eventBus: MainEventBus) {
        this._eventBus = eventBus;
    }

    /**
     * Loads and validates the configuration from a JSON file
     * @param path string Filesystem path to the config JSON
     * @returns ValidatedConfig The validated config object
     * @throws Error if loading or validation fails
     * @example
     * const configService = new ConfigService(eventBus);
     * const config = await configService.Load('./config/config.json');
     */
    public async Load(path: string): Promise<ValidatedConfig> {
        try {
            const rawConfig = await LoadConfig(path);
            // Build Joi schema to validate app config treating null as empty and defaulting to empty object
            const schema = Joi.object({
                discordToken: Joi.string().required(),
                discordGuildId: Joi.string().required(),
                discordCategoryId: Joi.string().required(),
                taskAdminUserIds: Joi.array().items(Joi.string()).default([]),
                logLevel: Joi.string().valid(`debug`, `info`, `warn`, `error`),
                dataRoot: Joi.string(),
                mirrorRoot: Joi.string(),
                tempRoot: Joi.string(),
                neo4j: Joi.object({
                    uri: Joi.string().required(),
                    username: Joi.string().required(),
                    password: Joi.string().required(),
                    database: Joi.string().optional(),
                }).required(),
                defaultLocale: Joi.string().default(`en`),
                supportedLocales: Joi.array().items(Joi.string()).default([`en`,`ru`]),
            })
                .unknown(true)
                .empty(null)
                .default({});
            const { value, error } = schema.validate(rawConfig);

            if (error) {
                throw new Error(`Config validation error: ${error.message}`);
            }
            // Env overrides with highest precedence
            const envDataRoot = process.env.VPI_DATA_ROOT;
            const envMirrorRoot = process.env.VPI_MIRROR_ROOT;
            const envTempRoot = process.env.VPI_TEMP_ROOT;

            const dataRoot = resolve(envDataRoot || (value.dataRoot as string) || `./data`);
            const mirrorRoot = resolve(envMirrorRoot || (value.mirrorRoot as string) || dataRoot + `/mirror`);
            const tempRoot = resolve(envTempRoot || (value.tempRoot as string) || dataRoot + `/tmp`);

            const validated: ValidatedConfig = {
                discordToken: value.discordToken as string,
                discordGuildId: value.discordGuildId as string,
                discordCategoryId: value.discordCategoryId as string,
                logLevel: value.logLevel as `debug` | `info` | `warn` | `error` | undefined,
                dataRoot,
                mirrorRoot,
                tempRoot,
                taskAdminUserIds: (value.taskAdminUserIds as string[]) ?? [],
                neo4j: value.neo4j as Neo4jConfig,
                defaultLocale: (value.defaultLocale as string) ?? `en`,
                supportedLocales: (value.supportedLocales as string[]) ?? [`en`,`ru`],
            };
            this._eventBus.Emit(EVENT_NAMES.configLoaded, validated);
            return validated;
        } catch(err: any) {
            throw new Error(`Failed to load config from '${path}': ${err.message}`);
        }
    }
}

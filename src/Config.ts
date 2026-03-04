/**
 * @brief Loads and provides access to application configuration from config files or environment variables
 */

import { ReadConfigFile } from './Common/ConfigReader.js';
import { MAIN_EVENT_BUS } from './Events/MainEventBus.js';
import { EVENT_NAMES } from './Domain/index.js';

/**
 * @brief Application configuration interface defining all required and optional settings
 * @interface AppConfig
 */
export interface AppConfig {
    discordToken: string; // Discord bot authentication token
    discordChannel: string; // Discord channel ID for storage operations
    dbPath: string; // SQLite database file path
    maxFileSize?: number; // optional maximum file size limit
    logLevel?: `debug` | `info` | `warn` | `error`; // optional logging level
    /** TODO Temporary shim for Discord user ids allowed to view and manage tasks */
    taskAdminUserIds?: string[];
    /** Optional Neo4j configuration for graph repository integration */
    neo4j?: {
        uri: string; // Neo4j connection URI
        username: string; // Neo4j username
        password: string; // Neo4j password
        database?: string; // optional database name
    };
}

/**
 * @brief Loads and parses the global configuration file with validation and event emission
 * @param configPath string Path to configuration file in JSON or YAML format
 * @returns AppConfig Promise resolving to parsed and validated configuration object
 * @example
 * const config = await LoadConfig('./config/app.json');
 * console.log('Discord token:', config.discordToken);
 */
export async function LoadConfig(configPath: string): Promise<AppConfig> {
    try {
        const parsedConfig = await ReadConfigFile(configPath); // parsed configuration data
        const envNeo4jUri = process.env.NEO4J_URI;
        const envNeo4jUser = process.env.NEO4J_USER;
        const envNeo4jPassword = process.env.NEO4J_PASSWORD;
        if (envNeo4jUri || envNeo4jUser || envNeo4jPassword) {
            (parsedConfig as any).neo4j = (parsedConfig as any).neo4j || {};
            if (envNeo4jUri) {
                (parsedConfig as any).neo4j.uri = envNeo4jUri;
            }
            if (envNeo4jUser) {
                (parsedConfig as any).neo4j.username = envNeo4jUser;
            }
            if (envNeo4jPassword) {
                (parsedConfig as any).neo4j.password = envNeo4jPassword;
            }
        }
        MAIN_EVENT_BUS.Emit(EVENT_NAMES.configLoaded, parsedConfig);
        return parsedConfig as AppConfig;
    } catch(configError) {
        MAIN_EVENT_BUS.Emit(EVENT_NAMES.configError, configError);
        throw configError;
    }
}

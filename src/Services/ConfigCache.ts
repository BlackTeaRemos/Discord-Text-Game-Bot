import { MAIN_EVENT_BUS } from '../Events/MainEventBus.js';
import { ConfigService } from './ConfigService.js';
import type { ValidatedConfig } from '../Types/Config.js';

let cachedConfig: ValidatedConfig | null = null;
let loadingPromise: Promise<ValidatedConfig> | null = null;

/**
 * @brief Fetch the validated config using a shared cache to avoid repeated disk reads
 * @param configPath string Filesystem path to the config JSON
 * @returns ValidatedConfig Resolved validated configuration object
 * @example const cfg = await GetCachedConfig();
 */
export async function GetCachedConfig(configPath: string = process.env.CONFIG_PATH || `./config/config.json`): Promise<ValidatedConfig> {
    if (cachedConfig) {
        return cachedConfig;
    }
    if (loadingPromise) {
        return loadingPromise;
    }
    const service = new ConfigService(MAIN_EVENT_BUS);
    loadingPromise = service
        .Load(configPath)
        .then(cfg => {
            cachedConfig = cfg;
            return cfg;
        })
        .finally(() => {
            loadingPromise = null;
        });
    return loadingPromise;
}

// ConfigReader  Loads and provides access to application configuration settings from config files or environment variables
import { readFile } from 'fs/promises';

/**
 * @brief Loads and parses a config file in JSON or YAML format
 * @param configPath string Path to config file
 * @returns AppConfig Parsed config object
 * @throws Error if file cannot be read or parsed
 * @example
 * import { readConfigFile } from './common/configReader';
 * const config = await readConfigFile('./config.json');
 */
export async function readConfigFile(configPath: string): Promise<any> {
    try {
        const raw = await readFile(configPath, `utf-8`);
        let config: any; // Parsed config object

        if (configPath.endsWith(`.json`)) {
            config = JSON.parse(raw);
        } else if (configPath.endsWith(`.yaml`) || configPath.endsWith(`.yml`)) {
            // Lazy load yaml parser only if needed
            const yaml = await import(`js-yaml`);
            config = yaml.load(raw);
        } else {
            throw new Error(`Unsupported config file format. Use .json or .yaml`);
        }
        return config;
    } catch(err) {
        throw err;
    }
}

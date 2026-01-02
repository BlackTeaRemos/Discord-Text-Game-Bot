import type { ParameterParser } from './Types.js';

/**
 * Default JSON parameter parser.
 * Formats payload as pretty printed JSON.
 */
export const JsonParameterParser: ParameterParser = async(options) => {
    const pretty = JSON.stringify(options.payload ?? null, null, 2);
    const safe = pretty.length > 1800 ? `${pretty.slice(0, 1800)}\n...` : pretty;

    return {
        title: `Parameters: ${options.tag}`,
        content: `\`\`\`json\n${safe}\n\`\`\``,
    };
};

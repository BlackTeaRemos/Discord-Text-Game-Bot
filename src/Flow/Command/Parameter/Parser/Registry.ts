import type { ParameterParser } from './Types.js';
import { JsonParameterParser } from './JsonParameterParser.js';

/**
 * Resolve a parser for the supplied parameter tag.
 * Developers extend this registry by adding tag cases.
 * @param tag string Parameter tag. @example 'sheet.character'
 * @returns ParameterParser Parser function.
 */
export function ResolveParameterParser(tag: string): ParameterParser {
    const normalizedTag = tag.trim().toLowerCase();

    switch (normalizedTag) {
        default:
            return JsonParameterParser;
    }
}

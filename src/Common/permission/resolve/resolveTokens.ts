import { Log } from '../../Log.js';
import { FormatPermissionToken } from '../Engine/FormatPermissionToken.js';
import { NormalizeToken } from '../Token/NormalizeToken.js';
import type { PermissionToken, TokenSegmentInput } from '../Types.js';
import type { TokenResolveContext } from './Types.js';

/**
 * Replace named placeholders in a value string using context values
 */
function SubstitutePlaceholders(value: string, context: TokenResolveContext): string {
    return value.replace(/\{([^}]+)\}/g, (_m, name) => {
        const valFromOptions =
            context.options && Object.prototype.hasOwnProperty.call(context.options, name)
                ? context.options[name]
                : undefined;
        const valFromCtx = Object.prototype.hasOwnProperty.call(context, name) ? context[name] : undefined;
        const val = valFromOptions ?? valFromCtx;
        if (val === undefined || val === null) {
            return `UNKNOWN`;
        }
        if (typeof val === `object`) {
            try {
                return String((val as any).toString?.() ?? JSON.stringify(val));
            } catch {
                return `OBJECT`;
            }
        }
        return String(val);
    });
}

/**
 * Convert a template string or array into ordered tokens from most specific to least specific
 */
export function ResolveTokens(
    template: string | TokenSegmentInput[],
    context: TokenResolveContext = {},
): PermissionToken[] {
    if (!template || (Array.isArray(template) && template.length === 0)) {
        Log.info(`Permission resolve: empty or invalid template: ${String(template)}`, `Permission.resolve`);
        return [];
    }

    const templates: (string | TokenSegmentInput[])[] = Array.isArray(template)
        ? [template]
        : String(template)
              .split(`,`)
              .map(t => {
                  return t.trim();
              })
              .filter(Boolean);

    const results: PermissionToken[] = [];
    const seen = new Set<string>();

    for (const tmpl of templates) {
        if (Array.isArray(tmpl)) {
            const resolvedSegments = tmpl.map(part => {
                return typeof part === `string` ? SubstitutePlaceholders(part, context) : part;
            });
            const normalized = NormalizeToken(resolvedSegments);
            if (!normalized.length) {
                continue;
            }
            for (let i = normalized.length; i >= 1; i--) {
                const candidate = normalized.slice(0, i) as PermissionToken;
                const key = FormatPermissionToken(candidate);
                if (seen.has(key)) {
                    continue;
                }
                seen.add(key);
                Log.info(
                    `Permission resolve: resolved token [${FormatPermissionToken(candidate)}] from array template`,
                    `Permission.resolve`,
                );
                results.push(candidate);
            }
            continue;
        }

        Log.info(`Permission resolve: expanding template: "${tmpl}"`, `Permission.resolve`);
        const resolved = SubstitutePlaceholders(tmpl, context);
        const parts = resolved
            .split(`:`)
            .map(p => {
                return p.trim();
            })
            .filter(p => {
                return p !== ``;
            });
        const normalized = NormalizeToken(parts);
        if (!normalized.length) {
            continue;
        }
        for (let i = normalized.length; i >= 1; i--) {
            const candidate = normalized.slice(0, i) as PermissionToken;
            const key = FormatPermissionToken(candidate);
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            Log.info(
                `Permission resolve: adding fallback token: "${FormatPermissionToken(candidate)}"`,
                `Permission.resolve`,
            );
            results.push(candidate);
        }
    }

    return results;
}

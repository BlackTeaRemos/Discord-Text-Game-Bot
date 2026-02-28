import i18next, { type TFunction } from 'i18next';
import Backend from 'i18next-fs-backend';
import { resolve } from 'path';
import type { ExecutionContext } from '../Domain/Command.js';
import { GetCachedConfig } from './ConfigCache.js';
import { GetUserLocale } from '../Flow/Object/User/Locale.js';
import { log } from '../Common/Log.js';

const DEFAULT_LOCALE = `en`;
const DEFAULT_NAMESPACE = `translation`;

let _initialized = false;
let _translator: TFunction | null = null;
let _defaultLocale = DEFAULT_LOCALE;
let _supportedLocales: string[] = [DEFAULT_LOCALE];
let _localeRoot = resolve(`./config/locales`);

/**
 * Options for initializing the translation service
 */
export interface I18nInitOptions {
    defaultLocale?: string;
    supportedLocales?: string[];
    localesRoot?: string;
}

/**
 * Initialize the translation service using filesystem JSON resources
 * @param options I18nInitOptions Initialization options
 * @returns void Resolves after initialization
 */
export async function InitI18n(options: I18nInitOptions = {}): Promise<void> {
    try {
        _defaultLocale = options.defaultLocale ?? DEFAULT_LOCALE;
        _supportedLocales = options.supportedLocales?.length ? options.supportedLocales : [DEFAULT_LOCALE];
        _localeRoot = options.localesRoot ?? _localeRoot;

        await i18next
            .use(Backend)
            .init({
                fallbackLng: _defaultLocale,
                supportedLngs: _supportedLocales,
                preload: _supportedLocales,
                ns: [DEFAULT_NAMESPACE],
                defaultNS: DEFAULT_NAMESPACE,
                backend: {
                    loadPath: resolve(_localeRoot, `{{lng}}`, `${DEFAULT_NAMESPACE}.json`),
                },
                interpolation: { escapeValue: false },
                returnEmptyString: false,
                returnNull: false,
            });

        _translator = i18next.t.bind(i18next);
        _initialized = true;
    } catch(error) {
        _initialized = false;
        _translator = null;
        throw error;
    } finally {
        // noop
    }
}

/**
 * Translation input options
 */
export interface TranslateOptions {
    locale?: string;
    params?: Record<string, unknown>;
    defaultValue?: string;
}

/**
 * Translate a string key using the initialized translator
 * @param key string Translation key
 * @param options TranslateOptions Optional settings
 * @returns string Localized text
 */
export function Translate(key: string, options: TranslateOptions = {}): string {
    const locale = options.locale ?? _defaultLocale;
    const params = options.params ?? {};
    const defaultValue = options.defaultValue ?? key;

    if (!_initialized || !_translator) {
        return defaultValue;
    }

    // Ensure locale is a string and protect it from being overridden by params
    const resolvedLocale = typeof locale === `string` ? locale : _defaultLocale;

    // Prevent callers accidentally overriding the language lng option by passing an lng param
    let translatorParams: any = params;
    if ((params as any).lng !== undefined) {
        log.warning(`I18n: caller provided 'lng' in params; ignoring to prevent runtime errors`, `I18nService`);
        // Shallow copy without lng
        const { lng: _lng, ...rest } = params as any;
        translatorParams = rest;
    }

    const raw = _translator(key, { lng: resolvedLocale, ...translatorParams, defaultValue }) as any;
    if (typeof raw === `string`) {
        return raw;
    }
    try {
        return JSON.stringify(raw);
    } catch {
        return String(raw);
    }
}

/**
 * Resolve a locale for a user and optional execution context cache
 * @param discordId string Discord user id
 * @param executionContext ExecutionContext Optional cache container
 * @returns string Locale id
 */
export async function ResolveUserLocale(
    discordId: string,
    executionContext?: ExecutionContext,
): Promise<string> {
    const cacheKey = `i18n:locale`;
    if (executionContext?.has(cacheKey)) {
        const cached = executionContext.cache.get(cacheKey);
        return typeof cached === `string` ? cached : _defaultLocale;
    }

    let locale = _defaultLocale;
    try {
        const cfg = await GetCachedConfig();
        _defaultLocale = cfg.defaultLocale ?? _defaultLocale;
        _supportedLocales = cfg.supportedLocales?.length ? cfg.supportedLocales : _supportedLocales;
        locale = _defaultLocale;
        const userLocale = await GetUserLocale(discordId);
        if (userLocale && _supportedLocales.includes(userLocale)) {
            locale = userLocale;
        }
    } catch {
        locale = _defaultLocale;
    }

    if (executionContext) {
        executionContext.set(cacheKey, locale);
    }

    return locale;
}

/**
 * Resolve locale from execution context cache when available
 * @param executionContext ExecutionContext Optional cache container
 * @returns string Locale id
 */
export function GetCachedLocale(executionContext?: ExecutionContext): string {
    const cacheKey = `i18n:locale`;
    if (executionContext?.has(cacheKey)) {
        const cached = executionContext.cache.get(cacheKey);
        return typeof cached === `string` ? cached : _defaultLocale;
    }
    return _defaultLocale;
}

/**
 * Translate using execution context cached locale
 * @param executionContext ExecutionContext Optional cache container
 * @param key string Translation key
 * @param options TranslateOptions Optional settings
 * @returns string Localized text
 */
export function TranslateFromContext(
    executionContext: ExecutionContext | undefined,
    key: string,
    options: TranslateOptions = {},
): string {
    const locale = options.locale ?? GetCachedLocale(executionContext);
    return Translate(key, { ...options, locale });
}

/**
 * Map application locale codes to Discord API locale enum values with unmapped codes passing through as is
 */
const DISCORD_LOCALE_MAP: Record<string, string> = {
    en: `en-US`,
    pt: `pt-BR`,
    es: `es-ES`,
    zh: `zh-CN`,
    sv: `sv-SE`,
};

/**
 * Build a localization map for all supported locales keyed by Discord compatible locale codes
 * @param key string Translation key @example 'commands.create.description'
 * @returns Record Discord locale map @example { 'en-US': 'Create game', 'ru': 'Создать игру' }
 */
export function BuildLocalizations(key: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const appLocale of _supportedLocales) {
        const discordLocale = DISCORD_LOCALE_MAP[appLocale] ?? appLocale;
        try {
            result[discordLocale] = Translate(key, { locale: appLocale });
        } catch {
            result[discordLocale] = Translate(key, { locale: _defaultLocale });
        }
    }
    return result;
}

export function GetSupportedLocales(): string[] {
    return _supportedLocales.slice();
}
